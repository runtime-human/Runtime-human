const CAPTURE_SCHEMA = "runtime-human-desktop-performance-capture-v1";
const REPORT_SCHEMA = "runtime-human-desktop-performance-evidence-v1";
const RUST_SNAPSHOT_SCHEMA = "runtime-human-desktop-performance-snapshot-v1";
const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
const PERSISTENCE_QUEUE_CAPACITY = 64;

const SCENARIOS = new Set([
  "startup-shell-fmp",
  "startup-january-ready",
  "load-persisted-context",
  "begin-month-run",
  "resume-month-run",
  "final-commit",
]);
const PROCESS_CLASSES = new Set(["cold-process", "warm-process"]);
const CACHE_CLASSES = new Set(["cold-os-cache", "warm-os-cache"]);
const DATABASE_CLASSES = new Set(["new-database", "existing-clean-database"]);
const SAMPLE_ROLES = new Set(["warmup", "measurement"]);
const RUST_MARK_NAMES = new Set([
  "processEntry",
  "tauriSetupStart",
  "persistenceWorkerReady",
  "tauriSetupComplete",
  "mainWindowAvailable",
]);
const RUST_SPAN_NAMES = new Set([
  "tauriCommandDispatch",
  "persistenceQueueWait",
  "persistenceDatabaseOperation",
]);
const RUST_EVENT_NAMES = new Set([...RUST_MARK_NAMES, ...RUST_SPAN_NAMES]);
const RUST_CATEGORIES = new Set(["query", "mutation", "backup", "recovery", "shutdown"]);
const BROWSER_MARK_NAMES = new Set([
  "app.renderer_bootstrap",
  "app.react_shell_commit",
  "app.january_session_ready",
  "app.first_meaningful_paint",
]);
const BROWSER_MEASURE_NAMES = new Set([
  "app.session_bootstrap",
  "content.manifest",
  "content.chunk",
  "content.registry",
  "month.load",
  "month.begin",
  "month.resume",
  "month.commit",
  "month.retry",
]);
const BROWSER_ENTRY_NAMES = new Set([...BROWSER_MARK_NAMES, ...BROWSER_MEASURE_NAMES]);
const BROWSER_ENTRY_TYPES = new Set(["mark", "measure"]);
const EXTERNAL_METRIC_NAMES = new Set([
  "processToShellFmpMicros",
  "processToJanuaryReadyMicros",
  "processToMainWindowObservedMicros",
]);
const UNBUDGETED = Object.freeze({
  status: "unbudgeted",
  p50MaximumMicros: null,
  p95MaximumMicros: null,
  p99MaximumMicros: null,
});

export function parseDesktopEvidenceCapture(value, label = "capture") {
  const capture = requireRecord(value, label);
  requireExactKeys(
    capture,
    [
      "schemaVersion",
      "commit",
      "host",
      "scenario",
      "classification",
      "sampleIndex",
      "externalDurationsMicros",
      "rustSnapshot",
      "browserEntries",
    ],
    label,
  );
  if (capture.schemaVersion !== CAPTURE_SCHEMA) {
    throw new TypeError(`${label}.schemaVersion must be ${CAPTURE_SCHEMA}`);
  }

  return Object.freeze({
    schemaVersion: CAPTURE_SCHEMA,
    commit: requireCommit(capture.commit, `${label}.commit`),
    host: parseHost(capture.host, `${label}.host`),
    scenario: requireClosedString(capture.scenario, SCENARIOS, `${label}.scenario`),
    classification: parseClassification(capture.classification, `${label}.classification`),
    sampleIndex: requireSafeInteger(capture.sampleIndex, `${label}.sampleIndex`, 0),
    externalDurationsMicros: parseExternalDurations(
      capture.externalDurationsMicros,
      `${label}.externalDurationsMicros`,
    ),
    rustSnapshot: parseRustSnapshot(capture.rustSnapshot, `${label}.rustSnapshot`),
    browserEntries: Object.freeze(
      requireArray(capture.browserEntries, `${label}.browserEntries`).map((entry, index) =>
        parseBrowserEntry(entry, `${label}.browserEntries[${index}]`),
      ),
    ),
  });
}

