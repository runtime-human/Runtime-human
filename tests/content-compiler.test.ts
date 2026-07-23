import { describe, expect, it } from "vitest";

import { compileContentSources, type ContentSourceFile } from "@runtime-human/game-content-compiler";

function source(path: string, value: unknown, comment?: string): ContentSourceFile {
  const json = JSON.stringify(value, null, 2);
  return {
    path,
    text: comment === undefined ? json : `// ${comment}\n${json}`,
  };
}

function technology(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "content-source-v1",
    id: "technology.qbasic",
    kind: "technology",
    domain: "programming",
    era: "1980s",
    availableFrom: "1985-01",
    entryPoint: false,
    references: [],
    provenance: [
      {
        sourceId: "manual.qbasic",
        title: "QBasic historical reference",
        locator: "chapter-1",
      },
    ],
    payload: {
      language: "BASIC",
      environment: "DOS",
    },
    ...overrides,
  };
}

function firstProgram(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "content-source-v1",
    id: "storylet.first-program",
    kind: "storylet",
    domain: "programming",
    era: "1990s",
    availableFrom: "1990-01",
    entryPoint: true,
    references: ["technology.qbasic"],
    provenance: [
      {
        sourceId: "design.first-program",
        title: "First program design source",
      },
    ],
    payload: {
      title: "Первая программа",
      choices: ["independent", "guided"],
    },
    ...overrides,
  };
}

function laterEvent(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "content-source-v1",
    id: "event.open-source-era",
    kind: "event",
    domain: "ecosystem",
    era: "2000s",
    availableFrom: "2001-01",
    entryPoint: true,
    references: [],
    provenance: [
      {
        sourceId: "history.open-source",
        title: "Open-source ecosystem timeline",
      },
    ],
    payload: {
      topic: "open-source",
    },
    ...overrides,
  };
}

describe("deterministic content compiler", () => {
  it("compiles JSONC into byte-identical sorted manifest and lazy chunks", () => {
    const files = [
      source("content/2000s/event.jsonc", laterEvent(), "later era"),
      source("content/1990s/storylet.jsonc", firstProgram(), "first playable storylet"),
      source("content/1980s/technology.jsonc", technology(), "technology dependency"),
    ];

    const first = compileContentSources(files);
    const reversed = compileContentSources([...files].reverse());

    expect(first.kind).toBe("success");
    expect(reversed).toEqual(first);
    if (first.kind !== "success") throw new Error("expected successful compilation");

    expect(first.bundle.manifest.entryPointIds).toEqual([
      "event.open-source-era",
      "storylet.first-program",
    ]);
    expect(first.bundle.manifest.chunks.map((chunk) => chunk.chunkId)).toEqual([
      "1980s/programming",
      "1990s/programming",
      "2000s/ecosystem",
    ]);
    expect(
      first.bundle.chunks.find((chunk) => chunk.chunkId === "1990s/programming")?.entries,
    ).toHaveLength(1);
    expect(
      first.bundle.chunks.find((chunk) => chunk.chunkId === "1990s/programming")?.entries[0]?.id,
    ).toBe("storylet.first-program");
    expect(first.bundle.artifacts.map((artifact) => artifact.path)).toEqual([
      "chunks/1980s/programming.json",
      "chunks/1990s/programming.json",
      "chunks/2000s/ecosystem.json",
      "manifest.json",
    ]);
    expect(first.bundle.artifacts.every((artifact) => artifact.json.endsWith("\n"))).toBe(true);
  });

  it("reports JSON Schema failures with source path and coordinates", () => {
    const result = compileContentSources([
      source("content/invalid.jsonc", firstProgram({ provenance: [] })),
    ]);

    expect(result.kind).toBe("failure");
    if (result.kind !== "failure") throw new Error("expected failed compilation");
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      code: "SCHEMA_INVALID",
      path: "content/invalid.jsonc",
      contentId: "storylet.first-program",
    });
    expect(result.diagnostics[0]?.line).toBeGreaterThan(1);
    expect(result.diagnostics[0]?.column).toBeGreaterThan(0);
  });

  it("rejects duplicate IDs deterministically", () => {
    const result = compileContentSources([
      source("content/a.jsonc", technology()),
      source("content/b.jsonc", technology({ payload: { language: "BASIC-2" } })),
    ]);

    expect(result).toMatchObject({
      kind: "failure",
      diagnostics: [
        {
          code: "DUPLICATE_ID",
          path: "content/b.jsonc",
          contentId: "technology.qbasic",
        },
      ],
    });
  });

  it("rejects missing references", () => {
    const result = compileContentSources([
      source(
        "content/storylet.jsonc",
        firstProgram({ references: ["technology.missing"] }),
      ),
    ]);

    expect(result).toMatchObject({
      kind: "failure",
      diagnostics: [
        {
          code: "MISSING_REFERENCE",
          contentId: "storylet.first-program",
        },
      ],
    });
  });

  it("rejects references to content unavailable at the source start month", () => {
    const result = compileContentSources([
      source("content/technology.jsonc", technology({ availableFrom: "1991-01" })),
      source("content/storylet.jsonc", firstProgram()),
    ]);

    expect(result).toMatchObject({
      kind: "failure",
      diagnostics: [
        {
          code: "CHRONOLOGY_INVALID",
          contentId: "storylet.first-program",
        },
      ],
    });
  });

  it("rejects content unreachable from any entry point", () => {
    const result = compileContentSources([
      source("content/entry.jsonc", laterEvent()),
      source("content/orphan.jsonc", technology()),
    ]);

    expect(result).toMatchObject({
      kind: "failure",
      diagnostics: [
        {
          code: "UNREACHABLE_CONTENT",
          contentId: "technology.qbasic",
        },
      ],
    });
  });

  it("changes the global fingerprint when authoritative content changes", () => {
    const first = compileContentSources([
      source("content/technology.jsonc", technology()),
      source("content/storylet.jsonc", firstProgram()),
    ]);
    const changed = compileContentSources([
      source("content/technology.jsonc", technology()),
      source(
        "content/storylet.jsonc",
        firstProgram({ payload: { title: "Изменённая программа" } }),
      ),
    ]);

    expect(first.kind).toBe("success");
    expect(changed.kind).toBe("success");
    if (first.kind !== "success" || changed.kind !== "success") {
      throw new Error("expected successful compilation");
    }
    expect(changed.bundle.manifest.contentFingerprint).not.toBe(
      first.bundle.manifest.contentFingerprint,
    );
  });
});
