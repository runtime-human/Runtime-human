import type { StartupCaptureOptions } from "./capture-options.js";

export type StartupDatabasePreparationPorts<Session> = Readonly<{
  startSession(): Promise<Session>;
  waitUntilReady(session: Session): Promise<void>;
  cleanupSession(session: Session): Promise<void>;
  assertDatabaseExists(): Promise<void>;
}>;

export async function prepareStartupDatabasePopulation<Session>(
  database: StartupCaptureOptions["database"],
  ports: StartupDatabasePreparationPorts<Session>,
): Promise<void> {
  if (database === "new-database") return;

  const session = await ports.startSession();
  try {
    await ports.waitUntilReady(session);
  } finally {
    await ports.cleanupSession(session);
  }
  await ports.assertDatabaseExists();
}