export function createDesktopEvidenceReport(captures) {
  if (!Array.isArray(captures) || captures.length === 0) {
    throw new TypeError("captures must contain at least one capture");
  }
  const parsed = captures.map((capture, index) =>
    parseDesktopEvidenceCapture(capture, `captures[${index}]`),
  );
  const firstCapture = parsed[0];
  if (firstCapture === undefined) {
    throw new TypeError("captures must contain at least one parsed capture");
  }
  assertComparableSource(parsed);
  assertUniqueCaptureIdentity(parsed);

  const measurements = parsed.filter(
    (capture) => capture.classification.sampleRole === "measurement",
  );
  const grouped = new Map();
  for (const capture of measurements) {
    const key = groupKey(capture);
    const group = grouped.get(key) ?? [];
    group.push(capture);
    grouped.set(key, group);
  }

  const groups = [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, group]) => summarizeGroup(group));

  return Object.freeze({
    schemaVersion: REPORT_SCHEMA,
    commit: firstCapture.commit,
    host: firstCapture.host,
    captureCount: parsed.length,
    warmupCount: parsed.length - measurements.length,
    measurementCount: measurements.length,
    groups: Object.freeze(groups),
    captures: Object.freeze(
      [...parsed].sort((left, right) => {
        const keyComparison = captureSortKey(left).localeCompare(captureSortKey(right));
        return keyComparison || left.sampleIndex - right.sampleIndex;
      }),
    ),
  });
}

export function nearestRank(values, percentile) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new TypeError("values must contain at least one value");
  }
  if (
    typeof percentile !== "number" ||
    !Number.isFinite(percentile) ||
    percentile <= 0 ||
    percentile > 1
  ) {
    throw new RangeError("percentile must be greater than 0 and at most 1");
  }
  const sorted = values
    .map((value, index) => requireSafeInteger(value, `values[${index}]`, 0))
    .sort((left, right) => left - right);
  const rank = Math.ceil(percentile * sorted.length);
  const selected = sorted[rank - 1];
  if (selected === undefined) throw new TypeError("nearest-rank selection was empty");
  return selected;
}

function summarizeGroup(captures) {
  const firstCapture = captures[0];
  if (firstCapture === undefined) throw new TypeError("evidence group must not be empty");

  const metrics = new Map();
  const capturePresence = new Map();
  const missing = new Map();
  const warnings = [];
  let droppedRustEvents = 0;

  for (const capture of captures) {
    droppedRustEvents += capture.rustSnapshot.droppedEvents;
    if (capture.rustSnapshot.droppedEvents > 0) {
      warnings.push(
        `sample ${capture.sampleIndex} dropped ${capture.rustSnapshot.droppedEvents} Rust event(s)`,
      );
    }
    const extracted = extractMetrics(capture);
    for (const [name, capturedValues] of extracted) {
      if (capturedValues.length === 0) continue;
      const values = metrics.get(name) ?? [];
      values.push(...capturedValues);
      metrics.set(name, values);
      capturePresence.set(name, (capturePresence.get(name) ?? 0) + 1);
    }
  }

  for (const name of expectedMetricNames(firstCapture.scenario)) {
    const presentCaptures = capturePresence.get(name) ?? 0;
    const count = captures.length - presentCaptures;
    if (count > 0) missing.set(name, count);
  }

  return Object.freeze({
    scenario: firstCapture.scenario,
    classification: firstCapture.classification,
    sampleCount: captures.length,
    droppedRustEvents,
    missingMetrics: Object.freeze(
      [...missing.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, count]) => Object.freeze({ name, count })),
    ),
    metrics: Object.freeze(
      [...metrics.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, values]) => summarizeMetric(name, values, firstCapture)),
    ),
    warnings: Object.freeze([...new Set(warnings)].sort()),
  });
}

function summarizeMetric(name, values, capture) {
  const sorted = [...values].sort((left, right) => left - right);
  const minimum = sorted[0];
  const maximum = sorted[sorted.length - 1];
  if (minimum === undefined || maximum === undefined) {
    throw new TypeError(`metric ${name} must contain at least one observation`);
  }
  const summary = {
    name,
    unit: "microseconds",
    count: sorted.length,
    min: minimum,
    p50: nearestRank(sorted, 0.5),
    p95: nearestRank(sorted, 0.95),
    p99: nearestRank(sorted, 0.99),
    max: maximum,
  };
  return Object.freeze({
    ...summary,
    budget: classifyBudget(name, summary, capture),
  });
}

function classifyBudget(name, summary, capture) {
  const thresholds = budgetThresholds(name, capture);
  if (
    thresholds.p50MaximumMicros === null &&
    thresholds.p95MaximumMicros === null &&
    thresholds.p99MaximumMicros === null
  ) {
    return UNBUDGETED;
  }

  const warning =
    exceeds(summary.p50, thresholds.p50MaximumMicros) ||
    exceeds(summary.p95, thresholds.p95MaximumMicros) ||
    exceeds(summary.p99, thresholds.p99MaximumMicros);
  return Object.freeze({
    status: warning ? "warning" : "within-target",
    ...thresholds,
  });
}

