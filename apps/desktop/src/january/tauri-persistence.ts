import { invoke } from "@tauri-apps/api/core";
import {
  createPersistenceService,
  type PersistenceInvokePort,
  type PersistenceService,
} from "@runtime-human/game-application";

export const tauriPersistenceInvoke: PersistenceInvokePort = <T>(
  command: string,
  arguments_: Readonly<Record<string, unknown>>,
) => invoke<T>(command, arguments_);

export function createTauriPersistenceService(): PersistenceService {
  return createPersistenceService(tauriPersistenceInvoke);
}
