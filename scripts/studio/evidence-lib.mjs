import fs from "node:fs";
import path from "node:path";

import {
  CHANGE_INSPECTION_SCHEMA,
  PR_EVIDENCE_SCHEMA,
  inspectChange,
  resolveCommit,
} from "./control-plane-lib.mjs";

const FULL_SHA = /^[0-9a-f]{40}$/u;
const FULL_FINGERPRINT = /^[0-9a-f]{64}$/u;
const V3_AUTHORITY = "pnpm verify";
const GAMECTL_SCHEMA = "runtime-human-gamectl-v1";
const SIMULATION_DIFF_SCHEMA = "simulation-diff-v1";
const SIMULATION_REPORT_SCHEMA = "simulation-report-v4";
const SIMULATION_CORPUS_SCHEMA = "simulation-corpus-v1";
const SIMULATION_VERDICTS = new Set(["pass", "pass-with-changes", "fail"]);

export const SIMULATION_REGRESSION_EVIDENCE_SCHEMA =
  "runtime-human-simulation-regression-evidence-v1";

function requireObject(value, name) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value;
}

function requireFullSha(value, name) {
  if (typeof value !== "string" || !FULL_SHA.test(value)) {
    throw new Error(`${name} must be a lowercase 40-character commit SHA`);
  }
  return value;
}

function requireNonEmptyString(value, name) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value;
}

function requireArray(value, name) {
  if (!Array.isArray(value)) throw new Error(`${name} must be an array`);
  return value;
}

function validateInspection(value) {
  const inspection = requireObject(value, "inspection");
  if (inspection.schemaVersion !== CHANGE_INSPECTION_SCHEMA) {
    throw new Error(`inspection schema must be ${CHANGE_INSPECTION_SCHEMA}`);
  }
  requireFullSha(inspection.baseSha, "inspection.baseSha");
  requireFullSha(inspection.headSha, "inspection.headSha");
  if (!Array.isArray(inspection.changedPaths)) {
    throw new Error("inspection.changedPaths must be an array");
  }
  if (!Array.isArray(inspection.zones)) throw new Error("inspection.zones must be an array");
  if (typeof inspection.risk !== "string" || inspection.risk.length === 0) {
    throw new Error("inspection.risk must be a non-empty string");
  }
  return inspection;
}

function validateOutcome(status, exitCode) {
  if (status !== "success" && status !== "failure") {
    throw new Error("verification status must be success or failure");
  }
  if (!Number.isInteger(exitCode) || exitCode < 0) {
    throw new Error("verification exit code must be a non-negative integer");
  }
  if (status === "success" && exitCode !== 0) {
    throw new Error("verification success requires exit code 0");
  }
  if (status === "failure" && exitCode === 0) {
    throw new Error("verification failure requires a non-zero exit code");
  }
}

