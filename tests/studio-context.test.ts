import { describe, expect, it } from "vitest";

import {
  TASK_ENVELOPE_SCHEMA,
  buildReadLists,
  classifyRisk,
  deriveVerification,
  isIgnoredPath,
  isValidRisk,
  isValidTier,
  matchGlob,
  resolveZones,
  selectRelevantFindings,
  selectSkills,
  toPosix,
} from "../scripts/studio/context-lib.mjs";
import type { LedgerFindingRow, StudioZoneConfig } from "../scripts/studio/context-lib.mjs";

const zones: StudioZoneConfig[] = [
  {
    id: "core",
    paths: ["packages/game-core/**", "packages/game-schema/**"],
    minimumRisk: "R2",
    promoteToR3On: ["authoritative state", "MonthRun"],
  },
  {
    id: "content",
    paths: ["content/**"],
    minimumRisk: "R2",
  },
  {
    id: "scenario",
    paths: ["content/**/scenarios/**"],
    minimumRisk: "R2",
  },
  {
    id: "qa-performance",
    paths: ["tests/**"],
    minimumRisk: "R1",
  },
  {
    id: "tooling",
    paths: [".studio/**", ".agents/skills/**", "scripts/studio/**", "nx.json"],
    minimumRisk: "R1",
  },
];

describe("path normalization and glob matching", () => {
  it("normalizes Windows separators to posix form", () => {
    expect(toPosix("packages\\game-core\\src\\index.ts")).toBe("packages/game-core/src/index.ts");
    expect(toPosix(".\\docs\\INDEX.md")).toBe("docs/INDEX.md");
    expect(toPosix("already/posix.md")).toBe("already/posix.md");
  });

  it("matches globs against backslash input deterministically", () => {
    expect(matchGlob("packages/game-core/**", "packages\\game-core\\src\\a.ts")).toBe(true);
    expect(
      matchGlob("content/**/scenarios/**", "content/1990s/programming/scenarios/x.jsonc"),
    ).toBe(true);
    expect(matchGlob("content/**/scenarios/**", "content/1990s/programming/events/x.jsonc")).toBe(
      false,
    );
    expect(matchGlob("AGENTS.md", "AGENTS.md")).toBe(true);
    expect(matchGlob("AGENTS.md", "docs/AGENTS.md")).toBe(false);
    expect(
      matchGlob("scripts/run-*-performance-*.mjs", "scripts/run-january-performance-baseline.mjs"),
    ).toBe(true);
  });
});

describe("ignored and generated paths", () => {
  it("excludes generated catalogs, runtime state and tool caches", () => {
    for (const candidate of [
      "docs/MANIFEST.jsonc",
      "docs/CATALOG.md",
      ".studio/runtime/tasks/RH-1/envelope.json",
      ".opencode/plan.md",
      "node_modules/pkg/index.js",
      "tsconfig.tsbuildinfo",
      "pnpm-lock.yaml",
      "apps/desktop/storybook-static/x.js",
    ]) {
      expect(isIgnoredPath(candidate)).toBe(true);
    }
  });

  it("keeps canonical sources", () => {
    expect(isIgnoredPath("packages/game-core/src/month-run.ts")).toBe(false);
    expect(isIgnoredPath("balance/quality/january-1990.jsonc")).toBe(false);
  });
});

describe("zone resolution", () => {
  it("selects overlapping zones in declaration order with sorted matches", () => {
    const resolution = resolveZones(
      [
        "content/1990s/programming/scenarios/jan.jsonc",
        "content/1990s/programming/events/disk.jsonc",
        "packages/game-core/src/rng.ts",
      ],
      zones,
    );
    expect(resolution.selected.map((entry) => entry.id)).toEqual(["core", "content", "scenario"]);
    expect(resolution.selected[2]?.matched).toEqual([
      "content/1990s/programming/scenarios/jan.jsonc",
    ]);
    expect(resolution.unmatched).toEqual([]);
  });

  it("falls back unmatched infrastructure files to tooling with an account", () => {
    const resolution = resolveZones(["package.json"], zones, { fallbackZone: "tooling" });
    expect(resolution.selected.map((entry) => entry.id)).toEqual(["tooling"]);
    expect(resolution.unmatched).toEqual(["package.json"]);
  });

  it("counts ignored files separately from zone matching", () => {
    const resolution = resolveZones(
      ["docs/MANIFEST.jsonc", ".studio/runtime/logs/x.log", "tests/a.test.ts"],
      zones,
    );
    expect(resolution.ignored).toEqual([".studio/runtime/logs/x.log", "docs/MANIFEST.jsonc"]);
    expect(resolution.selected.map((entry) => entry.id)).toEqual(["qa-performance"]);
  });
});

describe("risk classification", () => {
  it("takes the maximum declared minimum risk across selected zones", () => {
    const result = classifyRisk(["qa-performance", "core"], zones);
    expect(result.risk).toBe("R2");
    expect(result.promoted).toBe(false);
  });

  it("promotes to R3 on promoteToR3On keywords in task text or paths", () => {
    expect(
      classifyRisk(["core"], zones, { taskText: "touches MonthRun resume semantics" }).risk,
    ).toBe("R3");
    expect(
      classifyRisk(["core"], zones, {
        changedPaths: ["packages/game-core/state/authoritative-state.ts"],
      }).promoted,
    ).toBe(true);
  });

  it("honors an override only upward like studio:route", () => {
    expect(classifyRisk(["qa-performance"], zones, { overrideRisk: "R2_COMPLEX" }).risk).toBe(
      "R2_COMPLEX",
    );
    expect(classifyRisk(["core"], zones, { overrideRisk: "R1" }).risk).toBe("R2");
  });
});

