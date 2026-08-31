import {
  CHANGE_INSPECTION_SCHEMA,
  PR_EVIDENCE_SCHEMA,
  inspectChange,
  resolveCommit,
} from "./control-plane-lib.mjs";

const FULL_SHA = /^[0-9a-f]{40}$/u;
const V3_AUTHORITY = "pnpm verify";

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

export { PR_EVIDENCE_SCHEMA } from "./control-plane-lib.mjs";

export function buildPrEvidence({ inspection: inspectionInput, testedSha, status, exitCode }) {
  const inspection = validateInspection(inspectionInput);
  const normalizedTestedSha = requireFullSha(testedSha, "testedSha");
  validateOutcome(status, exitCode);

  return {
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
}

export function collectPrEvidence(root, { base, head, tested, status, exitCode }) {
  const inspection = inspectChange(root, { base, head });
  const testedSha = resolveCommit(root, tested);
  return buildPrEvidence({ inspection, testedSha, status, exitCode });
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
  return [
    "## Runtime Human PR evidence",
    "",
    `- Schema: \`${value.schemaVersion}\``,
    `- Base SHA: \`${value.baseSha}\``,
    `- Candidate head SHA: \`${value.headSha}\``,
    `- Tested SHA: \`${value.testedSha}\``,
    `- Change: ${value.inspection.changedPaths.length} path(s), zones ${zones}, risk ${value.inspection.risk}`,
    `- Verification: ${value.verification.tier} / \`${value.verification.authority}\` / **${value.verification.status}** / exit ${value.verification.result.code}`,
    "",
  ].join("\n");
}
