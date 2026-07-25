/** @vitest-environment node */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import { generateJanuary1990BalanceTrace } from "./helpers/january-1990-balance-trace";
import { generateJanuary1990PersistenceFlowFixture } from "./helpers/january-1990-persistence-flow";

const enabled = process.env.RUNTIME_HUMAN_MATERIALIZE_JANUARY_E2 === "1";
const materialize = enabled ? describe : describe.skip;

materialize("materialize January E2 evidence", () => {
  it("writes the bounded balance trace and production persistence flow", async () => {
    const outputs = [
      {
        path: join(
          process.cwd(),
          "fixtures",
          "balance",
          "january-1990-bounded-trace-v1.json",
        ),
        value: await generateJanuary1990BalanceTrace({ seedStart: 1, seedEnd: 64 }),
      },
      {
        path: join(
          process.cwd(),
          "fixtures",
          "persistence",
          "january-1990-persistence-flow-v1.json",
        ),
        value: await generateJanuary1990PersistenceFlowFixture(),
      },
    ] as const;

    for (const output of outputs) {
      await mkdir(dirname(output.path), { recursive: true });
      await writeFile(output.path, `${JSON.stringify(output.value, null, 2)}\n`, "utf8");
    }

    expect(outputs.map((output) => output.path)).toHaveLength(2);
  });
});
