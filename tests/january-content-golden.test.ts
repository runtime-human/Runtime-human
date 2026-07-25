import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  compileContentSources,
  loadContentSourceFiles,
  type ContentSourceFile,
} from "@runtime-human/game-content-compiler";

const JANUARY_SOURCE_ROOTS = [
  "content/sources/technology",
  "content/1990s/programming",
  "content/1990s/ecosystem",
] as const;
const GENERATED_ROOT = join(process.cwd(), "apps", "desktop", "public", "content");

const JANUARY_CONTENT_IDS = [
  "core.activity.first-listing",
  "core.activity.modify-listing",
  "core.ecosystem-profile.offline-manuals",
  "core.event.access-window",
  "core.event.logic-error",
  "core.event.manual-found",
  "core.event.program-runs",
  "core.event.syntax-error",
  "core.local-tech-availability.home-pc",
  "core.local-tech-availability.shared-school-pc",
  "core.platform.dos-pc",
  "core.project-archetype.personal-utility",
  "core.situation-kernel.first-bug",
  "core.skill.debugging",
  "core.skill.problem-decomposition",
  "core.skill.program-reading",
  "core.skill.program-writing",
  "core.skill.tool-use",
  "core.tech-band.gw-basic-dos-1990",
  "core.tech-family.basic",
  "core.technology.gw-basic",
  "core.toolchain.gw-basic-interpreter",
  "core.work-package.input-output",
  "core.work-package.validation-fix",
] as const;

async function loadJanuarySources(): Promise<readonly ContentSourceFile[]> {
  return loadContentSourceFiles({
    repositoryRoot: process.cwd(),
    sourceRoots: JANUARY_SOURCE_ROOTS,
  });
}

function requireBundle(sources: readonly ContentSourceFile[]) {
  const result = compileContentSources(sources);
  if (result.kind === "failure") {
    throw new Error(
      `Expected valid January content:\n${JSON.stringify(result.diagnostics, null, 2)}`,
    );
  }
  return result.bundle;
}

describe("January 1990 content registry", () => {
  it("compiles the exact reachable registry into programming and ecosystem chunks", async () => {
    const bundle = requireBundle(await loadJanuarySources());

    expect(bundle.manifest.chunks.map((chunk) => chunk.chunkId)).toEqual([
      "1990s/ecosystem",
      "1990s/programming",
    ]);
    expect(
      bundle.chunks.flatMap((chunk) => chunk.entries.map((entry) => entry.id)).toSorted(),
    ).toEqual(JANUARY_CONTENT_IDS);
    expect(bundle.manifest.entryPointIds).toEqual(["core.event.access-window"]);

    for (const chunk of bundle.chunks) {
      for (const entry of chunk.entries) {
        expect(entry.provenance.length, entry.id).toBeGreaterThan(0);
      }
    }
  });

  it("matches committed artifact bytes independent of source order and comments", async () => {
    const sources = await loadJanuarySources();
    const bundle = requireBundle(sources);
    const reversed = requireBundle([...sources].reverse());
    const commented = requireBundle(
      sources.map((source, index) =>
        index === 0 ? { ...source, text: `// authoring comment\n${source.text}` } : source,
      ),
    );

    expect(reversed).toEqual(bundle);
    expect(commented).toEqual(bundle);
    expect(bundle.artifacts.map((artifact) => artifact.path)).toEqual([
      "chunks/1990s/ecosystem.json",
      "chunks/1990s/programming.json",
      "manifest.json",
    ]);

    for (const artifact of bundle.artifacts) {
      await expect(readFile(join(GENERATED_ROOT, artifact.path), "utf8")).resolves.toBe(
        artifact.json,
      );
    }
  });
});
