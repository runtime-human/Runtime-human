import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parse as parseJsonc } from "jsonc-parser";
import { describe, expect, it } from "vitest";

import {
  assertIsolatedContentBuildNamespaces,
  assertJanuaryV2PresentationSource,
  JANUARY_V2_PRESENTATION_SOURCE_PATH,
  runJanuaryV2ContentBuild,
  compileContentSources,
  inspectProtectedContentChunks,
  loadContentSourceFiles,
  runContentBuild,
  runIsolatedContentBuild,
  type ContentSourceFile,
} from "@runtime-human/game-content-compiler";

const LEGACY_ROOTS = [
  "content/sources/technology",
  "content/1990s/programming",
  "content/1990s/ecosystem",
] as const;
const PROTECTED_CHUNKS = ["1990s/ecosystem", "1990s/programming"] as const;
const LEGACY_MANIFEST_FINGERPRINT =
  "02518cba1617689d4ada48e4624e6dfc96175c1b363132db38d8e738b819739f";

const V2_PRESENTATION_PROBE: ContentSourceFile = {
  path: "content/january-v2/presentation/first-bug.jsonc",
  text: JSON.stringify({
    schemaVersion: "content-source-v1",
    id: "core.situation-presentation.january-1990-v2",
    kind: "storylet",
    domain: "programming-v2",
    era: "1990s",
    availableFrom: "1990-01",
    entryPoint: true,
    references: [],
    provenance: [
      {
        sourceId: "runtime-human.january-1990-design",
        title: "January v2 separate-bundle compatibility probe",
      },
    ],
    payload: {
      contentType: "january-v2-compatibility-probe",
      // A test probe, NOT player-facing content or an accepted v2 schema.
      purpose: "separate-compiled-content-namespace",
    },
  }),
};

async function legacyFiles(): Promise<readonly ContentSourceFile[]> {
  return loadContentSourceFiles({
    repositoryRoot: process.cwd(),
    sourceRoots: LEGACY_ROOTS,
  });
}

function bundle(files: readonly ContentSourceFile[]) {
  const compiled = compileContentSources(files);
  if (compiled.kind === "failure") {
    throw new Error(JSON.stringify(compiled.diagnostics));
  }
  return compiled.bundle;
}