describe("skill selection", () => {
  const skillMap = [
    { name: "runtime-implement", status: "active" },
    { name: "runtime-content", status: "active" },
    { name: "runtime-ui", status: "active" },
    { name: "runtime-architecture", status: "active" },
    { name: "runtime-balance", status: "planned" },
  ];

  it("maps zones to active skills without planned entries", () => {
    expect(selectSkills(["balance"], "R2", skillMap)).toEqual(["runtime-implement"]);
    expect(selectSkills(["content", "ui"], "R2", skillMap)).toEqual([
      "runtime-content",
      "runtime-ui",
    ]);
  });

  it("prepends architecture skill for R3 and deduplicates", () => {
    expect(selectSkills(["canon", "core"], "R3", skillMap)).toEqual([
      "runtime-architecture",
      "runtime-implement",
    ]);
  });
});

describe("context budgets", () => {
  const policy = { maxInitialDocs: 5, maxInitialFiles: 8 };

  it("caps mustRead by doc and file budgets and bounds mayRead", () => {
    const base = ["AGENTS.md", "GAME.md"];
    const guides = ["docs/agents/CORE-AGENT.md", "docs/agents/QA-AGENT.md"];
    const changedExisting = Array.from({ length: 20 }, (_, index) => `src/file${index}.ts`);
    const lists = buildReadLists({ base, guides, changedExisting, policy });
    expect(lists.mustRead).toHaveLength(12);
    expect(lists.mustRead.slice(0, 4)).toEqual([...base, ...guides]);
    expect(lists.mustRead[4]).toBe("src/file0.ts");
    expect(lists.mayRead).toHaveLength(8);
    expect(lists.mayRead.every((item) => !lists.mustRead.includes(item))).toBe(true);
  });

  it("keeps deterministic ordering for identical inputs", () => {
    const inputs = {
      base: ["GAME.md", "AGENTS.md"],
      guides: [],
      changedExisting: ["b.ts", "a.ts"],
      policy,
    };
    expect(buildReadLists(inputs)).toEqual(buildReadLists(inputs));
    expect(buildReadLists(inputs).mustRead[2]).toBe("a.ts");
  });
});

describe("historical finding selection", () => {
  const coreRow: LedgerFindingRow = {
    id: "RF-B",
    zone: "core",
    severity: "S2",
    category: "duplicate-commit",
    component: "month-run-store",
    invariant: null,
    summary: "Duplicate commit receipt duplicated progression",
    disposition: "LEDGER",
    status: "open",
    occurrences: 2,
  };
  const uiRow: LedgerFindingRow = {
    id: "RF-A",
    zone: "ui",
    severity: "S1",
    category: "contrast",
    component: "shell",
    invariant: null,
    summary: "Contrast regression on dock",
    disposition: "FIX_NOW",
    status: "open",
    occurrences: 1,
  };
  const closedRow: LedgerFindingRow = {
    id: "RF-C",
    zone: "persistence",
    severity: "S0",
    category: "save-corruption",
    component: "sqlite",
    invariant: null,
    summary: "Unrelated open finding",
    disposition: "BLOCK",
    status: "resolved",
    occurrences: 3,
  };
  const migrationRow: LedgerFindingRow = {
    id: "RF-D",
    zone: "persistence",
    severity: "S3",
    category: "migration",
    component: "sqlite",
    invariant: null,
    summary: "Migration dry run",
    disposition: "LEDGER",
    status: "open",
    occurrences: 1,
  };
  const rows = [coreRow, uiRow, closedRow];

  it("ranks zone matches first, caps at three and skips closed rows", () => {
    const selected = selectRelevantFindings(rows, { zoneIds: ["core", "ui"] }, 3);
    expect(selected.map((finding) => finding.id)).toEqual(["RF-A", "RF-B"]);
  });

  it("uses path or task-text relevance and breaks ties deterministically by id", () => {
    const selected = selectRelevantFindings(
      [uiRow, coreRow, migrationRow],
      { zoneIds: [], changedPaths: ["apps/desktop/src-tauri/src/sqlite.rs"], taskText: "" },
      3,
    );
    expect(selected.map((finding) => finding.id)).toEqual(["RF-D"]);
  });
});

describe("verification derivation", () => {
  it("derives concrete runnable commands per touched zone", () => {
    const plan = deriveVerification(
      ["content", "tooling"],
      ["content/sources/x.jsonc", "docs/adr/ADR-019-x.md"],
      "V1",
    );
    expect(plan.commands).toContain("pnpm content:check");
    expect(plan.commands).toContain("pnpm docs:check");
    expect(plan.tier).toBe("V1");
  });

  it("maps touched test files into a focused vitest command", () => {
    const plan = deriveVerification(["core"], ["tests/month-run-resume.test.ts"], "V0");
    expect(plan.commands.some((command) => command.startsWith("pnpm exec vitest run tests/"))).toBe(
      true,
    );
  });
});

describe("envelope contract constants", () => {
  it("pins schema version and validates tier/risk helpers", () => {
    expect(TASK_ENVELOPE_SCHEMA).toBe("runtime-human-task-envelope-v1");
    expect(isValidTier("V4")).toBe(true);
    expect(isValidTier("V9")).toBe(false);
    expect(isValidRisk("R2_COMPLEX")).toBe(true);
    expect(isValidRisk("R9")).toBe(false);
  });
});