function budgetThresholds(name, capture) {
  if (name === "external.processToShellFmpMicros") {
    if (capture.classification.process === "cold-process") {
      return Object.freeze({
        p50MaximumMicros: 1_200_000,
        p95MaximumMicros: 2_500_000,
        p99MaximumMicros: null,
      });
    }
    return Object.freeze({
      p50MaximumMicros: 700_000,
      p95MaximumMicros: 1_500_000,
      p99MaximumMicros: null,
    });
  }
  if (name.startsWith("rust.queue_wait.")) {
    return Object.freeze({
      p50MaximumMicros: null,
      p95MaximumMicros: 5_000,
      p99MaximumMicros: 25_000,
    });
  }
  if (capture.scenario === "load-persisted-context" && name === "browser.month.load") {
    return Object.freeze({
      p50MaximumMicros: null,
      p95MaximumMicros: 25_000,
      p99MaximumMicros: 75_000,
    });
  }
  if (
    (capture.scenario === "begin-month-run" && name === "browser.month.begin") ||
    (capture.scenario === "resume-month-run" && name === "browser.month.resume") ||
    (capture.scenario === "final-commit" && name === "browser.month.commit")
  ) {
    return Object.freeze({
      p50MaximumMicros: null,
      p95MaximumMicros: 200_000,
      p99MaximumMicros: null,
    });
  }
  return UNBUDGETED;
}

function exceeds(actual, maximum) {
  return maximum !== null && actual > maximum;
}

function extractMetrics(capture) {
  const metrics = new Map();
  const rustMarks = new Map();
  for (const event of capture.rustSnapshot.events) {
    if (event.durationMicros !== null) {
      pushMetric(
        metrics,
        `rust.${rustEventMetricName(event.name)}.${event.category}`,
        event.durationMicros,
      );
    } else if (!rustMarks.has(event.name)) {
      rustMarks.set(event.name, event.atMicros);
    }
  }
  addDifference(
    metrics,
    "rust.process_to_persistence_ready",
    rustMarks,
    "processEntry",
    "persistenceWorkerReady",
  );
  addDifference(
    metrics,
    "rust.process_to_main_window",
    rustMarks,
    "processEntry",
    "mainWindowAvailable",
  );
  addDifference(metrics, "rust.tauri_setup", rustMarks, "tauriSetupStart", "tauriSetupComplete");

  const browserMarks = new Map();
  for (const entry of capture.browserEntries) {
    if (entry.entryType === "measure") {
      pushMetric(metrics, `browser.${entry.name}`, entry.durationMicros);
    } else if (!browserMarks.has(entry.name)) {
      browserMarks.set(entry.name, entry.startMicros);
    }
  }
  addDifference(
    metrics,
    "browser.renderer_to_shell_commit",
    browserMarks,
    "app.renderer_bootstrap",
    "app.react_shell_commit",
  );
  addDifference(
    metrics,
    "browser.renderer_to_january_ready",
    browserMarks,
    "app.renderer_bootstrap",
    "app.january_session_ready",
  );
  addDifference(
    metrics,
    "browser.renderer_to_first_meaningful_paint",
    browserMarks,
    "app.renderer_bootstrap",
    "app.first_meaningful_paint",
  );

  for (const [name, value] of Object.entries(capture.externalDurationsMicros)) {
    pushMetric(metrics, `external.${name}`, value);
  }
  return metrics;
}

function expectedMetricNames(scenario) {
  const common = [
    "rust.process_to_persistence_ready",
    "rust.process_to_main_window",
    "rust.tauri_setup",
  ];
  switch (scenario) {
    case "startup-shell-fmp":
      return new Set([
        ...common,
        "browser.renderer_to_shell_commit",
        "browser.renderer_to_first_meaningful_paint",
        "external.processToShellFmpMicros",
      ]);
    case "startup-january-ready":
      return new Set([
        ...common,
        "browser.renderer_to_january_ready",
        "external.processToJanuaryReadyMicros",
      ]);
    case "load-persisted-context":
      return new Set(["browser.month.load"]);
    case "begin-month-run":
      return new Set(["browser.month.begin"]);
    case "resume-month-run":
      return new Set(["browser.month.resume"]);
    case "final-commit":
      return new Set(["browser.month.commit"]);
    default:
      return new Set();
  }
}

