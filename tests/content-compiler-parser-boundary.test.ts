import { describe, expect, it } from "vitest";

import { compileContentSources } from "@runtime-human/game-content-compiler";

function entry(payload: unknown): Record<string, unknown> {
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
    payload,
  };
}

function nestedPayload(depth: number): string {
  return `${'{"next":'.repeat(depth)}null${"}".repeat(depth)}`;
}

describe("content compiler parser boundary", () => {
  it("rejects duplicate JSONC object properties", () => {
    const text = JSON.stringify(entry({ title: "Entry" }), null, 2).replace(
      "{",
      '{\n  "id": "storylet.shadow",',
    );

    expect(compileContentSources([{ path: "content/duplicate.jsonc", text }])).toMatchObject({
      kind: "failure",
      diagnostics: [
        {
          code: "JSONC_PARSE",
          path: "content/duplicate.jsonc",
        },
      ],
    });
  });

  it("returns a diagnostic for authoritative negative zero instead of throwing", () => {
    const text = JSON.stringify(entry({ value: 0 }), null, 2).replace('"value": 0', '"value": -0');

    expect(compileContentSources([{ path: "content/negative-zero.jsonc", text }])).toMatchObject({
      kind: "failure",
      diagnostics: [
        {
          code: "SCHEMA_INVALID",
          path: "content/negative-zero.jsonc",
        },
      ],
    });
  });

  it("returns a diagnostic for a lone Unicode surrogate instead of throwing", () => {
    const text = JSON.stringify(entry({ value: "PLACEHOLDER" }), null, 2).replace(
      '"PLACEHOLDER"',
      '"\\ud800"',
    );

    expect(compileContentSources([{ path: "content/unicode.jsonc", text }])).toMatchObject({
      kind: "failure",
      diagnostics: [
        {
          code: "SCHEMA_INVALID",
          path: "content/unicode.jsonc",
        },
      ],
    });
  });

  it("reserves canonical depth for the compiled chunk envelope", () => {
    const acceptedText = JSON.stringify(entry(null), null, 2).replace("null", nestedPayload(60));
    expect(
      compileContentSources([{ path: "content/max-depth.jsonc", text: acceptedText }]).kind,
    ).toBe("success");

    const rejectedText = JSON.stringify(entry(null), null, 2).replace("null", nestedPayload(61));
    expect(
      compileContentSources([{ path: "content/too-deep.jsonc", text: rejectedText }]),
    ).toMatchObject({
      kind: "failure",
      diagnostics: [
        {
          code: "SCHEMA_INVALID",
          path: "content/too-deep.jsonc",
        },
      ],
    });
  });
});
