import type { EvidenceBrowser } from "./wdio-types.js";

const BROWSER_ENTRY_NAMES = Object.freeze([
  "app.renderer_bootstrap",
  "app.react_shell_commit",
  "app.january_session_ready",
  "app.first_meaningful_paint",
  "app.session_bootstrap",
  "content.manifest",
  "content.chunk",
  "content.registry",
  "month.load",
  "month.begin",
  "month.resume",
  "month.commit",
  "month.retry",
] as const);

export type BrowserEvidenceEntry = Readonly<{
  name: (typeof BROWSER_ENTRY_NAMES)[number];
  entryType: "mark" | "measure";
  startMicros: number;
  durationMicros: number;
}>;

export type RendererStartupDiagnostics = Readonly<{
  readyState: string;
  locationHref: string;
  title: string;
  bodyText: string;
  performanceEntries: readonly Readonly<{ name: string; entryType: string }>[];
  tauriCoreInvokeAvailable: boolean;
}>;

export async function waitForFirstMeaningfulPaint(
  browser: EvidenceBrowser,
  timeoutMs = 60_000,
): Promise<void> {
  try {
    await browser.waitUntil(
      async () =>
        browser.execute(
          (name) => globalThis.performance.getEntriesByName(name).length > 0,
          "app.first_meaningful_paint",
        ),
      {
        timeout: timeoutMs,
        interval: 100,
        timeoutMsg: "Runtime Human did not publish app.first_meaningful_paint",
      },
    );
  } catch (error) {
    const diagnostics = await captureRendererStartupDiagnostics(browser).catch(() => null);
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      diagnostics === null
        ? reason
        : `${reason}; rendererDiagnostics=${JSON.stringify(diagnostics)}`,
      { cause: error },
    );
  }
}

export async function captureRendererStartupDiagnostics(
  browser: EvidenceBrowser,
): Promise<RendererStartupDiagnostics> {
  const diagnostics = await browser.execute(() => {
    const tauri = Reflect.get(globalThis, "__TAURI__") as
      | Readonly<{ core?: Readonly<{ invoke?: unknown }> }>
      | undefined;
    return {
      readyState: globalThis.document.readyState,
      locationHref: globalThis.location.href,
      title: globalThis.document.title,
      bodyText: (globalThis.document.body?.innerText ?? "").slice(0, 2_000),
      performanceEntries: globalThis.performance
        .getEntries()
        .slice(0, 100)
        .map((entry) => ({ name: entry.name, entryType: entry.entryType })),
      tauriCoreInvokeAvailable: typeof tauri?.core?.invoke === "function",
    };
  });

  return Object.freeze({
    ...diagnostics,
    performanceEntries: Object.freeze(
      diagnostics.performanceEntries.map((entry) => Object.freeze({ ...entry })),
    ),
  });
}

export async function captureBrowserEntries(
  browser: EvidenceBrowser,
): Promise<readonly BrowserEvidenceEntry[]> {
  const entries = await browser.execute((allowedNames) => {
    const allowed = new Set<string>(allowedNames);
    return globalThis.performance
      .getEntries()
      .filter(
        (entry) =>
          allowed.has(entry.name) && (entry.entryType === "mark" || entry.entryType === "measure"),
      )
      .map((entry) => ({
        name: entry.name,
        entryType: entry.entryType,
        startMicros: Math.round(entry.startTime * 1_000),
        durationMicros: Math.round(entry.duration * 1_000),
      }));
  }, BROWSER_ENTRY_NAMES);

  return Object.freeze(
    entries
      .map((entry) => parseBrowserEntry(entry))
      .sort(
        (left, right) =>
          left.startMicros - right.startMicros || left.name.localeCompare(right.name),
      ),
  );
}

function parseBrowserEntry(value: {
  name: string;
  entryType: string;
  startMicros: number;
  durationMicros: number;
}): BrowserEvidenceEntry {
  if (!BROWSER_ENTRY_NAMES.includes(value.name as BrowserEvidenceEntry["name"])) {
    throw new Error(`Unsupported browser evidence entry: ${value.name}`);
  }
  if (value.entryType !== "mark" && value.entryType !== "measure") {
    throw new Error(`Unsupported browser evidence entry type: ${value.entryType}`);
  }
  if (
    !Number.isSafeInteger(value.startMicros) ||
    value.startMicros < 0 ||
    !Number.isSafeInteger(value.durationMicros) ||
    value.durationMicros < 0
  ) {
    throw new Error(`Browser evidence entry ${value.name} has unsafe timing values`);
  }

  return Object.freeze({
    name: value.name as BrowserEvidenceEntry["name"],
    entryType: value.entryType,
    startMicros: value.startMicros,
    durationMicros: value.durationMicros,
  });
}
