import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import {
  catalogImpact,
  catalogReferences,
  getCatalogEntry,
  listCatalogEntries,
  loadContentCatalog,
  loadZoneDefinitions,
  matchZonePath,
  runDoctor,
  zonesForPaths,
  type ContentCatalog,
  type ContentCatalogEntryV1,
  type ZoneDefinitionV1,
} from "@runtime-human/game-devtools";

const fixtureRoots: string[] = [];

function technologySource(id: string, references: string[]): string {
  return `${JSON.stringify(
    {
      schemaVersion: "content-source-v1",
      id,
      kind: "technology",
      domain: "programming",
      era: "1980s",
      availableFrom: "1985-01",
      entryPoint: false,
      references,
      provenance: [{ sourceId: "manual.qbasic", title: "QBasic historical reference" }],
      payload: { language: "BASIC", environment: "DOS" },
    },
    null,
    2,
  )}\n`;
}

function storyletSource(id: string, references: string[]): string {
  return `${JSON.stringify(
    {
      schemaVersion: "content-source-v1",
      id,
      kind: "storylet",
      domain: "programming",
      era: "1990s",
      availableFrom: "1990-01",
      entryPoint: true,
      references,
      provenance: [{ sourceId: "design.first-program", title: "First program design source" }],
      payload: { title: "Первая программа" },
    },
    null,
    2,
  )}\n`;
}

function zonesConfig(): string {
  return `${JSON.stringify(
    {
      zones: [
        { id: "content-zone", paths: ["content/**"] },
        { id: "qa", paths: ["tests/**"] },
      ],
    },
    null,
    2,
  )}\n`;
}

function createFixtureRepository(
  options: Readonly<{
    brokenReference?: boolean;
    brokenConfig?: boolean;
    missingSourceRoot?: boolean;
    bomConfig?: boolean;
  }> = {},
): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-human-devtools-"));
  fixtureRoots.push(root);

  fs.mkdirSync(path.join(root, "content", "sources", "technology"), { recursive: true });
  fs.mkdirSync(path.join(root, ".studio"), { recursive: true });
  fs.mkdirSync(path.join(root, "tests"), { recursive: true });

  const config =
    options.brokenConfig === true
      ? `{"sourceRoots": `
      : JSON.stringify(
          {
            sourceRoots:
              options.missingSourceRoot === true
                ? ["content/ghost"]
                : ["content/sources/technology"],
            outputRoot: "apps/desktop/public/content",
          },
          null,
          2,
        );
  fs.writeFileSync(
    path.join(root, "content", "content.config.json"),
    options.bomConfig === true ? `\uFEFF${config}\n` : `${config}\n`,
  );

  fs.writeFileSync(
    path.join(root, "content", "sources", "technology", "qbasic.jsonc"),
    technologySource("technology.qbasic", []),
  );
  fs.writeFileSync(
    path.join(root, "content", "sources", "technology", "first-program.jsonc"),
    storyletSource(
      "storylet.first-program",
      options.brokenReference === true ? ["technology.missing"] : ["technology.qbasic"],
    ),
  );

  fs.writeFileSync(path.join(root, ".studio", "zones.json"), zonesConfig());
  fs.writeFileSync(
    path.join(root, "tests", "foo.test.ts"),
    `import { expect, it } from "vitest";\n\nit("mentions content", () => {\n  expect("technology.qbasic").toBeTruthy();\n});\n`,
  );

  return root;
}

const root = createFixtureRepository();
const brokenRoot = createFixtureRepository({ brokenReference: true });
const invalidConfigRoot = createFixtureRepository({ brokenConfig: true });

const zones: readonly ZoneDefinitionV1[] = [
  { id: "content-zone", paths: ["content/**"] },
  { id: "qa", paths: ["tests/**"] },
];

