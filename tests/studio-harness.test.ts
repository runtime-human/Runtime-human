import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  AFFECTED_SCHEMA,
  VERIFY_SCHEMA,
  buildTierCommands,
  classifyAffected,
  formatCompact,
  mergeProjectLists,
  runCommand,
  sanitizeLogName,
  shouldRecommendFullGate,
  summarizeText,
} from "../scripts/studio/harness-lib.mjs";

const zonesConfig = {
  zones: [
    { id: "core", paths: ["packages/game-core/**"], minimumRisk: "R2" },
    { id: "ui", paths: ["packages/game-ui/**", "apps/desktop/src/**"], minimumRisk: "R1" },
    {
      id: "persistence",
      paths: ["apps/desktop/src-tauri/**"],
      minimumRisk: "R3",
    },
    { id: "qa-performance", paths: ["tests/**"], minimumRisk: "R1" },
    { id: "content", paths: ["content/**"], minimumRisk: "R2" },
    { id: "tooling", paths: [".studio/**", "scripts/studio/**"], minimumRisk: "R1" },
  ],
  exclusiveWriteGroups: [["core", "persistence"]],
};

describe("log naming", () => {
  it("is deterministic, collision-safe and filesystem-safe", () => {
    const first = sanitizeLogName(["pnpm", "exec", "vitest run", "tests/a b.test.ts"]);
    const second = sanitizeLogName(["pnpm", "exec", "vitest run", "tests/a b.test.ts"]);
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-z0-9._-]+\.log$/);
    expect(sanitizeLogName(["a-b"])).not.toBe(sanitizeLogName(["a", "b"]));
    expect(sanitizeLogName(["x".repeat(200)]).length).toBeLessThanOrEqual(64);
  });
});

describe("compact output summarization", () => {
  const failingVitest = [
    "$ pnpm exec vitest run tests/x.test.ts",
    "",
    "Tests  2 failed | 153 passed (155)",
    "",
    "FAIL  tests/x.test.ts > month resume",
    "AssertionError: expected 1 to equal 2",
    " ❯ tests/x.test.ts:42:5",
    "",
    "FAIL  tests/y.test.ts > duplicate commit",
    "AssertionError: expected receipt once",
    " ❯ tests/y.test.ts:7:3",
    "",
    "Test Files  2 failed (2)",
  ].join("\n");

  it("extracts counts and bounded failure excerpts deterministically", () => {
    const summary = summarizeText(failingVitest);
    expect(summary.total).toBe(155);
    expect(summary.failed).toBe(2);
    expect(summary.excerpts.length).toBe(2);
    expect(summary.excerpts[0]).toContain("month resume");
    expect(summary.excerpts[1]).toContain("duplicate commit");
    expect(summarizeText(failingVitest)).toEqual(summary);
  });

  it("caps excerpt count by maxFailures option", () => {
    const summary = summarizeText(failingVitest, { maxFailures: 1, maxLines: 3 });
    expect(summary.excerpts).toHaveLength(1);
  });

  it("falls back to last non-empty lines when no marker exists", () => {
    const summary = summarizeText("line one\n\nline two\nline three");
    expect(summary.total).toBeNull();
    expect(summary.failed).toBeNull();
    expect(summary.excerpts[0]).toBe("1) line one\nline two\nline three");
  });

  it("formats compact PASS/FAIL blocks with a log pointer", () => {
    const pass = formatCompact({
      status: "PASS",
      name: "vitest:core",
      detail: "153",
      logPath: ".studio/runtime/logs/r/a.log",
    });
    expect(pass).toEqual(["PASS vitest:core", "153", "log: .studio/runtime/logs/r/a.log"]);
    const fail = formatCompact({
      status: "FAIL",
      name: "vitest:core",
      detail: "2 failed / 155",
      excerpts: ["1) AssertionError"],
      logPath: ".studio/runtime/logs/r/b.log",
    });
    expect(fail.at(-1)).toBe("log: .studio/runtime/logs/r/b.log");
    expect(fail.some((line) => line.includes("AssertionError"))).toBe(true);
  });
});

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "runtime-human-exec-"));
}