describe("REF-02B0 January v2 content compatibility gate", () => {
  it("pins the deployed January v1 manifest and compiled chunk bytes", async () => {
    const roots = JSON.parse(await readFile("content/content.config.json", "utf8")) as {
      sourceRoots: string[];
    };
    expect(roots.sourceRoots).toEqual(LEGACY_ROOTS);

    const baseline = bundle(await legacyFiles());
    const manifest = JSON.parse(
      await readFile("apps/desktop/public/content/manifest.json", "utf8"),
    ) as { contentFingerprint: string };
    expect(manifest.contentFingerprint).toBe(LEGACY_MANIFEST_FINGERPRINT);
    expect(baseline.manifest.contentFingerprint).toBe(LEGACY_MANIFEST_FINGERPRINT);
    expect(baseline.manifest).toEqual(manifest);
    expect(baseline.manifest.chunks.map((chunk) => chunk.chunkId)).toEqual(PROTECTED_CHUNKS);

    for (const chunkId of PROTECTED_CHUNKS) {
      const path = `chunks/${chunkId}.json`;
      const artifact = baseline.artifacts.find((entry) => entry.path === path);
      expect(artifact, path).toBeDefined();
      await expect(readFile(join("apps/desktop/public/content", path), "utf8")).resolves.toBe(
        artifact?.json,
      );
    }
  });

  it("requires disjoint v1/v2 source and deployment namespaces before B1 publication", () => {
    const legacyBuild = {
      sourceRoots: LEGACY_ROOTS,
      outputRoot: "apps/desktop/public/content",
    } as const;
    const isolatedV2 = {
      sourceRoots: ["content/1990s/programming-v2"],
      outputRoot: "apps/desktop/public/content-v2",
    } as const;

    // Prefixes alone must not create a false collision (programming != programming-v2).
    expect(() => assertIsolatedContentBuildNamespaces(legacyBuild, isolatedV2)).not.toThrow();

    const overlapping = [
      {
        sourceRoots: ["content/1990s/programming"],
        outputRoot: "apps/desktop/public/content-v2",
      },
      {
        sourceRoots: ["content/1990s"],
        outputRoot: "apps/desktop/public/content-v2",
      },
      {
        sourceRoots: ["content/1990s/programming/v2"],
        outputRoot: "apps/desktop/public/content-v2",
      },
      {
        sourceRoots: ["content/january-v2"],
        outputRoot: "apps/desktop/public/content",
      },
      {
        sourceRoots: ["content/january-v2"],
        outputRoot: "apps/desktop/public/content/v2",
      },
      {
        sourceRoots: ["content/january-v2"],
        outputRoot: "apps/desktop/public",
      },
      {
        sourceRoots: ["content/january-v2"],
        outputRoot: "content/1990s/programming/generated",
      },
      {
        sourceRoots: ["content/january-v2"],
        outputRoot: "content/january-v2/generated",
      },
    ];
    for (const config of overlapping) {
      expect(() => assertIsolatedContentBuildNamespaces(legacyBuild, config)).toThrow(
        /Content build (namespaces|additional source\/output) overlap/,
      );
    }

    expect(() =>
      assertIsolatedContentBuildNamespaces(legacyBuild, {
        sourceRoots: ["content/january-v2"],
        outputRoot: "../unsafe",
      }),
    ).toThrow("Content build outputRoot must be a normalized relative path");
  });

  it("rejects duplicate, nested and Windows-aliased source roots within either build", () => {
    const legacy = {
      sourceRoots: LEGACY_ROOTS,
      outputRoot: "apps/desktop/public/content",
    } as const;
    const isolated = {
      sourceRoots: ["content/january-v2"],
      outputRoot: "apps/desktop/public/content-v2",
    } as const;
    const sourceRootPairs = [
      ["content/january-v2", "content/january-v2/subdir"],
      ["content/january-v2/subdir", "CONTENT/JANUARY-V2"],
      ["content/january-v2", "CONTENT/JANUARY-V2"],
    ] as const;

    for (const sourceRoots of sourceRootPairs) {
      expect(() =>
        assertIsolatedContentBuildNamespaces(legacy, {
          ...isolated,
          sourceRoots,
        }),
      ).toThrow("Content build additional source roots overlap");
    }

    for (const sourceRoots of [
      ["content/sources/technology", "content/sources"],
      ["content/sources/technology", "CONTENT/SOURCES/TECHNOLOGY"],
    ]) {
      expect(() =>
        assertIsolatedContentBuildNamespaces({ ...legacy, sourceRoots }, isolated),
      ).toThrow("Content build legacy source roots overlap");
    }

    expect(() =>
      assertIsolatedContentBuildNamespaces(legacy, {
        ...isolated,
        sourceRoots: ["content/january-v2", "CONTENT/JANUARY-V2-EXTRAS"],
      }),
    ).not.toThrow();
  });

  it("rejects case-insensitive Windows aliases of legacy source and output roots", () => {
    const legacy = {
      sourceRoots: LEGACY_ROOTS,
      outputRoot: "apps/desktop/public/content",
    } as const;

    for (const additional of [
      {
        sourceRoots: ["CONTENT/1990s/PROGRAMMING"],
        outputRoot: "apps/desktop/public/content-v2",
      },
      {
        sourceRoots: ["CONTENT/1990s/PROGRAMMING/subfolder"],
        outputRoot: "apps/desktop/public/content-v2",
      },
      {
        sourceRoots: ["content/january-v2"],
        outputRoot: "APPS/DESKTOP/PUBLIC/CONTENT",
      },
      {
        sourceRoots: ["content/january-v2"],
        outputRoot: "Apps/Desktop/Public/Content/chunks",
      },
      {
        sourceRoots: ["content/january-v2"],
        outputRoot: "CONTENT/SOURCES/TECHNOLOGY/generated",
      },
      {
        sourceRoots: ["Content/January-v2"],
        outputRoot: "content/january-v2/generated",
      },
    ]) {
      expect(() => assertIsolatedContentBuildNamespaces(legacy, additional)).toThrow(
        /Content build (namespaces|additional source\/output) overlap/,
      );
    }

    // These sibling directories remain distinct even under Windows case folding.
    expect(() =>
      assertIsolatedContentBuildNamespaces(legacy, {
        sourceRoots: ["CONTENT/1990s/PROGRAMMING-V2"],
        outputRoot: "APPS/DESKTOP/PUBLIC/CONTENT-V2",
      }),
    ).not.toThrow();
  });

  it("rejects non-portable Windows spellings before checking namespace isolation", () => {
    const legacy = {
      sourceRoots: LEGACY_ROOTS,
      outputRoot: "apps/desktop/public/content",
    } as const;
    for (const path of [
      "content/january-v2.",
      "content/january-v2 ",
      "content/NUL",
      "content/COM1.tmp",
      "content/LPT².log",
      "content/bad?name",
      "content/bad\u001f",
      "content/bad\u0000",
      "content/cafe\u0301",
    ]) {
      expect(() =>
        assertIsolatedContentBuildNamespaces(legacy, {
          sourceRoots: [path],
          outputRoot: "apps/desktop/public/content-v2",
        }),
      ).toThrow("Content build namespace path is not Windows-portable");
    }
    expect(() =>
      assertIsolatedContentBuildNamespaces(legacy, {
        sourceRoots: ["content/january-v2"],
        outputRoot: "apps/desktop/public/content-v2.",
      }),
    ).toThrow("Content build namespace path is not Windows-portable");
  });

  it("publishes and checks only isolated v2 after verifying deployed legacy artifacts", async () => {
    const repositoryRoot = await mkdtemp(join(tmpdir(), "runtime-human-v2-build-"));
    const legacyConfig = {
      sourceRoots: ["content/legacy"],
      outputRoot: "apps/desktop/public/content",
    } as const;
    const additionalConfig = {
      sourceRoots: ["content/january-v2"],
      outputRoot: "apps/desktop/public/content-v2",
    } as const;
    const legacySource = join(repositoryRoot, "content/legacy/fixture.jsonc");
    const newSource = join(repositoryRoot, "content/january-v2/fixture.jsonc");
    const legacyManifest = join(repositoryRoot, legacyConfig.outputRoot, "manifest.json");
    const newManifest = join(repositoryRoot, additionalConfig.outputRoot, "manifest.json");
    const isolated = (mode: "check" | "write") =>
      runIsolatedContentBuild({
        repositoryRoot,
        legacyConfig,
        additionalConfig,
        mode,
      });

    try {
      await mkdir(join(repositoryRoot, "content/legacy"), { recursive: true });
      await mkdir(join(repositoryRoot, "content/january-v2"), { recursive: true });
      await writeFile(legacySource, V2_PRESENTATION_PROBE.text, "utf8");
      await writeFile(newSource, V2_PRESENTATION_PROBE.text, "utf8");

      // A missing or stale v1 publication must not cause any v2 write.
      await expect(isolated("write")).rejects.toThrow(
        "Refusing isolated content build: legacy published artifacts are outdated",
      );
      await expect(readFile(newManifest, "utf8")).rejects.toMatchObject({ code: "ENOENT" });

      expect(
        await runContentBuild({ repositoryRoot, config: legacyConfig, mode: "write" }),
      ).toMatchObject({ kind: "written" });
      const v1Before = await readFile(legacyManifest, "utf8");

      await expect(
        runIsolatedContentBuild({
          repositoryRoot,
          legacyConfig,
          additionalConfig: {
            sourceRoots: ["CONTENT/LEGACY"],
            outputRoot: additionalConfig.outputRoot,
          },
          mode: "write",
        }),
      ).rejects.toThrow("Content build namespaces overlap");

      expect(await isolated("write")).toMatchObject({ kind: "written" });
      expect(await isolated("check")).toMatchObject({ kind: "current" });
      expect(await readFile(legacyManifest, "utf8")).toBe(v1Before);
      const v2Before = await readFile(newManifest, "utf8");

      // Valid source drift in v1 fails closed; the v2 output is untouched.
      await writeFile(
        legacySource,
        V2_PRESENTATION_PROBE.text.replace(
          "January v2 separate-bundle compatibility probe",
          "Modified legacy compatibility probe",
        ),
        "utf8",
      );
      await expect(isolated("write")).rejects.toThrow(
        "Refusing isolated content build: legacy published artifacts are outdated",
      );
      expect(await readFile(legacyManifest, "utf8")).toBe(v1Before);
      expect(await readFile(newManifest, "utf8")).toBe(v2Before);

      await writeFile(legacySource, "{invalid", "utf8");
      await expect(isolated("write")).rejects.toThrow(
        "Refusing isolated content build: legacy published artifacts are content-invalid",
      );
      expect(await readFile(newManifest, "utf8")).toBe(v2Before);
    } finally {
      await rm(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("compiles separately authored RU January v2 content without changing the legacy bundle", async () => {
    const legacyConfig = JSON.parse(await readFile("content/content.config.json", "utf8")) as {
      sourceRoots: string[];
      outputRoot: string;
    };
    const additionalConfig = JSON.parse(
      await readFile("content/content-v2.config.json", "utf8"),
    ) as {
      sourceRoots: string[];
      outputRoot: string;
    };
    expect(additionalConfig).toEqual({
      sourceRoots: ["content/january-v2"],
      outputRoot: "apps/desktop/public/content-v2",
    });
    expect(() =>
      assertIsolatedContentBuildNamespaces(legacyConfig, additionalConfig),
    ).not.toThrow();

    const sourceFiles = await loadContentSourceFiles({
      repositoryRoot: process.cwd(),
      sourceRoots: additionalConfig.sourceRoots,
    });
    expect(sourceFiles.map((source) => source.path)).toEqual([JANUARY_V2_PRESENTATION_SOURCE_PATH]);
    expect(() => assertJanuaryV2PresentationSource(sourceFiles)).not.toThrow();
    const compiled = bundle(sourceFiles);
    expect(compiled.manifest.chunks.map((chunk) => chunk.chunkId)).toEqual([
      "1990s/programming-v2",
    ]);
    expect(compiled.manifest.entryPointIds).toEqual([
      "core.situation-presentation.january-1990-v2",
    ]);
    expect(compiled.manifest.contentFingerprint).not.toBe(LEGACY_MANIFEST_FINGERPRINT);
    expect(bundle(await legacyFiles()).manifest.contentFingerprint).toBe(
      LEGACY_MANIFEST_FINGERPRINT,
    );
  });

  it("rejects invalid January v2 marker claims, wording, and missing localization", async () => {
    const sources = await loadContentSourceFiles({
      repositoryRoot: process.cwd(),
      sourceRoots: ["content/january-v2"],
    });
    const original = sources[0]!;
    type EditablePresentation = {
      payload: {
        approaches: {
          id: string;
          tradeOffs: { axis: string; polarity: string; textKey: string }[];
        }[];
        strings: Record<string, string>;
        listings: { eventType: string; highlightedLine: number }[];
        situation: { titleKey: string };
        [key: string]: unknown;
      };
    };
    const changed = (edit: (document: EditablePresentation) => void) => {
      const doc = parseJsonc(original.text) as EditablePresentation;
      edit(doc);
      return [{ ...original, text: JSON.stringify(doc) }];
    };
    expect(() =>
      assertJanuaryV2PresentationSource(
        changed((doc) => {
          doc.payload.approaches[0]!.tradeOffs[0]!.polarity = "cost";
        }),
      ),
    ).toThrow(/marker semantic witness mismatch/u);
    expect(() =>
      assertJanuaryV2PresentationSource(
        changed((doc) => {
          doc.payload.approaches.pop();
        }),
      ),
    ).toThrow(/exactly 4 entries/u);
    expect(() =>
      assertJanuaryV2PresentationSource(
        changed((doc) => {
          doc.payload.strings["january.v2.approach.help.gain"] = "Успех 90%";
        }),
      ),
    ).toThrow(/preview wording limits/u);
    expect(() =>
      assertJanuaryV2PresentationSource(
        changed((doc) => {
          doc.payload.strings["january.v2.approach.help.gain"] = "Поможет наставник";
        }),
      ),
    ).toThrow(/preview wording limits/u);
    expect(() =>
      assertJanuaryV2PresentationSource(
        changed((doc) => {
          doc.payload.situation.titleKey = "january.v2.no.such.key";
        }),
      ),
    ).toThrow(/unknown localization key/u);
    expect(() =>
      assertJanuaryV2PresentationSource(
        changed((doc) => {
          doc.payload.listings[0]!.eventType = "future-error";
        }),
      ),
    ).toThrow(/listing metadata mismatch/u);
    expect(() =>
      assertJanuaryV2PresentationSource(
        changed((doc) => {
          doc.payload.extra = true;
        }),
      ),
    ).toThrow(/closed field set/u);
    expect(() => assertJanuaryV2PresentationSource([{ ...original, text: "{invalid" }])).toThrow(
      /generic compilation/u,
    );
  });

  it("refuses to publish a mutated v2 source and leaves both bundles untouched", async () => {
    const repositoryRoot = await mkdtemp(join(tmpdir(), "runtime-human-v2-content-"));
    const legacyConfig = {
      sourceRoots: ["content/legacy"],
      outputRoot: "apps/desktop/public/content",
    } as const;
    const additionalConfig = {
      sourceRoots: ["content/january-v2"],
      outputRoot: "apps/desktop/public/content-v2",
    } as const;
    const legacySource = join(repositoryRoot, "content/legacy/source.jsonc");
    const v2Path = join(repositoryRoot, JANUARY_V2_PRESENTATION_SOURCE_PATH);
    const legacyManifest = join(repositoryRoot, legacyConfig.outputRoot, "manifest.json");
    const v2Manifest = join(repositoryRoot, additionalConfig.outputRoot, "manifest.json");
    const v2Source = await readFile(JANUARY_V2_PRESENTATION_SOURCE_PATH, "utf8");
    try {
      await mkdir(join(repositoryRoot, "content/legacy"), { recursive: true });
      await mkdir(join(repositoryRoot, "content/january-v2/presentation"), { recursive: true });
      await writeFile(legacySource, V2_PRESENTATION_PROBE.text, "utf8");
      await writeFile(v2Path, v2Source, "utf8");
      const runV2 = () =>
        runJanuaryV2ContentBuild({
          repositoryRoot,
          legacyConfig,
          additionalConfig,
          mode: "write",
        });
      await expect(runV2()).rejects.toThrow(/legacy published artifacts are outdated/u);
      expect(
        await runContentBuild({ repositoryRoot, config: legacyConfig, mode: "write" }),
      ).toMatchObject({ kind: "written" });
      const legacyBytes = await readFile(legacyManifest, "utf8");
      expect(await runV2()).toMatchObject({ kind: "written" });
      const originalV2Bytes = await readFile(v2Manifest, "utf8");

      const mutated = parseJsonc(v2Source) as {
        payload: { strings: Record<string, string> };
      };
      mutated.payload.strings["january.v2.approach.help.cost"] = "Навык Debugging";
      await writeFile(v2Path, JSON.stringify(mutated), "utf8");
      await expect(runV2()).rejects.toThrow(/preview wording limits/u);
      expect(await readFile(legacyManifest, "utf8")).toBe(legacyBytes);
      expect(await readFile(v2Manifest, "utf8")).toBe(originalV2Bytes);
    } finally {
      await rm(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("proves a new domain preserves v1 chunk bytes but changes a combined manifest", async () => {
    const legacy = await legacyFiles();
    const baseline = bundle(legacy);
    const augmented = bundle([...legacy, V2_PRESENTATION_PROBE]);
    const inspection = inspectProtectedContentChunks(baseline, augmented, PROTECTED_CHUNKS);

    expect(inspection.drifts).toEqual([]);
    expect(inspection.protectedChunksPreserved).toBe(true);
    expect(inspection.manifestFingerprintChanged).toBe(true);
    expect(augmented.manifest.chunks.map((chunk) => chunk.chunkId)).toEqual([
      ...PROTECTED_CHUNKS,
      "1990s/programming-v2",
    ]);
    expect(augmented.manifest.contentFingerprint).not.toBe(LEGACY_MANIFEST_FINGERPRINT);

    // Only a separate compilation can retain the deployed January v1 manifest.
    const separateV2 = bundle([V2_PRESENTATION_PROBE]);
    expect(separateV2.manifest.chunks.map((chunk) => chunk.chunkId)).toEqual([
      "1990s/programming-v2",
    ]);
    expect(bundle(legacy).manifest.contentFingerprint).toBe(LEGACY_MANIFEST_FINGERPRINT);
  });

  it("fails closed when the protected programming chunk changes", async () => {
    const legacy = await legacyFiles();
    const changed = legacy.map((file) =>
      file.path.endsWith("/situations/first-bug.jsonc")
        ? {
            ...file,
            text: file.text.replace(
              "First bug professional situation",
              "Modified January bug situation",
            ),
          }
        : file,
    );
    const inspection = inspectProtectedContentChunks(
      bundle(legacy),
      bundle(changed),
      PROTECTED_CHUNKS,
    );
    expect(inspection).toEqual({
      manifestFingerprintChanged: true,
      protectedChunksPreserved: false,
      drifts: [{ chunkId: "1990s/programming", reason: "bytes-changed" }],
    });
  });

  it("rejects attempts to add v2 content to the existing programming chunk", async () => {
    const legacy = await legacyFiles();
    const baseline = bundle(legacy);
    const wrongDomain: ContentSourceFile = {
      ...V2_PRESENTATION_PROBE,
      text: V2_PRESENTATION_PROBE.text.replace('"programming-v2"', '"programming"'),
    };
    const candidate = bundle([...legacy, wrongDomain]);
    const inspection = inspectProtectedContentChunks(baseline, candidate, PROTECTED_CHUNKS);
    expect(inspection.protectedChunksPreserved).toBe(false);
    expect(inspection.drifts).toContainEqual({
      chunkId: "1990s/programming",
      reason: "bytes-changed",
    });
  });
});
