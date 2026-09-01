import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { generateJanuary1990PersistenceFlowFixture } from "./helpers/january-1990-persistence-flow";

const FIXTURE_PATH = join(
  process.cwd(),
  "fixtures",
  "persistence",
  "january-1990-persistence-flow-v1.json",
);

describe("January 1990 production persistence flow fixture", () => {
  it("matches the commands emitted by the current TypeScript runtime", async () => {
    const generated = await generateJanuary1990PersistenceFlowFixture();
    const committed = JSON.parse(await readFile(FIXTURE_PATH, "utf8")) as unknown;

    expect(generated).toEqual(committed);
    expect(generated.boundaries.map((command) => command.status)).toEqual([
      "suspended",
      "suspended",
      "suspended",
      "completed",
    ]);
    expect(generated.expectations).toMatchObject({
      boundaryProgramCounters: [2, 4, 7, 9],
      finalSaveRevision: 1,
      finalRunStatus: "committed",
    });
  });
});
