import { readFile, writeFile } from "node:fs/promises";

const workerPath = "apps/desktop/src-tauri/src/persistence/worker.rs";
const observabilityTestPath =
  "apps/desktop/src-tauri/src/persistence/performance_observability_tests.rs";

function replaceExactly(source, oldText, newText, expected = 1, label = oldText.slice(0, 80)) {
  const count = source.split(oldText).length - 1;
  if (count !== expected) {
    throw new Error(`expected ${expected} matches, found ${count}: ${label}`);
  }
  return source.split(oldText).join(newText);
}

function tripleAssignment(script, name) {
  const pattern = new RegExp(`${name}\\s*=\\s*'''([\\s\\S]*?)'''`);
  const match = script.match(pattern);
  if (match === null) throw new Error(`missing triple assignment: ${name}`);
  return match[1];
}

async function applyMainFifoMaterializer() {
  const script = await readFile("scripts/apply-rust-01c.py", "utf8");
  let worker = await readFile(workerPath, "utf8");

  const replacePattern = /replace_once\(\s*'''([\s\S]*?)''',\s*'''([\s\S]*?)''',\s*\)/g;
  const pairs = [...script.matchAll(replacePattern)];
  if (pairs.length < 10) throw new Error(`unexpected replace_once count: ${pairs.length}`);
  for (const [, oldText, newText] of pairs) {
    worker = replaceExactly(worker, oldText, newText);
  }

  const manualBlocks = [...script.matchAll(/old_call\s*=\s*'''([\s\S]*?)'''/g)];
  if (manualBlocks.length !== 2) {
    throw new Error(`unexpected manual worker-call block count: ${manualBlocks.length}`);
  }
  const firstNew = tripleAssignment(script, "new_call");
  worker = replaceExactly(worker, manualBlocks[0][1], firstNew, 1, "recovery worker call");

  const secondReplacementMatch = script.match(
    /text\.replace\(old_call,\s*'''([\s\S]*?)'''\)/,
  );
  if (secondReplacementMatch === null) throw new Error("missing normal worker-call replacement");
  worker = replaceExactly(
    worker,
    manualBlocks[1][1],
    secondReplacementMatch[1],
    2,
    "normal/read-only worker calls",
  );

  await writeFile(workerPath, worker, "utf8");
}

async function applyJoinFix() {
  const script = await readFile("scripts/apply-rust-01c-join-fix.py", "utf8");
  const oldText = tripleAssignment(script, "old");
  const newText = tripleAssignment(script, "new");
  const worker = await readFile(workerPath, "utf8");
  await writeFile(
    workerPath,
    replaceExactly(worker, oldText, newText, 1, "shutdown acknowledgement join"),
    "utf8",
  );
}

async function applyTelemetryContract() {
  const script = await readFile("scripts/apply-persistence-telemetry-contract.py", "utf8");
  const oldWorker = tripleAssignment(script, "old_worker");
  const newWorker = tripleAssignment(script, "new_worker");
  let worker = await readFile(workerPath, "utf8");
  worker = replaceExactly(worker, oldWorker, newWorker, 1, "database queue-depth span");
  await writeFile(workerPath, worker, "utf8");

  let tests = await readFile(observabilityTestPath, "utf8");
  tests = replaceExactly(
    tests,
    "assert_eq!(database.queue_depth, Some(0));",
    "assert_eq!(database.queue_depth, None);",
    1,
    "single database queue-depth assertion",
  );
  tests = replaceExactly(
    tests,
    ".all(|event| event.queue_depth == Some(0))",
    ".all(|event| event.queue_depth.is_none())",
    1,
    "sequential database queue-depth assertion",
  );
  await writeFile(observabilityTestPath, tests, "utf8");
}

await applyMainFifoMaterializer();
await applyJoinFix();
await applyTelemetryContract();
