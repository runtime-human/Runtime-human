import type { EvidenceBrowser } from "./wdio-types.js";

export type RustPerformanceSnapshot = Readonly<{
  schemaVersion: "runtime-human-desktop-performance-snapshot-v1";
  events: readonly Readonly<{
    name: string;
    atMicros: number;
    durationMicros: number | null;
    category: string | null;
    operationId: number | null;
    queueDepth: number | null;
  }>[];
  droppedEvents: number;
}>;

export async function captureRustPerformanceSnapshot(
  browser: EvidenceBrowser,
): Promise<RustPerformanceSnapshot> {
  return browser.execute(async () => {
    const globalWithTauri = globalThis as typeof globalThis & {
      __TAURI__?: {
        core?: {
          invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
        };
      };
    };
    const invoke = globalWithTauri.__TAURI__?.core?.invoke;
    if (invoke === undefined) {
      throw new Error("Evidence build does not expose window.__TAURI__.core.invoke");
    }
    return invoke<RustPerformanceSnapshot>("desktop_get_performance_snapshot_v1");
  });
}
