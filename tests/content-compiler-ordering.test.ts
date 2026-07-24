import { describe, expect, it } from "vitest";

import { compileContentSources } from "@runtime-human/game-content-compiler";

describe("compiled content ordering", () => {
  it("sorts provenance text by Unicode code point rather than UTF-16 code unit", () => {
    const lowerCodePoint = "\ue000";
    const higherCodePoint = "\u{10000}";
    const value = {
      schemaVersion: "content-source-v1",
      id: "storylet.entry",
      kind: "storylet",
      domain: "programming",
      era: "1990s",
      availableFrom: "1990-01",
      entryPoint: true,
      references: [],
      provenance: [
        { sourceId: "source.same", title: higherCodePoint },
        { sourceId: "source.same", title: lowerCodePoint },
      ],
      payload: { title: "Entry" },
    };

    const result = compileContentSources([
      { path: "content/entry.jsonc", text: JSON.stringify(value, null, 2) },
    ]);

    expect(result.kind).toBe("success");
    if (result.kind !== "success") throw new Error("expected successful compilation");
    expect(result.bundle.chunks[0]?.entries[0]?.provenance.map((item) => item.title)).toEqual([
      lowerCodePoint,
      higherCodePoint,
    ]);
  });
});
