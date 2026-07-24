import { describe, expect, it } from "vitest";

import {
  compileContentSources,
  type ContentSourceFile,
} from "@runtime-human/game-content-compiler";

function source(path: string, value: unknown): ContentSourceFile {
  return { path, text: JSON.stringify(value, null, 2) };
}

describe("content compiler chronology boundaries", () => {
  it("accepts an exact source and dependency availability interval", () => {
    const interval = {
      availableFrom: "1990-01",
      availableTo: "1991-12",
    } as const;
    const result = compileContentSources([
      source("content/dependency.jsonc", {
        schemaVersion: "content-source-v1",
        id: "technology.dependency",
        kind: "technology",
        domain: "programming",
        era: "1990s",
        ...interval,
        entryPoint: false,
        references: [],
        provenance: [{ sourceId: "manual.dependency", title: "Dependency manual" }],
        payload: { language: "BASIC" },
      }),
      source("content/entry.jsonc", {
        schemaVersion: "content-source-v1",
        id: "storylet.entry",
        kind: "storylet",
        domain: "programming",
        era: "1990s",
        ...interval,
        entryPoint: true,
        references: ["technology.dependency"],
        provenance: [{ sourceId: "design.entry", title: "Entry design" }],
        payload: { title: "Entry" },
      }),
    ]);

    expect(result.kind).toBe("success");
  });
});