function pushMetric(metrics, name, value) {
  const values = metrics.get(name) ?? [];
  values.push(value);
  metrics.set(name, values);
}

function addDifference(metrics, name, marks, start, end) {
  const startValue = marks.get(start);
  const endValue = marks.get(end);
  if (startValue === undefined || endValue === undefined || endValue < startValue) return;
  pushMetric(metrics, name, endValue - startValue);
}

function rustEventMetricName(name) {
  switch (name) {
    case "tauriCommandDispatch":
      return "command_dispatch";
    case "persistenceQueueWait":
      return "queue_wait";
    case "persistenceDatabaseOperation":
      return "database_operation";
    default:
      throw new TypeError(`unsupported Rust span name ${name}`);
  }
}

function parseHost(value, label) {
  const host = requireRecord(value, label);
  requireExactKeys(host, ["os", "arch", "logicalProcessors", "memoryMiB", "cpuModel"], label);
  if (host.os !== "windows") throw new TypeError(`${label}.os must be windows`);
  return Object.freeze({
    os: "windows",
    arch: requireClosedString(host.arch, new Set(["x64", "arm64"]), `${label}.arch`),
    logicalProcessors: requireSafeInteger(host.logicalProcessors, `${label}.logicalProcessors`, 1),
    memoryMiB: requireSafeInteger(host.memoryMiB, `${label}.memoryMiB`, 1),
    cpuModel: requireBoundedString(host.cpuModel, `${label}.cpuModel`, 1, 160),
  });
}

function parseClassification(value, label) {
  const classification = requireRecord(value, label);
  requireExactKeys(classification, ["process", "osCache", "database", "sampleRole"], label);
  return Object.freeze({
    process: requireClosedString(classification.process, PROCESS_CLASSES, `${label}.process`),
    osCache: requireClosedString(classification.osCache, CACHE_CLASSES, `${label}.osCache`),
    database: requireClosedString(classification.database, DATABASE_CLASSES, `${label}.database`),
    sampleRole: requireClosedString(classification.sampleRole, SAMPLE_ROLES, `${label}.sampleRole`),
  });
}

function parseExternalDurations(value, label) {
  const durations = requireRecord(value, label);
  for (const key of Object.keys(durations)) {
    if (!EXTERNAL_METRIC_NAMES.has(key)) {
      throw new TypeError(`${label} contains unsupported metric ${key}`);
    }
  }
  return Object.freeze(
    Object.fromEntries(
      Object.entries(durations)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, duration]) => [name, requireSafeInteger(duration, `${label}.${name}`, 0)]),
    ),
  );
}

function parseRustSnapshot(value, label) {
  const snapshot = requireRecord(value, label);
  requireExactKeys(snapshot, ["schemaVersion", "events", "droppedEvents"], label);
  if (snapshot.schemaVersion !== RUST_SNAPSHOT_SCHEMA) {
    throw new TypeError(`${label}.schemaVersion must be ${RUST_SNAPSHOT_SCHEMA}`);
  }
  return Object.freeze({
    schemaVersion: RUST_SNAPSHOT_SCHEMA,
    events: Object.freeze(
      requireArray(snapshot.events, `${label}.events`).map((event, index) =>
        parseRustEvent(event, `${label}.events[${index}]`),
      ),
    ),
    droppedEvents: requireSafeInteger(snapshot.droppedEvents, `${label}.droppedEvents`, 0),
  });
}

function parseRustEvent(value, label) {
  const event = requireRecord(value, label);
  requireExactKeys(
    event,
    ["name", "atMicros", "durationMicros", "category", "operationId", "queueDepth"],
    label,
  );
  const name = requireClosedString(event.name, RUST_EVENT_NAMES, `${label}.name`);
  const atMicros = requireSafeInteger(event.atMicros, `${label}.atMicros`, 0);

  if (RUST_MARK_NAMES.has(name)) {
    if (
      event.durationMicros !== null ||
      event.category !== null ||
      event.operationId !== null ||
      event.queueDepth !== null
    ) {
      throw new TypeError(`${label} must be a startup mark with null operation fields`);
    }
    return Object.freeze({
      name,
      atMicros,
      durationMicros: null,
      category: null,
      operationId: null,
      queueDepth: null,
    });
  }

  if (event.durationMicros === null || event.category === null || event.operationId === null) {
    throw new TypeError(
      `${label} must be an operation span with duration, category and operationId`,
    );
  }
  const durationMicros = requireSafeInteger(event.durationMicros, `${label}.durationMicros`, 0);
  const category = requireClosedString(event.category, RUST_CATEGORIES, `${label}.category`);
  const operationId = requireSafeInteger(event.operationId, `${label}.operationId`, 0);
  let queueDepth = null;
  if (name === "persistenceQueueWait") {
    queueDepth = requireSafeInteger(event.queueDepth, `${label}.queueDepth`, 1);
    if (queueDepth > PERSISTENCE_QUEUE_CAPACITY) {
      throw new TypeError(`${label}.queueDepth must be <= ${PERSISTENCE_QUEUE_CAPACITY}`);
    }
  } else if (event.queueDepth !== null) {
    throw new TypeError(`${label}.queueDepth must be null outside persistenceQueueWait`);
  }

  return Object.freeze({
    name,
    atMicros,
    durationMicros,
    category,
    operationId,
    queueDepth,
  });
}

