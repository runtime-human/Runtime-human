import {
  parseBeginPersistedMonthRunCommand,
  parseCommitPersistedMonthRunCommand,
  parseCreateSaveCommand,
  parseGetRecoveryStatusQuery,
  parseLoadActiveMonthRunQuery,
  parseLoadMonthRunQuery,
  parseLoadSaveQuery,
  parseStoreMonthRunBoundaryCommand,
  type BeginPersistedMonthRunAcceptedV1,
  type BeginPersistedMonthRunCommandV1,
  type CommitPersistedMonthRunAcceptedV1,
  type CommitPersistedMonthRunCommandV1,
  type CreateSaveAcceptedV1,
  type CreateSaveCommandV1,
  type GetRecoveryStatusQueryV1,
  type LoadActiveMonthRunQueryV1,
  type LoadMonthRunQueryV1,
  type LoadSaveQueryV1,
  type MonthRunRecordV1,
  type PersistenceMutationResultV1,
  type PersistenceQueryResultV1,
  type RecoveryStatusV1,
  type SaveRecordV1,
  type StoreMonthRunBoundaryAcceptedV1,
  type StoreMonthRunBoundaryCommandV1,
} from "@runtime-human/game-persistence-contracts";

import { PERSISTENCE_COMMANDS, type PersistenceInvokePort } from "./persistence-port";

export type PersistenceService = Readonly<{
  createSave(
    command: CreateSaveCommandV1,
  ): Promise<PersistenceMutationResultV1<CreateSaveAcceptedV1>>;
  loadSave(query: LoadSaveQueryV1): Promise<PersistenceQueryResultV1<SaveRecordV1>>;
  beginMonthRun(
    command: BeginPersistedMonthRunCommandV1,
  ): Promise<PersistenceMutationResultV1<BeginPersistedMonthRunAcceptedV1>>;
  loadMonthRun(query: LoadMonthRunQueryV1): Promise<PersistenceQueryResultV1<MonthRunRecordV1>>;
  loadActiveMonthRun(
    query: LoadActiveMonthRunQueryV1,
  ): Promise<PersistenceQueryResultV1<MonthRunRecordV1>>;
  storeMonthRunBoundary(
    command: StoreMonthRunBoundaryCommandV1,
  ): Promise<PersistenceMutationResultV1<StoreMonthRunBoundaryAcceptedV1>>;
  commitMonthRun(
    command: CommitPersistedMonthRunCommandV1,
  ): Promise<PersistenceMutationResultV1<CommitPersistedMonthRunAcceptedV1>>;
  getRecoveryStatus(
    query: GetRecoveryStatusQueryV1,
  ): Promise<PersistenceQueryResultV1<RecoveryStatusV1>>;
}>;

export function createPersistenceService(invoke: PersistenceInvokePort): PersistenceService {
  return {
    async createSave(command) {
      const parsed = parseCreateSaveCommand(command);
      return invoke(PERSISTENCE_COMMANDS.createSave, { command: parsed });
    },
    async loadSave(query) {
      const parsed = parseLoadSaveQuery(query);
      return invoke(PERSISTENCE_COMMANDS.loadSave, { query: parsed });
    },
    async beginMonthRun(command) {
      const parsed = parseBeginPersistedMonthRunCommand(command);
      return invoke(PERSISTENCE_COMMANDS.beginMonthRun, { command: parsed });
    },
    async loadMonthRun(query) {
      const parsed = parseLoadMonthRunQuery(query);
      return invoke(PERSISTENCE_COMMANDS.loadMonthRun, { query: parsed });
    },
    async loadActiveMonthRun(query) {
      const parsed = parseLoadActiveMonthRunQuery(query);
      return invoke(PERSISTENCE_COMMANDS.loadActiveMonthRun, { query: parsed });
    },
    async storeMonthRunBoundary(command) {
      const parsed = parseStoreMonthRunBoundaryCommand(command);
      return invoke(PERSISTENCE_COMMANDS.storeMonthRunBoundary, { command: parsed });
    },
    async commitMonthRun(command) {
      const parsed = parseCommitPersistedMonthRunCommand(command);
      return invoke(PERSISTENCE_COMMANDS.commitMonthRun, { command: parsed });
    },
    async getRecoveryStatus(query) {
      const parsed = parseGetRecoveryStatusQuery(query);
      return invoke(PERSISTENCE_COMMANDS.getRecoveryStatus, { query: parsed });
    },
  };
}