describe("command execution wrapper", () => {
  it("preserves exit codes and captures combined output into the log file", () => {
    const logDir = makeTempDir();
    const run = runCommand({
      args: ["node", "-e", "console.log('out-line');console.error('err-line');process.exit(3)"],
      cwd: process.cwd(),
      logDir,
    });
    expect(run.code).toBe(3);
    expect(run.passed).toBe(false);
    expect(fs.readFileSync(run.logPath, "utf8")).toContain("out-line");
    expect(fs.readFileSync(run.logPath, "utf8")).toContain("err-line");
    expect(run.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("reports success as code 0 with passing flag", () => {
    const run = runCommand({
      args: ["node", "-e", "process.stdout.write('done')"],
      cwd: process.cwd(),
      logDir: makeTempDir(),
    });
    expect(run.code).toBe(0);
    expect(run.passed).toBe(true);
  });

  it("maps spawn failure to a non-zero internal-style code", () => {
    const run = runCommand({
      args: ["runtime-human-definitely-missing-binary-xyz", "--version"],
      cwd: process.cwd(),
      logDir: makeTempDir(),
    });
    expect(run.passed).toBe(false);
    expect([1, 5, 127]).toContain(run.code);
  });
});

describe("affected classification", () => {
  it("classifies zones, projects and verification surfaces from paths", () => {
    const affected = classifyAffected(
      [
        "packages/game-core/src/month-run.ts",
        "tests/month-run-resume.test.ts",
        "docs/MANIFEST.jsonc",
        ".studio/runtime/logs/junk.log",
      ],
      zonesConfig,
      {},
    );
    expect(AFFECTED_SCHEMA).toBe("runtime-human-affected-v1");
    expect(affected.zoneIds).toEqual(["core", "qa-performance"]);
    expect(affected.projects).toEqual([
      "@runtime-human/shared-kernel",
      "@runtime-human/game-schema",
      "@runtime-human/game-core",
    ]);
    expect(affected.tests).toEqual(["tests/month-run-resume.test.ts"]);
    expect(affected.storybook).toBe(false);
    expect(affected.rust).toBe(false);
    expect(affected.contentCompiler).toBe(false);
  });

  it("flags storybook, rust and content compiler surfaces", () => {
    const affected = classifyAffected(
      [
        "packages/game-ui/src/shell.stories.tsx",
        "apps/desktop/src-tauri/src/store.rs",
        "content/1990s/programming/events/disk.jsonc",
      ],
      zonesConfig,
      {},
    );
    expect(affected.zoneIds).toEqual(["ui", "persistence", "content"]);
    expect(affected.storybook).toBe(true);
    expect(affected.rust).toBe(true);
    expect(affected.contentCompiler).toBe(true);
    expect(affected.zoneIds.includes("core")).toBe(false);
  });

  it("detects exclusive write group conflicts for full gate recommendation", () => {
    const conflict = classifyAffected(
      ["packages/game-core/src/a.ts", "apps/desktop/src-tauri/src/b.rs"],
      zonesConfig,
      {},
    );
    expect(conflict.exclusiveConflict).toBe(true);
    expect(
      shouldRecommendFullGate({ risk: "R3", exclusiveConflict: false, selectedZoneCount: 1 }),
    ).toBe(true);
    expect(
      shouldRecommendFullGate({ risk: "R2", exclusiveConflict: true, selectedZoneCount: 2 }),
    ).toBe(true);
    expect(
      shouldRecommendFullGate({ risk: "R2", exclusiveConflict: false, selectedZoneCount: 4 }),
    ).toBe(true);
    expect(
      shouldRecommendFullGate({ risk: "R2", exclusiveConflict: false, selectedZoneCount: 2 }),
    ).toBe(false);
  });
});

describe("tier command assembly", () => {
  const affected = classifyAffected(["packages/game-core/src/a.ts"], zonesConfig, {});

  it("refuses V3/V4 because they are serialized human-owned gates", () => {
    for (const tier of ["V3", "V4"]) {
      const plan = buildTierCommands(tier, affected);
      expect(plan.commands).toBeNull();
      expect(plan.notes.join(" ")).toContain("pnpm verify");
    }
  });

  it("builds focused V0 commands without typecheck or rust", () => {
    const plan = buildTierCommands("V0", affected);
    const flat = plan.commands?.map((command) => command.join(" ")) ?? [];
    expect(flat.some((command) => command.startsWith("pnpm exec vitest run"))).toBe(true);
    expect(flat).not.toContain("pnpm typecheck");
    expect(flat.every((command) => !command.startsWith("cargo"))).toBe(true);
  });

  it("adds typecheck at V1 and full fast gate at V2", () => {
    expect(
      buildTierCommands("V1", affected)
        .commands?.map((c) => c.join(" "))
        .includes("pnpm typecheck"),
    ).toBe(true);
    expect(buildTierCommands("V2", affected).commands?.map((c) => c.join(" "))[0]).toBe(
      "pnpm check:fast",
    );
  });

  it("keeps the verify schema constant pinned", () => {
    expect(VERIFY_SCHEMA).toBe("runtime-human-verify-v1");
  });

  it("merges nx projects after zone projects without duplicates, sorted tail", () => {
    expect(
      mergeProjectLists(
        ["@runtime-human/game-core", "@runtime-human/desktop"],
        ["@runtime-human/game-ui", "@runtime-human/desktop", "desktop-rust"],
      ),
    ).toEqual([
      "@runtime-human/game-core",
      "@runtime-human/desktop",
      "@runtime-human/game-ui",
      "desktop-rust",
    ]);
    expect(mergeProjectLists(["a"], [])).toEqual(["a"]);
    expect(mergeProjectLists([], ["b", "a"])).toEqual(["a", "b"]);
  });
});
