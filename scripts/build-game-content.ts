import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  formatContentDiagnostics,
  parseContentBuildConfig,
  runContentBuild,
  type ContentBuildMode,
} from "@runtime-human/game-content-compiler";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = resolve(repositoryRoot, "content", "content.config.json");
const mode = parseMode(process.argv.slice(2));
const config = parseContentBuildConfig(JSON.parse(await readFile(configPath, "utf8")));
const result = await runContentBuild({ repositoryRoot, config, mode });

switch (result.kind) {
  case "written":
    console.log(`Wrote ${result.artifactCount} compiled content artifacts.`);
    break;
  case "current":
    console.log(`${result.artifactCount} compiled content artifacts are current.`);
    break;
  case "outdated":
    for (const difference of result.differences) console.error(difference);
    process.exitCode = 1;
    break;
  case "content-invalid":
    for (const diagnostic of formatContentDiagnostics(result.diagnostics)) {
      console.error(diagnostic);
    }
    process.exitCode = 1;
    break;
}

function parseMode(arguments_: readonly string[]): ContentBuildMode {
  if (arguments_.length === 0) return "write";
  if (arguments_.length === 1 && arguments_[0] === "--check") return "check";
  throw new TypeError("Usage: pnpm content:build | pnpm content:check");
}
