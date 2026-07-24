import { describe, expect, it } from "vitest";

import {
  compileContentSources,
  type ContentSourceFile,
} from "@runtime-human/game-content-compiler";

function source(id: string, entryPoint: boolean): ContentSourceFile {
  return {
    path: `content/${id}.jsonc`,
    text: JSON.stringify({
      schemaVersion: "content-source-v1",
      id,
      kind: "storylet",
      domain: "programming",
      era: "1990s",
      availableFrom: "1990-01",
      entryPoint,
      references: [],
      provenance: [{ sourceId: `design.${id}`, title: id }],
      payload: { values: Array.from({ length: 55_000 }, () => 0) },
    }),
  };
}

describe("compiled content aggregate boundary", () => {
  it("returns a content-set diagnostic when a valid chunk exceeds canonical limits", () => {
    const result = compileContentSources([
      source("storylet.large-a", true),
      source("storylet.large-b", true),
    ]);

    expect(result).toMatchObject({
      kind: "failure",
      diagnostics: [
        {
          code: "CONTENT_LIMIT_EXCEEDED",
          path: "<content-set>",
          line: 1,
          column: 1,
        },
      ],
    });
  });
});
