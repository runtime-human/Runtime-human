import {
  parseBackupMetadata,
  parseBeginPersistedMonthRunAccepted,
  parseBeginPersistedMonthRunCommand,
  parseCommitPersistedMonthRunAccepted,
  parseCommitPersistedMonthRunCommand,
  parseCreateBackupCommand,
  parseCreateSaveAccepted,
  parseCreateSaveCommand,
  parseGetRecoveryStatusQuery,
  parseLoadActiveMonthRunQuery,
  parseLoadMonthRunQuery,
  parseLoadSaveQuery,
  parseMonthRunRecord,
  parsePersistenceMutationResult,
  parsePersistenceQueryResult,
  parseRecoveryStatus,
  parseSaveRecord,
  parseStoreMonthRunBoundaryAccepted,
  parseStoreMonthRunBoundaryCommand,
  type BackupMetadataV1,
  type BeginPersistedMonthRunAcceptedV1,
  type BeginPersistedMonthRunCommandV1,
  type CommitPersistedMonthRunAcceptedV1,
  type CommitPersistedMonthRunCommandV1,
  type CreateBackupCommandV1,
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
  createBackup(
    command: CreateBackupCommandV1,
  ): Promise<PersistenceMutationResultV1<BackupMetadataV1>>;
  getRecoveryStatus(
    query: GetRecoveryStatusQueryV1,
  ): Promise<PersistenceQueryResultV1<RecoveryStatusV1>>;
}>;

export function createPersistenceService(invoke: PersistenceInvokePort): PersistenceService {
  return {
    async createSave(command) {
      const parsed = parseCreateSaveCommand(command);
      const response = await invoke<unknown>(PERSISTENCE_COMMANDS.createSave, { command: parsed });
      return parsePersistenceMutationResult(response, parseCreateSaveAccepted);
    },
    async loadSave(query) {
      const parsed = parseLoadSaveQuery(query);
      const response = await invoke<unknown>(PERSISTENCE_COMMANDS.loadSave, { query: parsed });
      return parsePersistenceQueryResult(response, parseSaveRecord);
    },
    async beginMonthRun(command) {
      const parsed = parseBeginPersistedMonthRunCommand(command);
      const response = await invoke<unknown>(PERSISTENCE_COMMANDS.beginMonthRun, {
        command: parsed,
      });
      return parsePersistenceMutationResult(response, parseBeginPersistedMonthRunAccepted);
    },
    async loadMonthRun(query) {
      const parsed = parseLoadMonthRunQuery(query);
      const response = await invoke<unknown>(PERSISTENCE_COMMANDS.loadMonthRun, { query: parsed });
      return parsePersistenceQueryResult(response, parseMonthRunRecord);
    },
    async loadActiveMonthRun(query) {
      const parsed = parseLoadActiveMonthRunQuery(query);
      const response = await invoke<unknown>(PERSISTENCE_COMMANDS.loadActiveMonthRun, {
        query: parsed,
      });
      return parsePersistenceQueryResult(response, parseMonthRunRecord);
    },
    async storeMonthRunBoundary(command) {
      const parsed = parseStoreMonthRunBoundaryCommand(command);
      const response = await invoke<unknown>(PERSISTENCE_COMMANDS.storeMonthRunBoundary, {
        command: parsed,
      });
      return parsePersistenceMutationResult(response, parseStoreMonthRunBoundaryAccepted);
    },
    async commitMonthRun(command) {
      const parsed = parseCommitPersistedMonthRunCommand(command);
      const response = await invoke<unknown>(PERSISTENCE_COMMANDS.commitMonthRun, {
        command: parsed,
      });
      return parsePersistenceMutationResult(response, parseCommitPersistedMonthRunAccepted);
    },
    async createBackup(command) {
      const parsed = parseCreateBackupCommand(command);
      const response = await invoke<unknown>(PERSISTENCE_COMMANDS.createBackup, {
        command: parsed,
      });
      return parsePersistenceMutationResult(response, parseBackupMetadata);
    },
    async getRecoveryStatus(query) {
      const parsed = parseGetRecoveryStatusQuery(query);
      const response = await invoke<unknown>(PERSISTENCE_COMMANDS.getRecoveryStatus, {
        query: parsed,
      });
      return parsePersistenceQueryResult(response, parseRecoveryStatus);
    },
  };
}
