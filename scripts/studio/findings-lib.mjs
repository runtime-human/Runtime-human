import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const OPEN_LEDGER = ".studio/findings/ledger.jsonl";
export const RESOLVED_LEDGER = ".studio/findings/resolved.jsonl";
export const POLICY_PATH = ".studio/finding-policy.json";

export function readPolicy(root = process.cwd()) {
  return JSON.parse(readFileSync(resolve(root, POLICY_PATH), "utf8"));
}

export function readJsonl(path) {
  if (!existsSync(path)) return [];
  const text = readFileSync(path, "utf8").trim();
  if (!text) return [];
  return text.split(/\r?\n/).filter(Boolean).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`Invalid JSONL at ${path}:${index + 1}: ${error.message}`);
    }
  });
}

export function writeJsonlAtomic(path, rows) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.tmp-${process.pid}`;
  const body = rows.length ? `${rows.map((row) => JSON.stringify(row)).join("\n")}\n` : "";
  writeFileSync(temp, body, "utf8");
  renameSync(temp, path);
}

function norm(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function deriveFingerprint(input) {
  const explicit = String(input.fingerprint ?? "").trim();
  if (explicit) return explicit.toLowerCase();
  const parts = [input.zone, input.component || "general", input.category, input.invariant || "none"].map(norm);
  if (parts.some((part) => !part)) {
    throw new Error("Cannot derive fingerprint: zone, category and component/general are required");
  }
  return parts.join(":");
}

export function findingId(fingerprint) {
  return `RF-${createHash("sha256").update(fingerprint).digest("hex").slice(0, 10).toUpperCase()}`;
}

export function validateFindingInput(input, policy) {
  const required = ["zone", "severity", "size", "scope", "category", "summary"];
  for (const key of required) {
    if (!String(input[key] ?? "").trim()) throw new Error(`Missing finding field: ${key}`);
  }
  if (!policy.severity?.[input.severity]) throw new Error(`Unknown severity: ${input.severity}`);
  if (!(input.size in (policy.sizeWeights ?? {}))) throw new Error(`Unknown size: ${input.size}`);
  if (!(policy.scopes ?? []).includes(input.scope)) throw new Error(`Unknown scope: ${input.scope}`);
  const dispositions = new Set([...(policy.openDispositions ?? []), ...(policy.closedDispositions ?? [])]);
  if (!dispositions.has(input.disposition)) throw new Error(`Unknown disposition: ${input.disposition}`);
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean).map(String))];
}

export function upsertFinding(root, input, now = new Date()) {
  const policy = readPolicy(root);
  const normalized = { ...input, disposition: input.disposition || "LEDGER" };
  validateFindingInput(normalized, policy);
  const fingerprint = deriveFingerprint(normalized);
  const id = findingId(fingerprint);
  const iso = now.toISOString();
  const openPath = resolve(root, OPEN_LEDGER);
  const resolvedPath = resolve(root, RESOLVED_LEDGER);
  const open = readJsonl(openPath);
  const closedDirectly = (policy.closedDispositions ?? []).includes(normalized.disposition);

  const existingIndex = open.findIndex((row) => row.fingerprint === fingerprint);
  if (existingIndex >= 0) {
    const current = open[existingIndex];
    const updated = {
      ...current,
      severity:
        policy.severity[normalized.severity].rank < policy.severity[current.severity].rank
          ? normalized.severity
          : current.severity,
      size:
        Math.max(policy.sizeWeights[normalized.size], policy.sizeWeights[current.size]) ===
        policy.sizeWeights[normalized.size]
          ? normalized.size
          : current.size,
      scope: normalized.scope === "systemic" ? "systemic" : current.scope,
      occurrences: (current.occurrences ?? 1) + 1,
      lastSeenAt: iso,
      evidence: unique([...(current.evidence ?? []), ...(normalized.evidence ?? [])]),
      introducedBy: unique([...(current.introducedBy ?? []), ...(normalized.introducedBy ?? [])]),
      foundBy: unique([...(current.foundBy ?? []), ...(normalized.foundBy ?? [])]),
    };
    open[existingIndex] = updated;
    writeJsonlAtomic(openPath, open);
    return { action: "deduplicated", finding: updated };
  }

  const finding = {
    id,
    fingerprint,
    zone: normalized.zone,
    severity: normalized.severity,
    size: normalized.size,
    scope: normalized.scope,
    category: normalized.category,
    component: normalized.component || "general",
    invariant: normalized.invariant || null,
    summary: normalized.summary,
    disposition: normalized.disposition,
    status: closedDirectly ? "closed" : "open",
    occurrences: 1,
    firstSeenAt: iso,
    lastSeenAt: iso,
    evidence: unique(normalized.evidence),
    introducedBy: unique(normalized.introducedBy),
    foundBy: unique(normalized.foundBy),
    preventionCandidates: [],
  };

  if (closedDirectly) {
    const resolved = readJsonl(resolvedPath);
    resolved.push({ ...finding, resolvedAt: iso });
    writeJsonlAtomic(resolvedPath, resolved);
    return { action: "closed", finding };
  }

  open.push(finding);
  writeJsonlAtomic(openPath, open);
  return { action: "created", finding };
}

function severityPressure(rows, policy) {
  return rows.some((row) => policy.severity[row.severity]?.rank <= 2) ? 1 : 0;
}

export function clusterFindings(rows, policy) {
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.zone}|${row.category}|${row.component || "general"}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  return [...groups.entries()]
    .map(([key, findings]) => {
      const baseSize = findings.reduce((sum, row) => sum + (policy.sizeWeights[row.size] ?? 0), 0);
      const recurrenceRaw = findings.reduce(
        (sum, row) => sum + Math.max((row.occurrences ?? 1) - 1, 0),
        0,
      );
      const recurrencePressure = Math.min(
        recurrenceRaw,
        policy.batch.maxRecurrencePressure ?? 3,
      );
      const contextPressure = findings.length >= 2 ? 1 : 0;
      const severePressure = severityPressure(findings, policy);
      const score =
        baseSize +
        (policy.batch.coefficients.recurrence ?? 2) * recurrencePressure +
        (policy.batch.coefficients.context ?? 3) * contextPressure +
        (policy.batch.coefficients.severity ?? 4) * severePressure;
      const blocksAcceptance = findings.some(
        (row) => policy.severity[row.severity]?.blocksAcceptance || row.disposition === "BLOCK",
      );
      const immediate = blocksAcceptance || findings.some((row) => row.disposition === "FIX_NOW");
      const state = immediate
        ? "immediate"
        : findings.length >= policy.batch.clusterMinFindings || score >= policy.batch.readyScore
          ? "ready-batch"
          : "hold";
      const systemic = findings.some(
        (row) =>
          row.scope === "systemic" ||
          (row.occurrences ?? 1) >= policy.promotion.systemicOccurrenceThreshold,
      );
      const large = findings.some((row) => ["L", "XL"].includes(row.size));
      const recommendedRisk = blocksAcceptance
        ? "R3"
        : systemic || large
          ? "R2_COMPLEX"
          : "R2";
      return {
        key,
        zone: findings[0].zone,
        category: findings[0].category,
        component: findings[0].component || "general",
        findingCount: findings.length,
        totalOccurrences: findings.reduce((sum, row) => sum + (row.occurrences ?? 1), 0),
        aggregateSizeWeight: baseSize,
        score,
        state,
        recommendedRisk,
        findingIds: findings.map((row) => row.id),
        preventionCandidates: systemic ? policy.promotion.defaultCandidates : [],
      };
    })
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
}

export function promoteRecurring(root, { id = null, now = new Date() } = {}) {
  const policy = readPolicy(root);
  const path = resolve(root, OPEN_LEDGER);
  const rows = readJsonl(path);
  const promoted = [];
  for (const row of rows) {
    const eligible = id
      ? row.id === id
      : (row.occurrences ?? 1) >= policy.promotion.systemicOccurrenceThreshold;
    if (!eligible) continue;
    row.scope = "systemic";
    row.recurrenceLevel = "systemic";
    row.promotedAt = now.toISOString();
    row.preventionCandidates = unique([
      ...(row.preventionCandidates ?? []),
      ...(policy.promotion.defaultCandidates ?? []),
    ]);
    promoted.push(row.id);
  }
  if (id && !promoted.length) throw new Error(`Open finding not found: ${id}`);
  writeJsonlAtomic(path, rows);
  return promoted;
}

export function resolveFinding(
  root,
  { id, rootCause, fixCommit = null, prevention = [], now = new Date() },
) {
  if (!id) throw new Error("Missing --id");
  if (!String(rootCause ?? "").trim()) throw new Error("Missing --root-cause");
  const openPath = resolve(root, OPEN_LEDGER);
  const resolvedPath = resolve(root, RESOLVED_LEDGER);
  const open = readJsonl(openPath);
  const index = open.findIndex((row) => row.id === id);
  if (index < 0) throw new Error(`Open finding not found: ${id}`);
  const [finding] = open.splice(index, 1);
  const resolved = readJsonl(resolvedPath);
  const closed = {
    ...finding,
    status: "resolved",
    resolvedAt: now.toISOString(),
    rootCause: String(rootCause).trim(),
    fixCommit: fixCommit || null,
    prevention: unique(prevention),
  };
  resolved.push(closed);
  writeJsonlAtomic(openPath, open);
  writeJsonlAtomic(resolvedPath, resolved);
  return closed;
}

export function parseArgs(argv) {
  const values = new Map();
  const flags = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg?.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`);
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      flags.add(key);
      continue;
    }
    if (!values.has(key)) values.set(key, []);
    values.get(key).push(next);
    index += 1;
  }
  return {
    has: (key) => flags.has(key) || values.has(key),
    one: (key, fallback = null) => values.get(key)?.at(-1) ?? fallback,
    many: (key) => values.get(key) ?? [],
  };
}
