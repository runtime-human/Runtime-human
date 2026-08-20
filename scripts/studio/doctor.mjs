import { spawnSync } from "node:child_process";

const strict = process.argv.includes("--strict");
const rows = [];

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
    timeout: 20000,
    maxBuffer: 2 * 1024 * 1024,
  });
  const text = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  return {
    ok: result.status === 0,
    text,
    detail: text.split(/\r?\n/)[0] || result.error?.message || `exit ${result.status}`,
  };
}

function probe(name, command, args) {
  const result = run(command, args);
  rows.push({ name, ok: result.ok, detail: result.detail });
  return result;
}

const config = probe("studio config", process.execPath, ["scripts/studio/check-config.mjs"]);
probe("git", "git", ["--version"]);
probe("pnpm", "pnpm", ["--version"]);
const codex = probe("codex", "codex", ["--version"]);
const opencode = probe("opencode", "opencode", ["--version"]);

if (codex.ok) {
  const version = codex.text.match(/(\d+)\.(\d+)\.(\d+)/)?.slice(1).map(Number);
  if (version) {
    const atLeast0145 = version[0] > 0 || version[1] > 145 || (version[1] === 145 && version[2] >= 0);
    rows.push({
      name: "codex startup-race baseline",
      ok: atLeast0145,
      detail: atLeast0145 ? "Codex >= 0.145.0" : "Update Codex to >= 0.145.0 before Orca-supervised Codex workers",
    });
  }
}

if (opencode.ok) {
  const modelList = run("opencode", ["models", "opencode-go"]);
  const requiredModels = ["deepseek-v4-flash", "deepseek-v4-pro", "glm-5.3", "mimo-v2.5"];
  const missing = requiredModels.filter((model) => !modelList.text.toLowerCase().includes(model));
  rows.push({
    name: "OpenCode Go model routing",
    ok: modelList.ok && missing.length === 0,
    detail: modelList.ok
      ? missing.length === 0
        ? "DS V4 Flash/Pro, GLM-5.3 and MiMo V2.5 visible"
        : `missing: ${missing.join(", ")}`
      : modelList.detail,
  });
}

const orca = probe("orca runtime", "orca", ["status", "--json"]);
if (orca.ok) {
  probe("orca orchestration skill", "orca", ["skills", "get", "orchestration"]);
  probe("orca orchestration RPC", "orca", ["orchestration", "run-list", "--json"]);
}

const branch = run("git", ["branch", "--show-current"]);
if (branch.ok) rows.push({ name: "git branch", ok: true, detail: branch.text || "detached" });

for (const row of rows) console.log(`${row.ok ? "OK  " : "WARN"} ${row.name}: ${row.detail}`);

if (!config.ok || (strict && rows.some((row) => !row.ok))) process.exit(1);
