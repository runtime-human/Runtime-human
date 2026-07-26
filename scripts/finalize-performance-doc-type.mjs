#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const filePath = join(process.cwd(), "scripts", "build-toc.mjs");
const source = await readFile(filePath, "utf8");
const needle = '  persistence: "engine",\n';
if (!source.includes(needle)) throw new Error("Documentation type map anchor changed");
if (source.includes('  performance: "engine",\n')) {
  throw new Error("Performance documentation type is already registered");
}
await writeFile(
  filePath,
  source.replace(needle, `${needle}  performance: "engine",\n`),
  "utf8",
);