function readJson(filePath, name) {
  let text;
  try {
    text = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    throw new Error(
      `${name} could not be read: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(
      `${name} must contain valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function validateSimulationInspection(value, baseSha, headSha) {
  const inspection = requireObject(value, "simulation inspection");
  if (inspection.schemaVersion !== CHANGE_INSPECTION_SCHEMA) {
    throw new Error(`simulation inspection schema must be ${CHANGE_INSPECTION_SCHEMA}`);
  }
  const evidenceBaseSha = requireFullSha(
    inspection.baseSha,
    "simulation inspection.baseSha",
  );
  const evidenceHeadSha = requireFullSha(
    inspection.headSha,
    "simulation inspection.headSha",
  );
  if (evidenceBaseSha !== baseSha || evidenceHeadSha !== headSha) {
    throw new Error(
      `stale simulation evidence: expected ${baseSha}..${headSha}, got ${evidenceBaseSha}..${evidenceHeadSha}`,
    );
  }
}

function validateSimulationCorpus(value, name) {
  const corpus = requireObject(value, name);
  if (corpus.schemaVersion !== SIMULATION_CORPUS_SCHEMA) {
    throw new Error(`${name}.schemaVersion must be ${SIMULATION_CORPUS_SCHEMA}`);
  }
  const corpusId = requireNonEmptyString(corpus.corpusId, `${name}.corpusId`);
  if (typeof corpus.fingerprint !== "string" || !FULL_FINGERPRINT.test(corpus.fingerprint)) {
    throw new Error(`${name}.fingerprint must be a lowercase 64-character fingerprint`);
  }
  return {
    schemaVersion: SIMULATION_CORPUS_SCHEMA,
    corpusId,
    fingerprint: corpus.fingerprint,
  };
}

function validateSimulationIdentity(value, name) {
  const identity = requireObject(value, name);
  if (identity.reportSchemaVersion !== SIMULATION_REPORT_SCHEMA) {
    throw new Error(`${name}.reportSchemaVersion must be ${SIMULATION_REPORT_SCHEMA}`);
  }
  return validateSimulationCorpus(identity.corpus, `${name}.corpus`);
}

function collectSimulationRegressionEvidence({
  evidenceDir,
  artifactName,
  baseSha,
  headSha,
  testedSha,
}) {
  const normalizedEvidenceDir = requireNonEmptyString(evidenceDir, "simulationEvidenceDir");
  const normalizedArtifactName = requireNonEmptyString(artifactName, "simulationArtifactName");
  const inspectionPath = path.join(normalizedEvidenceDir, "inspection.json");
  validateSimulationInspection(
    readJson(inspectionPath, "simulation inspection"),
    baseSha,
    headSha,
  );

  const artifact = { name: normalizedArtifactName };
  const diffPath = path.join(normalizedEvidenceDir, "diff.json");
  if (!fs.existsSync(diffPath)) {
    return {
      schemaVersion: SIMULATION_REGRESSION_EVIDENCE_SCHEMA,
      status: "unavailable",
      baseSha,
      headSha,
      testedSha,
      artifact,
      reason: "simulation-diff-unavailable",
    };
  }

  const envelope = requireObject(readJson(diffPath, "simulation diff"), "simulation diff");
  if (envelope.schemaVersion !== GAMECTL_SCHEMA || envelope.command !== "simulate.compare") {
    throw new Error("simulation diff must be a gamectl simulate.compare envelope");
  }
  const diff = requireObject(envelope.result, "simulation diff.result");
  if (diff.schemaVersion !== SIMULATION_DIFF_SCHEMA) {
    throw new Error(`simulation diff schema must be ${SIMULATION_DIFF_SCHEMA}`);
  }
  if (!SIMULATION_VERDICTS.has(diff.verdict)) {
    throw new Error("simulation diff verdict must be pass, pass-with-changes, or fail");
  }

  const baselineCorpus = validateSimulationIdentity(
    diff.baseline,
    "simulation diff.baseline",
  );
  const candidateCorpus = validateSimulationIdentity(
    diff.candidate,
    "simulation diff.candidate",
  );
  if (
    baselineCorpus.corpusId !== candidateCorpus.corpusId ||
    baselineCorpus.fingerprint !== candidateCorpus.fingerprint
  ) {
    throw new Error("simulation diff corpus identity must match between baseline and candidate");
  }

  const hardInvariantChanges = requireArray(
    diff.hardInvariantChanges,
    "simulation diff.hardInvariantChanges",
  );
  const metricChanges = requireArray(diff.metricChanges, "simulation diff.metricChanges");
  const distributionChanges = requireArray(
    diff.distributionChanges,
    "simulation diff.distributionChanges",
  );
  const fingerprintChanges = requireArray(
    diff.fingerprintChanges,
    "simulation diff.fingerprintChanges",
  );

  return {
    schemaVersion: SIMULATION_REGRESSION_EVIDENCE_SCHEMA,
    status: "complete",
    baseSha,
    headSha,
    testedSha,
    artifact: { ...artifact, diffPath: "diff.json" },
    corpus: baselineCorpus,
    verdict: diff.verdict,
    changes: {
      hardInvariants: hardInvariantChanges.length,
      metrics: metricChanges.length,
      distributions: distributionChanges.length,
      fingerprints: fingerprintChanges.length,
    },
  };
}

export { PR_EVIDENCE_SCHEMA } from "./control-plane-lib.mjs";

export function buildPrEvidence({
  inspection: inspectionInput,
  testedSha,
  status,
  exitCode,
  simulationRegression,
}) {
  const inspection = validateInspection(inspectionInput);
  const normalizedTestedSha = requireFullSha(testedSha, "testedSha");
  validateOutcome(status, exitCode);

  const evidence = {
    schemaVersion: PR_EVIDENCE_SCHEMA,
    baseSha: inspection.baseSha,
    headSha: inspection.headSha,
    testedSha: normalizedTestedSha,
    inspection,
    verification: {
      tier: "V3",
      authority: V3_AUTHORITY,
      status,
      result: {
        command: V3_AUTHORITY,
        ok: status === "success",
        code: exitCode,
      },
    },
  };
  return simulationRegression === undefined ? evidence : { ...evidence, simulationRegression };
}

export function collectPrEvidence(
  root,
  {
    base,
    head,
    tested,
    status,
    exitCode,
    simulationEvidenceDir,
    simulationArtifactName,
  },
) {
  const inspection = inspectChange(root, { base, head });
  const testedSha = resolveCommit(root, tested);
  const hasSimulationEvidenceDir = simulationEvidenceDir !== undefined;
  const hasSimulationArtifactName = simulationArtifactName !== undefined;
  if (hasSimulationEvidenceDir !== hasSimulationArtifactName) {
    throw new Error("simulation evidence requires both directory and artifact name");
  }
  const simulationRegression = hasSimulationEvidenceDir
    ? collectSimulationRegressionEvidence({
        evidenceDir: path.resolve(root, simulationEvidenceDir),
        artifactName: simulationArtifactName,
        baseSha: inspection.baseSha,
        headSha: inspection.headSha,
        testedSha,
      })
    : undefined;
  return buildPrEvidence({ inspection, testedSha, status, exitCode, simulationRegression });
}

export function serializePrEvidence(value) {
  if (value?.schemaVersion !== PR_EVIDENCE_SCHEMA) {
    throw new Error(`evidence schema must be ${PR_EVIDENCE_SCHEMA}`);
  }
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function renderPrEvidenceSummary(value) {
  if (value?.schemaVersion !== PR_EVIDENCE_SCHEMA) {
    throw new Error(`evidence schema must be ${PR_EVIDENCE_SCHEMA}`);
  }
  const zones = value.inspection.zones.join(", ") || "none";
  const lines = [
    "## Runtime Human PR evidence",
    "",
    `- Schema: \`${value.schemaVersion}\``,
    `- Base SHA: \`${value.baseSha}\``,
    `- Candidate head SHA: \`${value.headSha}\``,
    `- Tested SHA: \`${value.testedSha}\``,
    `- Change: ${value.inspection.changedPaths.length} path(s), zones ${zones}, risk ${value.inspection.risk}`,
    `- Verification: ${value.verification.tier} / \`${value.verification.authority}\` / **${value.verification.status}** / exit ${value.verification.result.code}`,
  ];
  if (value.simulationRegression?.status === "complete") {
    lines.push(
      `- Simulation regression: ${value.simulationRegression.verdict} / corpus \`${value.simulationRegression.corpus.corpusId}\` / artifact \`${value.simulationRegression.artifact.name}\``,
    );
  } else if (value.simulationRegression?.status === "unavailable") {
    lines.push(
      `- Simulation regression: unavailable (${value.simulationRegression.reason}) / artifact \`${value.simulationRegression.artifact.name}\``,
    );
  }
  lines.push("");
  return lines.join("\n");
}
