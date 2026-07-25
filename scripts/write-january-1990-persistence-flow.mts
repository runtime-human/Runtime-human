import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { generateJanuary1990PersistenceFlowFixture } from "../tests/helpers/january-1990-persistence-flow";

const outputPath = join(
  process.cwd(),
  "fixtures",
  "persistence",
  "january-1990-persistence-flow-v1.json",
);
const fixture = await generateJanuary1990PersistenceFlowFixture();
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
console.log(`Wrote ${outputPath}`);
