import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  compileContentSources,
  type ContentSourceFile,
} from "@runtime-human/game-content-compiler";

const fixtureRoot = join(process.cwd(), "tests", "fixtures", "content-compiler");
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

function readExpectedArtifact(path: string): string {
  const normalized = readFileSync(join(expectedRoot, `${path}.txt`), "utf8").replaceAll(
    "\r\n",
    "\n",
  );
  if (normalized.includes("\r")) {
    throw new Error(`Expected fixture ${path} contains an unsupported carriage return`);
  }
  return normalized;
}

function requireBundle(result: ReturnType<typeof compileContentSources>) {
  if (result.kind === "failure") {
    throw new Error(
      `Expected successful compilation:\n${JSON.stringify(result.diagnostics, null, 2)}`,
    );
  }
  return result.bundle;
}

describe("compiled content byte contract", () => {
  it("matches checked-in manifest and chunk bytes independent of source order", () => {
    const sources = readSources();
    const bundle = requireBundle(compileContentSources(sources));
    const reversedBundle = requireBundle(compileContentSources([...sources].reverse()));

    expect(reversedBundle).toEqual(bundle);
    expect(bundle.artifacts.map((artifact) => artifact.path)).toEqual([
      "chunks/1980s/programming.json",
      "chunks/1990s/programming.json",
      "chunks/2000s/ecosystem.json",
      "manifest.json",
    ]);

    for (const artifact of bundle.artifacts) {
      expect(artifact.json).not.toContain("\r");
      expect(artifact.json).toBe(readExpectedArtifact(artifact.path));
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

    const baseline = requireBundle(compileContentSources(sources));
    const changed = requireBundle(compileContentSources(changedSources));
    const baselineArtifacts = new Map(
      baseline.artifacts.map((artifact) => [artifact.path, artifact.json]),
    );
    const changedArtifacts = new Map(
      changed.artifacts.map((artifact) => [artifact.path, artifact.json]),
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
    expect(changedArtifacts.get("manifest.json")).not.toBe(baselineArtifacts.get("manifest.json"));
  });
});
