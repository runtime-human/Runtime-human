import { describe, expect, it } from "vitest";

import {
  compileContentSources,
  loadContentSourceFiles,
} from "@runtime-human/game-content-compiler";

const JANUARY_SOURCE_ROOTS = [
  "content/sources/technology",
  "content/1990s/programming",
  "content/1990s/ecosystem",
] as const;

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

async function compileJanuaryContent() {
  const sources = await loadContentSourceFiles({
    repositoryRoot: process.cwd(),
    sourceRoots: JANUARY_SOURCE_ROOTS,
  });
  const result = compileContentSources(sources);
  if (result.kind === "failure") {
    throw new Error(`Expected valid January content:\n${JSON.stringify(result.diagnostics, null, 2)}`);
  }
  return result.bundle;
}

describe("January 1990 content registry", () => {
  it("compiles the exact reachable registry into programming and ecosystem chunks", async () => {
    const bundle = await compileJanuaryContent();

    expect(bundle.manifest.chunks.map((chunk) => chunk.chunkId)).toEqual([
      "1990s/ecosystem",
      "1990s/programming",
    ]);
    expect(bundle.chunks.flatMap((chunk) => chunk.entries.map((entry) => entry.id))).toEqual(
      JANUARY_CONTENT_IDS,
    );
    expect(bundle.manifest.entryPointIds).toEqual(["core.event.access-window"]);

    for (const chunk of bundle.chunks) {
      for (const entry of chunk.entries) {
        expect(entry.provenance.length, entry.id).toBeGreaterThan(0);
      }
    }
  });
});
