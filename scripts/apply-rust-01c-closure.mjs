import { readFile, writeFile } from "node:fs/promises";

const statusPath = "docs/EXECUTION-STATUS.jsonc";
const status = JSON.parse(await readFile(statusPath, "utf8"));
const milestoneId = "rust-persistence-fifo-shutdown";

if (status.milestones.some((milestone) => milestone.id === milestoneId)) {
  throw new Error(`${milestoneId} already exists in the execution ledger`);
}

status.updated = "2026-07-31";
status.milestones.push({
  id: milestoneId,
  status: "complete",
  issue: 58,
  pullRequest: 71,
  commit: "fa14c50a4ae6d233e5b805b414db5c68e1ce90c5",
  scope: [
    "typed-fifo-shutdown-marker",
    "closed-admission-before-shutdown",
    "accepted-operation-drain-before-close",
    "blocking-worker-receive",
    "serialized-idempotent-shutdown",
    "ordered-drop-and-join",
    "queue-depth-contract-preserved"
  ],
  evidence: {
    queueCapacity: 64,
    ordinaryEnqueue: "try-send",
    acceptedBeforeMarkerDrained: true,
    fullQueueRegressionEntries: 64,
    concurrentShutdownCallers: 8,
    finalHandleDropAndHealthyReopen: true,
    acknowledgementFailureStillJoins: true,
    pollingIntervalRemoved: true,
    externalShutdownAtomicRemoved: true,
    temporaryWorkflowsRemoved: true,
    materializerScriptsRemoved: true,
    generatedTauriSchemasRemoved: true,
    specializedVerificationRun: 30578917926,
    foundationRun: 1817,
    docsRun: 1417,
    sonarNewIssues: 0,
    sonarSecurityHotspots: 0
  }
});

status.verification.qualityGate = "rust-01c-complete-pr-71";
status.verification.currentConstraint = "perf-02a-e2-isolated-windows-capture-harness";
status.verification.currentPullRequestMayMerge = false;

await writeFile(statusPath, `${JSON.stringify(status, null, 2)}\n`, "utf8");
