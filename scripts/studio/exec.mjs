import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { formatCompact, relativePosix, runCommand, summarizeText } from "./harness-lib.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(
    "Usage: pnpm studio:exec -- <command> [args...]  (full log kept, compact output returned)",
  );
  process.exit(2);
}

const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}`;
const logDir = resolve(root, ".studio", "runtime", "logs", runId);
mkdirSync(logDir, { recursive: true });

const run = runCommand({ args, cwd: root, logDir });
if (run.spawnError) {
  console.error(
    formatCompact({
      status: "FAIL",
      name: args.join(" "),
      detail: run.output,
      logPath: relativePosix(root, run.logPath),
    }).join("\n"),
  );
  process.exit(5);
}

const summary = summarizeText(run.output);
const status = run.passed ? "PASS" : "FAIL";
const detail =
  status === "PASS"
    ? summary.total !== null
      ? String(summary.total)
      : ""
    : summary.failed !== null
      ? `${summary.failed} failed${summary.total !== null ? ` / ${summary.total}` : ""}`
      : `exit ${run.code}`;

console.log(
  formatCompact({
    status,
    name: args.join(" "),
    detail,
    excerpts: status === "FAIL" ? summary.excerpts : [],
    logPath: relativePosix(root, run.logPath),
  }).join("\n"),
);
process.exit(run.code);
