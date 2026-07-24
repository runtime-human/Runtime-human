import { describe, expect, it } from "vitest";

import {
  CONTENT_COMPILER_VERSION,
  CONTENT_SOURCE_SCHEMA_V1,
  compileContentSources,
  type ContentDiagnostic,
  type ContentSourceFile,
} from "@runtime-human/game-content-compiler";

function source(path: string, value: unknown): ContentSourceFile {
  return { path, text: JSON.stringify(value, null, 2) };
}

function entry(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "content-source-v1",
    id: "storylet.entry",
    kind: "storylet",
    domain: "programming",
    era: "1990s",
    availableFrom: "1990-01",
    entryPoint: true,
    references: [],
    provenance: [{ sourceId: "design.entry", title: "Entry design" }],
    payload: { title: "Entry" },
    ...overrides,
  };
}

function dependency(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "content-source-v1",
    id: "technology.dependency",
    kind: "technology",
    domain: "programming",
    era: "1980s",
    availableFrom: "1985-01",
    entryPoint: false,
    references: [],
    provenance: [{ sourceId: "manual.dependency", title: "Dependency manual" }],
    payload: { language: "BASIC" },
    ...overrides,
  };
}

function expectDiagnostic(
  result: ReturnType<typeof compileContentSources>,
  diagnostic: Partial<ContentDiagnostic>,
): void {
  expect(result.kind).toBe("failure");
  if (result.kind !== "failure") throw new Error("expected failed compilation");
  expect(result.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining(diagnostic)]));
}

describe("content compiler invariants", () => {
  it("exports its versioned public compiler surface", () => {
    expect(CONTENT_COMPILER_VERSION).toBe("content-compiler-v1");
    expect(CONTENT_SOURCE_SCHEMA_V1).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      additionalProperties: false,
    });
    expect(typeof compileContentSources).toBe("function");
  });

  it("rejects a valid graph without an entry point", () => {
    expect(compileContentSources([source("content/dependency.jsonc", dependency())])).toMatchObject(
      {
        kind: "failure",
        diagnostics: [
          {
            code: "NO_ENTRY_POINT",
            path: "<content-set>",
            line: 1,
            column: 1,
          },
        ],
      },
    );
  });

  it("rejects an empty content set", () => {
    expect(compileContentSources([])).toMatchObject({
      kind: "failure",
      diagnostics: [{ code: "NO_ENTRY_POINT", path: "<content-set>" }],
    });
  });

  it("rejects a reference whose target does not cover the full source window", () => {
    const result = compileContentSources([
      source("content/dependency.jsonc", dependency({ availableTo: "1991-12" })),
      source(
        "content/entry.jsonc",
        entry({
          availableTo: "1992-12",
          references: ["technology.dependency"],
        }),
      ),
    ]);

    expect(result).toMatchObject({
      kind: "failure",
      diagnostics: [
        {
          code: "CHRONOLOGY_INVALID",
          contentId: "storylet.entry",
        },
      ],
    });
  });

  it("rejects an open-ended source that requires a finite target", () => {
    const result = compileContentSources([
      source("content/dependency.jsonc", dependency({ availableTo: "1991-12" })),
      source("content/entry.jsonc", entry({ references: ["technology.dependency"] })),
    ]);

    expect(result).toMatchObject({
      kind: "failure",
      diagnostics: [{ code: "CHRONOLOGY_INVALID" }],
    });
  });

  it("reports malformed JSONC without throwing", () => {
    expectDiagnostic(compileContentSources([{ path: "content/broken.jsonc", text: "{ broken" }]), {
      code: "JSONC_PARSE",
      path: "content/broken.jsonc",
    });
  });

  it("rejects an empty JSONC document", () => {
    expect(compileContentSources([{ path: "content/empty.jsonc", text: "  \r\n" }])).toMatchObject({
      kind: "failure",
      diagnostics: [{ code: "JSONC_PARSE", path: "content/empty.jsonc" }],
    });
  });

  it("rejects trailing commas", () => {
    const json = JSON.stringify(entry(), null, 2);
    const text = `${json.slice(0, -1)},\n}`;
    expectDiagnostic(compileContentSources([{ path: "content/trailing.jsonc", text }]), {
      code: "JSONC_PARSE",
      path: "content/trailing.jsonc",
    });
  });

  it("rejects duplicate normalized paths", () => {
    expect(
      compileContentSources([
        source("content/entry.jsonc", entry()),
        source("content\\entry.jsonc", entry({ id: "storylet.second" })),
      ]),
    ).toMatchObject({
      kind: "failure",
      diagnostics: [{ code: "DUPLICATE_PATH" }],
    });
  });

  it("rejects non-normalized, traversal and absolute paths", () => {
    for (const path of [
      "../escape.jsonc",
      "/content.jsonc",
      "C:/content.jsonc",
      "content//entry.jsonc",
      "content/./entry.jsonc",
      "content/../entry.jsonc",
    ]) {
      expect(compileContentSources([source(path, entry())])).toMatchObject({
        kind: "failure",
        diagnostics: [{ code: "INVALID_PATH", path }],
      });
    }
  });

  it("rejects a reversed availability interval", () => {
    expect(
      compileContentSources([
        source("content/entry.jsonc", entry({ availableFrom: "1991-01", availableTo: "1990-12" })),
      ]),
    ).toMatchObject({
      kind: "failure",
      diagnostics: [{ code: "CHRONOLOGY_INVALID", contentId: "storylet.entry" }],
    });
  });

  it("accepts a reachable reference cycle", () => {
    const result = compileContentSources([
      source(
        "content/a.jsonc",
        dependency({
          id: "technology.a",
          entryPoint: true,
          references: ["technology.b"],
        }),
      ),
      source("content/b.jsonc", dependency({ id: "technology.b", references: ["technology.a"] })),
    ]);

    expect(result.kind).toBe("success");
  });

  it("emits identical artifacts for comments and Windows path separators", () => {
    const value = entry();
    const canonical = compileContentSources([source("content/entry.jsonc", value)]);
    const commented = compileContentSources([
      {
        path: "content\\entry.jsonc",
        text: `// equivalent author comment\r\n${JSON.stringify(value, null, 2)}\r\n`,
      },
    ]);

    expect(canonical.kind).toBe("success");
    expect(commented).toEqual(canonical);
  });

  it("rejects non-integer and unsafe authoritative numbers", () => {
    for (const value of [1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expectDiagnostic(
        compileContentSources([source("content/entry.jsonc", entry({ payload: { value } }))]),
        { code: "SCHEMA_INVALID", path: "content/entry.jsonc" },
      );
    }
  });
});
