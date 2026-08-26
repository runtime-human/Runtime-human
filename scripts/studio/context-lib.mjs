export const TASK_ENVELOPE_SCHEMA = "runtime-human-task-envelope-v1";

export const RISK_RANK = Object.freeze({
  R1: 1,
  R2: 2,
  R2_COMPLEX: 3,
  R3: 4,
});

const VERIFICATION_TIERS = new Set(["V0", "V1", "V2", "V3", "V4"]);

export function isValidTier(tier) {
  return VERIFICATION_TIERS.has(tier);
}

export function isValidRisk(risk) {
  return Boolean(RISK_RANK[risk]);
}

export function toPosix(value) {
  return String(value).replaceAll("\\", "/").replace(/^\.\//, "");
}

export function matchGlob(pattern, candidatePath) {
  const patternPosix = toPosix(pattern);
  const candidate = toPosix(candidatePath);
  let expression = "";
  for (let index = 0; index < patternPosix.length; index += 1) {
    const character = patternPosix[index];
    if (character === "*") {
      if (patternPosix[index + 1] === "*") {
        if (patternPosix[index + 2] === "/") {
          expression += "(?:.*/)?";
          index += 2;
        } else {
          expression += ".*";
          index += 1;
        }
      } else {
        expression += "[^/]*";
      }
    } else if (character === "?") {
      expression += "[^/]";
    } else {
      expression += character.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${expression}$`).test(candidate);
}

const IGNORED_PATH_PATTERNS = [
  /^\.opencode\//,
  /^\.studio\/runtime\//,
  /^\.worktrees\//,
  /^node_modules\//,
  /^\.pnpm-store\//,
  /^\.tsbuild\//,
  /\.tsbuildinfo$/,
  /^pnpm-lock\.yaml$/,
  /^docs\/MANIFEST\.jsonc$/,
  /^docs\/CATALOG\.md$/,
  /^storybook-static\//,
  /^apps\/desktop\/storybook-static\//,
  /^apps\/desktop\/src-tauri\/target\//,
  /^apps\/desktop\/src\/design\/generated\//,
  /^artifacts\/performance\//,
  /^coverage\//,
];

export function isIgnoredPath(candidatePath, extraNeverLoad = []) {
  const candidate = toPosix(candidatePath);
  if (IGNORED_PATH_PATTERNS.some((pattern) => pattern.test(candidate))) return true;
  return (extraNeverLoad ?? []).some((pattern) => matchGlob(pattern, candidate));
}

function compileZoneMatchers(zones) {
  return zones.map((zone) => ({
    zone,
    matchers: (zone.paths ?? []).map((pattern) => ({
      pattern,
      regexp: new RegExp(
        `^${(() => {
          let expression = "";
          const patternPosix = toPosix(pattern);
          for (let index = 0; index < patternPosix.length; index += 1) {
            const character = patternPosix[index];
            if (character === "*") {
              if (patternPosix[index + 1] === "*") {
                if (patternPosix[index + 2] === "/") {
                  expression += "(?:.*/)?";
                  index += 2;
                } else {
                  expression += ".*";
                  index += 1;
                }
              } else {
                expression += "[^/]*";
              }
            } else if (character === "?") {
              expression += "[^/]";
            } else {
              expression += character.replace(/[.+^${}()|[\]\\]/g, "\\$&");
            }
          }
          return expression;
        })()}$`,
      ),
    })),
  }));
}

export function resolveZones(changedPaths, zones, options = {}) {
  const { fallbackZone = null, neverBulkLoad = [] } = options;
  const considered = [];
  const ignored = [];
  for (const rawPath of changedPaths) {
    const candidate = toPosix(rawPath);
    if (isIgnoredPath(candidate, neverBulkLoad)) ignored.push(candidate);
    else considered.push(candidate);
  }
  const matchers = compileZoneMatchers(zones);
  const selected = zones.map((zone) => ({ id: zone.id, matched: [] }));
  const byId = new Map(selected.map((entry) => [entry.id, entry]));
  const unmatched = [];
  for (const candidate of considered) {
    let matchedAny = false;
    for (const { zone, matchers: expressions } of matchers) {
      if (expressions.some(({ regexp }) => regexp.test(candidate))) {
        byId.get(zone.id)?.matched.push(candidate);
        matchedAny = true;
      }
    }
    if (!matchedAny) unmatched.push(candidate);
  }
  if (fallbackZone && unmatched.length > 0) {
    const fallback = byId.get(fallbackZone);
    if (fallback) {
      fallback.matched.push(...unmatched);
    } else {
      selected.push({ id: fallbackZone, matched: [...unmatched] });
    }
  }
  return {
    selected: selected
      .filter((entry) => entry.matched.length > 0)
      .map((entry) => ({
        id: entry.id,
        matched: [...new Set(entry.matched)].toSorted((a, b) => a.localeCompare(b, "en")),
      })),
    unmatched: unmatched.toSorted((a, b) => a.localeCompare(b, "en")),
    ignored: [...new Set(ignored)].toSorted((a, b) => a.localeCompare(b, "en")),
  };
}

function maximumRisk(zoneIds, zonesById) {
  let best = "R1";
  for (const zoneId of zoneIds) {
    const zone = zonesById.get(zoneId);
    const rank = RISK_RANK[zone?.minimumRisk ?? "R1"] ?? 1;
    if (rank > RISK_RANK[best]) best = zone?.minimumRisk ?? "R1";
  }
  return best;
}

function normalizeKeyword(value) {
  return String(value).toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

export function classifyRisk(zoneIds, zones, options = {}) {
  const { taskText = "", changedPaths = [], overrideRisk = null } = options;
  const zonesById = new Map(zones.map((zone) => [zone.id, zone]));
  const haystack = [taskText, ...changedPaths.map(toPosix)].map(normalizeKeyword).join("\n");
  const baseRisk = maximumRisk(zoneIds, zonesById);
  let promoted = false;
  for (const zoneId of zoneIds) {
    const keywords = zonesById.get(zoneId)?.promoteToR3On ?? [];
    if (!keywords.some((keyword) => haystack.includes(normalizeKeyword(keyword)))) continue;
    promoted = true;
    break;
  }
  const candidates = [baseRisk, promoted ? "R3" : baseRisk];
  if (overrideRisk && RISK_RANK[overrideRisk]) candidates.push(overrideRisk);
  let risk = candidates[0];
  for (const candidate of candidates) {
    if (RISK_RANK[candidate] > RISK_RANK[risk]) risk = candidate;
  }
  return { risk, baseRisk, promoted };
}

const ZONE_SKILLS = Object.freeze({
  core: ["runtime-implement"],
  persistence: ["runtime-implement"],
  content: ["runtime-content"],
  application: ["runtime-implement"],
  ui: ["runtime-ui"],
  "qa-performance": ["runtime-qa"],
  canon: ["runtime-architecture"],
  balance: ["runtime-implement"],
  scenario: ["runtime-implement"],
  simulation: ["runtime-implement"],
  tooling: ["runtime-implement"],
});

export function selectSkills(zoneIds, risk, skillMapEntries) {
  const active = new Set(
    (skillMapEntries ?? [])
      .filter((entry) => entry?.status === "active")
      .map((entry) => entry.name),
  );
  const ordered = [];
  const push = (name) => {
    if (name && active.has(name) && !ordered.includes(name)) ordered.push(name);
  };
  if (risk === "R3") push("runtime-architecture");
  for (const zoneId of zoneIds) {
    for (const name of ZONE_SKILLS[zoneId] ?? []) push(name);
  }
  if (ordered.length === 0) push("runtime-implement");
  return ordered;
}

function dedupe(values) {
  return [...new Set(values.filter(Boolean).map(toPosix))];
}

export function buildReadLists(options) {
  const { base, guides, changedExisting, policy } = options;
  const docs = dedupe([...(base ?? []), ...(guides ?? [])]);
  const files = dedupe(changedExisting ?? []).toSorted((a, b) => a.localeCompare(b, "en"));
  const docLimit = Math.max(policy?.maxInitialDocs ?? 5, 0);
  const fileLimit = Math.max(policy?.maxInitialFiles ?? 8, 0);
  const mustDocs = docs.slice(0, docLimit);
  const mayDocs = docs.slice(docLimit, docLimit + docLimit);
  const mustFiles = files.slice(0, fileLimit);
  const mayFiles = files.slice(fileLimit, fileLimit + fileLimit);
  return {
    mustRead: [...mustDocs, ...mustFiles],
    mayRead: [...mayDocs, ...mayFiles],
  };
}

const SEVERITY_RANK = Object.freeze({ S0: 0, S1: 1, S2: 2, S3: 3, S4: 4 });
const PRIORITY_DISPOSITIONS = new Set(["BLOCK", "FIX_NOW"]);

export function selectRelevantFindings(rows, context, limit = 3) {
  const zoneSet = new Set(context?.zoneIds ?? []);
  const changedLower = (context?.changedPaths ?? []).map((value) => toPosix(value).toLowerCase());
  const taskWords = String(context?.taskText ?? "").toLowerCase();
  const scored = [];
  for (const row of rows ?? []) {
    if (!row || row.status !== "open") continue;
    let score = 0;
    if (zoneSet.has(row.zone)) score += 4;
    const needles = [row.category, row.component, row.invariant]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    const pathHit =
      needles.length > 0 &&
      changedLower.some((candidate) =>
        needles.some((needle) => candidate.includes(needle) || needle.includes(candidate)),
      );
    const textHit = needles.some((needle) => needle && taskWords.includes(needle));
    if (pathHit || textHit) score += 2;
    if (score === 0) continue;
    if (PRIORITY_DISPOSITIONS.has(row.disposition)) score += 1;
    scored.push({
      row,
      score,
      severityRank: SEVERITY_RANK[row.severity] ?? 9,
      occurrences: row.occurrences ?? 1,
    });
  }
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.severityRank - b.severityRank ||
      b.occurrences - a.occurrences ||
      String(a.row.id).localeCompare(String(b.row.id), "en"),
  );
  return scored.slice(0, Math.max(limit, 0)).map(({ row, score }) => ({
    id: row.id,
    severity: row.severity,
    zone: row.zone,
    category: row.category,
    component: row.component ?? null,
    invariant: row.invariant ?? null,
    occurrences: row.occurrences ?? 1,
    summary: row.summary,
    relevanceScore: score,
  }));
}

export function deriveVerification(zoneIds, changedPaths, tier) {
  const zones = new Set(zoneIds);
  const paths = (changedPaths ?? []).map(toPosix);
  const commands = [];
  if (zones.has("tooling")) commands.push("pnpm studio:check");
  if (
    [/^docs\//, /^AGENTS\.md$/, /^GAME\.md$/].some((pattern) =>
      paths.some((path) => pattern.test(path)),
    )
  ) {
    commands.push("pnpm docs:check");
  }
  if (zones.has("content") || paths.some((path) => path.startsWith("content/"))) {
    commands.push("pnpm content:check");
  }
  if (zones.has("persistence")) {
    commands.push("cargo test --locked --manifest-path apps/desktop/src-tauri/Cargo.toml");
  }
  const testTargets = paths.filter((path) => /\.(test|spec)\.(ts|tsx)$/.test(path)).slice(0, 8);
  if (testTargets.length > 0) {
    commands.push(`pnpm exec vitest run ${testTargets.join(" ")}`);
  }
  const notes = [
    `Tier contract: docs/engineering/VERIFICATION-TIERS.md (${tier}).`,
    "Full gate V3 (pnpm verify) is serialized and must not run per-edit.",
  ];
  return { tier, commands, notes };
}