function parseBrowserEntry(value, label) {
  const entry = requireRecord(value, label);
  requireExactKeys(entry, ["name", "entryType", "startMicros", "durationMicros"], label);
  const name = requireClosedString(entry.name, BROWSER_ENTRY_NAMES, `${label}.name`);
  const entryType = requireClosedString(entry.entryType, BROWSER_ENTRY_TYPES, `${label}.entryType`);
  const startMicros = requireSafeInteger(entry.startMicros, `${label}.startMicros`, 0);
  const durationMicros = requireSafeInteger(entry.durationMicros, `${label}.durationMicros`, 0);

  if (BROWSER_MARK_NAMES.has(name)) {
    if (entryType !== "mark" || durationMicros !== 0) {
      throw new TypeError(`${label} must be a browser mark with zero duration`);
    }
  } else if (entryType !== "measure") {
    throw new TypeError(`${label} must be a browser measure`);
  }

  return Object.freeze({ name, entryType, startMicros, durationMicros });
}

function assertComparableSource(captures) {
  const firstCapture = captures[0];
  if (firstCapture === undefined) throw new TypeError("captures must not be empty");
  const reference = JSON.stringify({ commit: firstCapture.commit, host: firstCapture.host });
  for (let index = 1; index < captures.length; index += 1) {
    const candidate = JSON.stringify({
      commit: captures[index].commit,
      host: captures[index].host,
    });
    if (candidate !== reference) {
      throw new TypeError(`captures[${index}] has a different commit or host profile`);
    }
  }
}

function assertUniqueCaptureIdentity(captures) {
  const identities = new Set();
  for (let index = 0; index < captures.length; index += 1) {
    const identity = captureIdentity(captures[index]);
    if (identities.has(identity)) {
      throw new TypeError(`captures[${index}] has a duplicate capture identity`);
    }
    identities.add(identity);
  }
}

function captureIdentity(capture) {
  return `${captureSortKey(capture)}|${capture.sampleIndex}`;
}

function captureSortKey(capture) {
  return `${groupKey(capture)}|${capture.classification.sampleRole}`;
}

function groupKey(capture) {
  const classification = capture.classification;
  return [
    capture.scenario,
    classification.process,
    classification.osCache,
    classification.database,
  ].join("|");
}

function requireRecord(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value;
}

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`);
  return value;
}

function requireExactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const required = [...expected].sort();
  if (actual.length !== required.length || actual.some((key, index) => key !== required[index])) {
    throw new TypeError(`${label} must contain exactly: ${required.join(", ")}`);
  }
}

function requireClosedString(value, allowed, label) {
  if (typeof value !== "string" || !allowed.has(value)) {
    throw new TypeError(`${label} has an unsupported value`);
  }
  return value;
}

function requireBoundedString(value, label, minimum, maximum) {
  if (typeof value !== "string" || value.length < minimum || value.length > maximum) {
    throw new TypeError(`${label} must be a string with length ${minimum}..${maximum}`);
  }
  return value;
}

function requireCommit(value, label) {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/u.test(value)) {
    throw new TypeError(`${label} must be a lowercase 40-character Git SHA`);
  }
  return value;
}

function requireSafeInteger(value, label, minimum) {
  if (!Number.isSafeInteger(value) || value < minimum || value > MAX_SAFE_INTEGER) {
    throw new TypeError(`${label} must be a safe integer >= ${minimum}`);
  }
  return value;
}

export const DESKTOP_EVIDENCE_SCHEMAS = Object.freeze({
  capture: CAPTURE_SCHEMA,
  report: REPORT_SCHEMA,
});