afterAll(() => {
  for (const fixtureRoot of fixtureRoots) {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

describe("content catalog loading", () => {
  it("loads a catalog with id-sorted entries and posix source paths", async () => {
    const loaded = await loadContentCatalog({ repositoryRoot: root });

    expect(loaded.kind).toBe("success");
    if (loaded.kind !== "success") throw new Error("expected successful catalog load");
    expect(loaded.catalog.repositoryRoot).toBe(path.resolve(root));
    expect(loaded.catalog.entries.map((entry) => entry.id)).toEqual([
      "storylet.first-program",
      "technology.qbasic",
    ]);
    expect(loaded.catalog.entries[0]?.sourcePath).toBe(
      "content/sources/technology/first-program.jsonc",
    );
  });

  it("maps compiler failures onto structured diagnostics", async () => {
    const loaded = await loadContentCatalog({ repositoryRoot: brokenRoot });

    expect(loaded.kind).toBe("failure");
    if (loaded.kind !== "failure") throw new Error("expected failed catalog load");
    const diagnostic = loaded.diagnostics[0];
    expect(diagnostic?.schemaVersion).toBe("runtime-human-diagnostic-v1");
    expect(diagnostic).toMatchObject({
      code: "MISSING_REFERENCE",
      severity: "error",
      category: "content",
      entityId: "storylet.first-program",
      path: "content/sources/technology/first-program.jsonc",
    });
    expect(diagnostic?.line).toBeGreaterThan(1);
    expect(diagnostic?.column).toBeGreaterThan(0);
  });

  it("reports CONFIG_MISSING when the build config does not exist", async () => {
    const loaded = await loadContentCatalog({
      repositoryRoot: root,
      configPath: "content/absent.config.json",
    });

    expect(loaded).toMatchObject({
      kind: "failure",
      diagnostics: [
        {
          schemaVersion: "runtime-human-diagnostic-v1",
          code: "CONFIG_MISSING",
          severity: "error",
          category: "content",
          path: "content/absent.config.json",
        },
      ],
    });
  });

  it("reports CONFIG_INVALID for malformed config JSON", async () => {
    const loaded = await loadContentCatalog({ repositoryRoot: invalidConfigRoot });

    expect(loaded.kind).toBe("failure");
    if (loaded.kind !== "failure") throw new Error("expected failed catalog load");
    expect(loaded.diagnostics[0]).toMatchObject({
      code: "CONFIG_INVALID",
      severity: "error",
      category: "content",
      path: "content/content.config.json",
    });
  });

  it("reports SOURCE_ROOT_INVALID when a configured source root does not exist", async () => {
    const loaded = await loadContentCatalog({
      repositoryRoot: createFixtureRepository({ missingSourceRoot: true }),
    });

    expect(loaded.kind).toBe("failure");
    if (loaded.kind !== "failure") throw new Error("expected failed catalog load");
    expect(loaded.diagnostics[0]).toMatchObject({
      code: "SOURCE_ROOT_INVALID",
      severity: "error",
      category: "content",
    });
    expect(loaded.diagnostics[0]?.message).toContain("content/ghost");
  });

  it("strips a UTF-8 byte order mark from the build config", async () => {
    const loaded = await loadContentCatalog({
      repositoryRoot: createFixtureRepository({ bomConfig: true }),
    });

    expect(loaded.kind).toBe("success");
  });
});

describe("catalog queries", () => {
  it("filters catalog entries by kind, domain and era", async () => {
    const loaded = await loadContentCatalog({ repositoryRoot: root });
    if (loaded.kind !== "success") throw new Error("expected successful catalog load");
    const { catalog } = loaded;

    expect(listCatalogEntries(catalog)).toHaveLength(2);
    expect(listCatalogEntries(catalog, { kind: "technology" }).map((entry) => entry.id)).toEqual([
      "technology.qbasic",
    ]);
    expect(listCatalogEntries(catalog, { domain: "programming" })).toHaveLength(2);
    expect(listCatalogEntries(catalog, { era: "1990s" }).map((entry) => entry.id)).toEqual([
      "storylet.first-program",
    ]);
    expect(listCatalogEntries(catalog, { kind: "technology", era: "1990s" })).toEqual([]);
    expect(getCatalogEntry(catalog, "technology.qbasic")?.kind).toBe("technology");
    expect(getCatalogEntry(catalog, "technology.absent")).toBeUndefined();
  });

  it("computes outgoing and incoming references", async () => {
    const loaded = await loadContentCatalog({ repositoryRoot: root });
    if (loaded.kind !== "success") throw new Error("expected successful catalog load");
    const { catalog } = loaded;

    expect(catalogReferences(catalog, "storylet.first-program")).toEqual({
      id: "storylet.first-program",
      outgoing: [{ id: "technology.qbasic", resolved: true }],
      incoming: [],
    });
    expect(catalogReferences(catalog, "technology.qbasic")).toEqual({
      id: "technology.qbasic",
      outgoing: [],
      incoming: ["storylet.first-program"],
    });
    expect(catalogReferences(catalog, "technology.absent")).toBeUndefined();
  });

  it("marks references that do not resolve inside the catalog", () => {
    const entries: readonly ContentCatalogEntryV1[] = [
      {
        id: "storylet.orphan",
        kind: "storylet",
        domain: "programming",
        era: "1990s",
        availableFrom: "1990-01",
        entryPoint: true,
        references: ["technology.absent", "technology.real"],
        provenance: [],
        sourcePath: "content/orphan.jsonc",
      },
      {
        id: "technology.real",
        kind: "technology",
        domain: "programming",
        era: "1980s",
        availableFrom: "1985-01",
        entryPoint: false,
        references: [],
        provenance: [],
        sourcePath: "content/real.jsonc",
      },
    ];

    const synthetic: ContentCatalog = { repositoryRoot: root, entries };
    expect(catalogReferences(synthetic, "storylet.orphan")?.outgoing).toEqual([
      { id: "technology.absent", resolved: false },
      { id: "technology.real", resolved: true },
    ]);
  });

  it("computes impact with consumers, tests and zones", async () => {
    const loaded = await loadContentCatalog({ repositoryRoot: root });
    if (loaded.kind !== "success") throw new Error("expected successful catalog load");

    const impact = await catalogImpact(loaded.catalog, "technology.qbasic");
    expect(impact).toEqual({
      id: "technology.qbasic",
      sourcePath: "content/sources/technology/qbasic.jsonc",
      consumers: ["storylet.first-program"],
      tests: ["tests/foo.test.ts"],
      zones: ["content-zone", "qa"],
    });

    const contextual = await catalogImpact(loaded.catalog, "technology.qbasic", {
      zones,
      testsRoot: path.join(root, "tests"),
    });
    expect(contextual).toEqual(impact);

    expect(await catalogImpact(loaded.catalog, "technology.absent")).toBeUndefined();
  });
});

describe("zone matching", () => {
  it("loads zone definitions from .studio/zones.json", async () => {
    expect(await loadZoneDefinitions(root)).toEqual(zones);
    expect(await loadZoneDefinitions(path.join(root, "content"))).toBeUndefined();
  });

  it("rejects malformed zones config with a TypeError", async () => {
    const malformedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-human-devtools-bad-"));
    fixtureRoots.push(malformedRoot);
    fs.mkdirSync(path.join(malformedRoot, ".studio"), { recursive: true });
    fs.writeFileSync(path.join(malformedRoot, ".studio", "zones.json"), "{ zones: ");

    await expect(loadZoneDefinitions(malformedRoot)).rejects.toThrow(TypeError);
  });

  it("matches exact files, directory globs, mid-pattern globs and star segments", () => {
    expect(matchZonePath("nx.json", "nx.json")).toBe(true);
    expect(matchZonePath("nx.json", "packages/nx.json")).toBe(false);

    expect(matchZonePath("packages/game-core/**", "packages/game-core")).toBe(true);
    expect(matchZonePath("packages/game-core/**", "packages\\game-core\\src\\month-run.ts")).toBe(
      true,
    );
    expect(matchZonePath("packages/game-core/**", "packages/game-ui/src/shell.tsx")).toBe(false);

    expect(matchZonePath("content/**/scenarios/**", "content/1990s/scenarios/disk.jsonc")).toBe(
      true,
    );
    expect(matchZonePath("content/**/scenarios/**", "content/scenarios/disk.jsonc")).toBe(true);
    expect(matchZonePath("content/**/scenarios/**", "content/1990s/events/disk.jsonc")).toBe(false);

    expect(
      matchZonePath(
        "scripts/run-*-performance-*.mjs",
        "scripts/run-january-performance-baseline.mjs",
      ),
    ).toBe(true);
    expect(
      matchZonePath("scripts/run-*-performance-*.mjs", "scripts/run-january-performance.mjs"),
    ).toBe(false);
    expect(
      matchZonePath(
        "scripts/run-*-performance-*.mjs",
        "scripts/nested/run-january-performance-baseline.mjs",
      ),
    ).toBe(false);
  });

  it("normalizes dot segments and windows separators before matching", () => {
    expect(matchZonePath("./content/**", "content/a.jsonc")).toBe(true);
    expect(matchZonePath(".\\content\\**", "content/a.jsonc")).toBe(true);
    expect(matchZonePath("content/**", "./content/a.jsonc")).toBe(true);
  });

  it("collects unique sorted zone ids for path sets", () => {
    const zoneDefinitions: readonly ZoneDefinitionV1[] = [
      { id: "qa", paths: ["tests/**"] },
      { id: "everything", paths: ["**"] },
      { id: "content-zone", paths: ["content/**"] },
    ];

    expect(
      zonesForPaths(zoneDefinitions, ["content/a.jsonc", "content/b.jsonc", "tests/x.test.ts"]),
    ).toEqual(["content-zone", "everything", "qa"]);
    expect(zonesForPaths(zoneDefinitions, [])).toEqual([]);
    expect(zonesForPaths([], ["content/a.jsonc"])).toEqual([]);
  });
});

describe("doctor", () => {
  it("runs environment and content checks in fixed order on a fixture repository", async () => {
    const report = await runDoctor({ repositoryRoot: root });

    expect(report.ok).toBe(false);
    expect(report.checks.map((check) => check.id)).toEqual([
      "node-version",
      "pnpm-lockfile",
      "studio-configs",
      "content-graph",
      "git",
    ]);
    expect(report.checks[0]).toMatchObject({ ok: true, severity: "environment" });
    expect(report.checks[1]).toMatchObject({ ok: false, severity: "environment" });
    expect(report.checks[2]).toMatchObject({
      ok: false,
      severity: "environment",
      detail: "missing: context-map.json, models.json, skill-map.json, verification-policy.json",
    });
    expect(report.checks[3]).toMatchObject({
      ok: true,
      severity: "content",
      detail: "2 content entries",
    });
    expect(report.checks[4]).toMatchObject({ ok: true, severity: "environment" });
  });
});
