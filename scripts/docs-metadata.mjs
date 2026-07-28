export const DOCUMENT_STATUSES = Object.freeze([
  "accepted",
  "draft",
  "superseded",
  "proposed",
  "completed",
]);

const NUMBERED_ADR_STATUSES = Object.freeze(["accepted", "proposed", "superseded"]);
const SUPERPOWERS_PLAN_STATUSES = Object.freeze(["completed", "superseded"]);

function normalizeFile(file) {
  return file.replaceAll("\\", "/");
}

export function validateDocumentationMetadata(file, metadata) {
  if (!metadata) return [];

  const normalizedFile = normalizeFile(file);
  const errors = [];
  const status = metadata.status;
  const validStatus = typeof status === "string" && DOCUMENT_STATUSES.includes(status);

  if (!validStatus) {
    errors.push(`${normalizedFile}: status must be one of ${DOCUMENT_STATUSES.join(", ")}`);
  }

  if (
    normalizedFile.startsWith("docs/superpowers/plans/") &&
    !SUPERPOWERS_PLAN_STATUSES.includes(status)
  ) {
    errors.push(`${normalizedFile}: superpowers plans must be completed or superseded`);
  }

  if (/^docs\/adr\/ADR-\d{3}-/u.test(normalizedFile) && !NUMBERED_ADR_STATUSES.includes(status)) {
    errors.push(`${normalizedFile}: numbered ADR status must be accepted, proposed or superseded`);
  }

  const supersededBy = metadata.superseded_by;
  if (status === "superseded") {
    if (typeof supersededBy !== "string" || supersededBy.trim() === "") {
      errors.push(`${normalizedFile}: superseded documents require superseded_by`);
    } else if (!/^docs\/.+\.(?:md|jsonc)$/u.test(normalizeFile(supersededBy))) {
      errors.push(
        `${normalizedFile}: superseded_by must be a repository-relative docs/*.md or docs/*.jsonc path`,
      );
    }
  } else if (supersededBy !== undefined) {
    errors.push(`${normalizedFile}: superseded_by is only valid when status is superseded`);
  }

  return errors;
}

export function validateSupersessionTargets(entries, additionalTargets = []) {
  const knownFiles = new Set([
    ...entries.map((entry) => normalizeFile(entry.file)),
    ...additionalTargets.map(normalizeFile),
  ]);
  const errors = [];

  for (const entry of entries) {
    if (entry.status !== "superseded" || !entry.supersededBy) continue;

    const file = normalizeFile(entry.file);
    const target = normalizeFile(entry.supersededBy);
    if (target === file) {
      errors.push(`${file}: superseded_by cannot reference the same document`);
    } else if (!knownFiles.has(target)) {
      errors.push(`${file}: unknown superseded_by ${target}`);
    }
  }

  return errors;
}
