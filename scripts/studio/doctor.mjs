import { spawnSync } from "node:child_process";

const strict = process.argv.includes("--strict");
const rows = [];

function probe(name, command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
    timeout: 15000,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim().split(/\r?\n/)[0] ?? "";
  const ok = result.status === 0;
  rows.push({ name, ok, detail: output || (result.error?.message ?? `exit ${result.status}`) });
  return ok;
}

const configOk = probe("studio config", process.execPath, ["scripts/studio/check-config.mjs"]);
probe("git", "git", ["--version"]);
probe("pnpm", "pnpm", ["--version"]);
probe("codex", "codex", ["--version"]);
probe("opencode", "opencode", ["--version"]);
probe("orca runtime", "orca", ["status", "--json"]);

const branch = spawnSync("git", ["branch", "--show-current"], { encoding: "utf8", shell: process.platform === "win32" });
if (branch.status === 0) rows.push({ name: "git branch", ok: true, detail: branch.stdout.trim() || "detached" });

for (const row of rows) {
  console.log(`${row.ok ? "OK  " : "WARN"} ${row.name}: ${row.detail}`);
}

if (!configOk || (strict && rows.some((row) => !row.ok))) process.exit(1);
