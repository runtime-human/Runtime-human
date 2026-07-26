#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const statusPath = join(process.cwd(), "docs", "EXECUTION-STATUS.jsonc");
const status = JSON.parse(await readFile(statusPath, "utf8"));

status.updated = "2026-07-26";
status.mainHeadAtCurrentSliceStart = "12c25f7cde70a10fedcf3ecac6361a12ef63c0e8";
status.currentPhase = "performance-baseline-foundation";

const january = requireMilestone(status.milestones, "january-1990-hardening-and-closure");
january.status = "complete";
january.pullRequest = 32;
january.commit = "12c25f7cde70a10fedcf3ecac6361a12ef63c0e8";
delete january.branch;
january.evidence.issue22AcceptanceAudit = "complete";
january.evidence.permanentFoundationRun = 1228;
january.evidence.sonarQualityGate = "passed";
january.evidence.codeRabbitWalkthrough = "complete";
january.evidence.unresolvedReviewThreads = 0;

let performance = status.milestones.find(
  (milestone) => milestone.id === "performance-baseline-foundation",
);
if (performance === undefined) {
  performance = {
    id: "performance-baseline-foundation",
    status: "implementation-in-progress",
    pullRequest: 33,
    branch: "agent/performance-baseline-foundation",
    baseCommit: "12c25f7cde70a10fedcf3ecac6361a12ef63c0e8",
    scope: [
      "desktop-observational-timings",
      "published-january-baseline",
      "redacted-windows-profile",
      "warning-only-budgets",
      "profiling-runbook",
    ],
    evidence: {
      deterministicGameCoreUnchanged: true,
      persistenceProtocolUnchanged: true,
      machineSpecificArtifactsCommitted: false,
      measuredSurface: [
        "content-manifest",
        "content-chunks",
        "content-registry",
        "save-bootstrap",
        "month-load",
        "month-begin",
        "month-resume",
        "month-commit",
        "session-bootstrap",
      ],
      deferredSurface: [
        "webview-first-meaningful-paint",
        "tauri-ipc",
        "sqlite-queue-wait",
        "file-backed-fsync",
        "idle-cpu",
        "working-set",
      ],
    },
  };
  const npcIndex = status.milestones.findIndex((milestone) => milestone.id === "npc-foundation");
  status.milestones.splice(npcIndex < 0 ? status.milestones.length : npcIndex, 0, performance);
}

const npc = requireMilestone(status.milestones, "npc-foundation");
npc.status = "planned-after-performance-baseline";

status.verification.qualityGate = "pending-pr-33-final-head";
status.verification.currentConstraint =
  "opt-00a-implementation-in-progress-baseline-artifact-and-final-verification-pending";
status.verification.currentPullRequestMayMerge = false;

await writeFile(statusPath, `${JSON.stringify(status, null, 2)}\n`, "utf8");

function requireMilestone(milestones, id) {
  const milestone = milestones.find((candidate) => candidate.id === id);
  if (milestone === undefined) throw new Error(`Missing execution milestone ${id}`);
  return milestone;
}
