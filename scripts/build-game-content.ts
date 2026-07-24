import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  formatContentDiagnostics,
  parseContentBuildConfig,
  runContentBuild,
  type ContentBuildMode,
} from "@runtime-human/game-content-compiler";

const USAGE =
  "Usage: tsx scripts/build-game-content.ts (--write|--check) --config <relative-config.json>";

type CliOptions = Readonly<{
  mode: ContentBuildMode;
  configPath: string;
}>;

async function main(): Promise<number> {
  try {
    const options = parseArguments(process.argv.slice(2));
    const repositoryRoot = process.cwd();
    const configValue = JSON.parse(
      await readFile(resolve(repositoryRoot, ...options.configPath.split("/")), "utf8"),
    ) as unknown;
    const config = parseContentBuildConfig(configValue);
    const result = await runContentBuild({ repositoryRoot, config, mode: options.mode });

    switch (result.kind) {
      case "written":
        console.log(`Wrote ${result.artifactCount} compiled content artifacts.`);
        return 0;
      case "current":
        console.log(`Compiled content is current (${result.artifactCount} artifacts).`);
        return 0;
      case "outdated":
        for (const difference of result.differences) console.error(difference);
        return 1;
      case "content-invalid":
        for (const diagnostic of formatContentDiagnostics(result.diagnostics)) {
          console.error(diagnostic);
        }
        return 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Unknown content build error");
    console.error(USAGE);
    return 1;
  }
}

function parseArguments(arguments_: readonly string[]): CliOptions {
  let mode: ContentBuildMode | undefined;
  let configPath: string | undefined;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--write" || argument === "--check") {
      if (mode !== undefined) throw new TypeError("Choose exactly one of --write or --check");
      mode = argument.slice(2) as ContentBuildMode;
      continue;
    }

    if (argument === "--config") {
      const value = arguments_[index + 1];
      if (value === undefined) throw new TypeError("--config requires a relative path");
      configPath = requireNormalizedRelativePath(value);
      index += 1;
      continue;
    }

    throw new TypeError(`Unknown content build argument ${JSON.stringify(argument)}`);
  }

  if (mode === undefined || configPath === undefined) throw new TypeError(USAGE);
  return { mode, configPath };
}

function requireNormalizedRelativePath(path: string): string {
  if (
    path.length === 0 ||
    path.includes("\\") ||
    path.startsWith("/") ||
    /^[A-Za-z]:/u.test(path) ||
    path.split("/").some((segment) => segment.length === 0 || segment === "." || segment === "..")
  ) {
    throw new TypeError("Content build config path must be a normalized relative path");
  }
  return path;
}

process.exitCode = await main();
