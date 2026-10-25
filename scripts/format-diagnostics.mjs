import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const paths = [
  "content/january-v2/presentation/january-1990.jsonc",
  "packages/game-content-compiler/src/january-v2-presentation-source.ts",
  "tests/january-v2-content-compatibility.test.ts",
];
const result = spawnSync("pnpm", ["exec", "oxfmt", ...paths], {
  shell: true,
  stdio: "inherit",
});
if (result.status !== 0) process.exit(result.status ?? 1);
for (const path of paths) {
  console.log("FORMAT_JSON=" + JSON.stringify({ path, content: readFileSync(path, "utf8") }));
}
// This diagnostic run MUST fail; it is not a verification pass.
process.exit(1);
