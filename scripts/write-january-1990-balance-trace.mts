import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { generateJanuary1990BalanceTrace } from "../tests/helpers/january-1990-balance-trace";

const outputPath = join(
  process.cwd(),
  "fixtures",
  "balance",
  "january-1990-bounded-trace-v1.json",
);
const trace = await generateJanuary1990BalanceTrace({ seedStart: 1, seedEnd: 64 });
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(trace, null, 2)}\n`, "utf8");
console.log(`Wrote ${outputPath}`);
