import type { startWdioSession } from "@wdio/tauri-service";

export type EvidenceBrowser = Awaited<ReturnType<typeof startWdioSession>>;
