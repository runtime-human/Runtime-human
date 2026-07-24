import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  compileContentSources,
  type ContentSourceFile,
} from "@runtime-human/game-content-compiler";

const fixtureRoot = fileURLToPath(new URL("./fixtures/content-compiler/", import.meta.url));
const validRoot = join(fixtureRoot, "valid");
const expectedRoot = join(fixtureRoot, "expected");
const sourceNames = [
  "1980s-technology.jsonc",
  "1990s-storylet.jsonc",
  "2000s-event.jsonc",
] as const;

function readSources(): ContentSourceFile[] {
  return sourceNames.map((name) => ({
    path: `content/${name}`,
    text: readFileSync(join(validRoot, name), "utf8"),
  }));
}

describe("compiled content byte contract", () => {
  it("matches checked-in manifest and chunk bytes independent of source order", () => {
    const sources = readSources();
    const result = compileContentSources(sources);
    const reversed = compileContentSources([...sources].reverse());

    expect(result.kind).toBe("success");
    expect(reversed).toEqual(result);
    if (result.kind !== "success") throw new Error("expected successful compilation");

    expect(result.bundle.artifacts.map((artifact) => artifact.path)).toEqual([
      "chunks/1980s/programming.json",
      "chunks/1990s/programming.json",
      "chunks/2000s/ecosystem.json",
      "manifest.json",
    ]);

    for (const artifact of result.bundle.artifacts) {
      const expected = readFileSync(join(expectedRoot, `${artifact.path}.txt`), "utf8");
      expect(artifact.json).toBe(expected);
    }
  });

  it("changes only the owning chunk and manifest when one payload changes", () => {
    const sources = readSources();
    const changedSources = sources.map((source) =>
      source.path.endsWith("1990s-storylet.jsonc")
        ? {
            ...source,
            text: source.text.replace("Первая программа", "Изменённая программа"),
          }
        : source,
    );

    const baseline = compileContentSources(sources);
    const changed = compileContentSources(changedSources);

    expect(baseline.kind).toBe("success");
    expect(changed.kind).toBe("success");
    if (baseline.kind !== "success" || changed.kind !== "success") {
      throw new Error("expected successful compilation");
    }

    const baselineArtifacts = new Map(
      baseline.bundle.artifacts.map((artifact) => [artifact.path, artifact.json]),
    );
    const changedArtifacts = new Map(
      changed.bundle.artifacts.map((artifact) => [artifact.path, artifact.json]),
    );

    expect(changedArtifacts.get("chunks/1980s/programming.json")).toBe(
      baselineArtifacts.get("chunks/1980s/programming.json"),
    );
    expect(changedArtifacts.get("chunks/2000s/ecosystem.json")).toBe(
      baselineArtifacts.get("chunks/2000s/ecosystem.json"),
    );
    expect(changedArtifacts.get("chunks/1990s/programming.json")).not.toBe(
      baselineArtifacts.get("chunks/1990s/programming.json"),
    );
    expect(changedArtifacts.get("manifest.json")).not.toBe(
      baselineArtifacts.get("manifest.json"),
    );
  });
});
