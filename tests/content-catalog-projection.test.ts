import { describe, expect, it } from "vitest";

import {
  projectContentCatalog,
  type ContentSourceFile,
} from "@runtime-human/game-content-compiler";

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

describe("content catalog projection", () => {
  it("projects valid content sets into id-sorted catalog entries with source paths", () => {
    const result = projectContentCatalog([
      source("content/technology.jsonc", technology()),
      source("content/storylet.jsonc", firstProgram(), "first playable storylet"),
    ]);

    expect(result.kind).toBe("success");
    if (result.kind !== "success") throw new Error("expected successful projection");
    expect(result.entries.map((entry) => entry.id)).toEqual([
      "storylet.first-program",
      "technology.qbasic",
    ]);

    const storylet = result.entries[0];
    expect(storylet?.sourcePath).toBe("content/storylet.jsonc");
    expect(storylet?.kind).toBe("storylet");
    expect(storylet?.domain).toBe("programming");
    expect(storylet?.era).toBe("1990s");
    expect(storylet?.availableFrom).toBe("1990-01");
    expect(storylet?.entryPoint).toBe(true);
    expect(storylet?.provenance).toEqual([
      { sourceId: "design.first-program", title: "First program design source" },
    ]);
    if (storylet === undefined) throw new Error("expected storylet entry");
    expect(Object.hasOwn(storylet, "availableTo")).toBe(false);

    const technologyEntry = result.entries[1];
    expect(technologyEntry?.sourcePath).toBe("content/technology.jsonc");
    expect(technologyEntry?.references).toEqual([]);
    if (technologyEntry === undefined) throw new Error("expected technology entry");
    expect(technologyEntry.provenance).toEqual([
      { sourceId: "manual.qbasic", title: "QBasic historical reference", locator: "chapter-1" },
    ]);
  });

  it("keeps availableTo only when declared and sorts references deterministically", () => {
    const result = projectContentCatalog([
      source(
        "content/technology-alpha.jsonc",
        technology({ id: "technology.alpha", entryPoint: true }),
      ),
      source(
        "content/technology-mike.jsonc",
        technology({ id: "technology.mike", availableTo: "1999-12" }),
      ),
      source("content/technology-zulu.jsonc", technology({ id: "technology.zulu" })),
      source(
        "content/storylet.jsonc",
        firstProgram({
          availableTo: "1995-01",
          references: ["technology.zulu", "technology.alpha", "technology.mike"],
        }),
      ),
    ]);

    expect(result.kind).toBe("success");
    if (result.kind !== "success") throw new Error("expected successful projection");

    const storylet = result.entries.find((entry) => entry.id === "storylet.first-program");
    expect(storylet?.references).toEqual([
      "technology.alpha",
      "technology.mike",
      "technology.zulu",
    ]);
    if (storylet === undefined) throw new Error("expected storylet entry");
    expect(Object.hasOwn(storylet, "availableTo")).toBe(true);

    const mike = result.entries.find((entry) => entry.id === "technology.mike");
    if (mike === undefined) throw new Error("expected technology.mike entry");
    expect(mike.availableTo).toBe("1999-12");

    const alpha = result.entries.find((entry) => entry.id === "technology.alpha");
    if (alpha === undefined) throw new Error("expected technology.alpha entry");
    expect(Object.hasOwn(alpha, "availableTo")).toBe(false);
  });

  it("fails with DUPLICATE_ID when two sources declare the same id", () => {
    const result = projectContentCatalog([
      source("content/a.jsonc", technology()),
      source("content/b.jsonc", technology({ payload: { language: "BASIC-2" } })),
    ]);

    expect(result.kind).toBe("failure");
    if (result.kind !== "failure") throw new Error("expected failed projection");
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      code: "DUPLICATE_ID",
      path: "content/b.jsonc",
      contentId: "technology.qbasic",
    });
  });

  it("fails with MISSING_REFERENCE when a reference has no target", () => {
    const result = projectContentCatalog([
      source("content/storylet.jsonc", firstProgram({ references: ["technology.missing"] })),
    ]);

    expect(result.kind).toBe("failure");
    if (result.kind !== "failure") throw new Error("expected failed projection");
    expect(result.diagnostics[0]).toMatchObject({
      code: "MISSING_REFERENCE",
      path: "content/storylet.jsonc",
      contentId: "storylet.first-program",
    });
  });

  it("fails with UNREACHABLE_CONTENT when content is not reachable from entry points", () => {
    const result = projectContentCatalog([
      source("content/entry.jsonc", firstProgram({ references: [] })),
      source("content/orphan.jsonc", technology()),
    ]);

    expect(result.kind).toBe("failure");
    if (result.kind !== "failure") throw new Error("expected failed projection");
    expect(result.diagnostics[0]).toMatchObject({
      code: "UNREACHABLE_CONTENT",
      contentId: "technology.qbasic",
    });
  });
});
