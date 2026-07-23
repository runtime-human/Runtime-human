import type { MonthRunStep } from "@runtime-human/game-core";
import type {
  AuthoritativeJsonValue,
  BeginMonthCommandV1,
  MonthRunCheckpointV1,
  MonthRunCompatibilityV1,
  MonthRunProtocolError,
  ResumeMonthCommandV1,
  SaveId,
} from "@runtime-human/game-schema";
import type {
  MonthRunRecordV1,
  PersistenceErrorV1,
  RecoveryStatusV1,
  SaveRecordV1,
} from "@runtime-human/game-persistence-contracts";

import type { PersistenceService } from "./persistence-service";

export type PersistedMonthRunError = Readonly<{
  category: "protocol" | "persistence" | "transport" | "contract";
  code: string;
  message: string;
  retryable: boolean;
  protocolError?: MonthRunProtocolError;
  persistenceError?: PersistenceErrorV1;
}>;

export type PersistedMonthRunResult =
  | Readonly<{ kind: "idle"; save: SaveRecordV1 | null }>
  | Readonly<{
      kind: "waiting-decision";
      save: SaveRecordV1;
      run: MonthRunRecordV1;
      checkpoint: MonthRunCheckpointV1;
    }>
  | Readonly<{
      kind: "committed";
      save: SaveRecordV1;
      run: MonthRunRecordV1;
      checkpoint: MonthRunCheckpointV1;
    }>
  | Readonly<{
      kind: "terminal";
      save: SaveRecordV1;
      run: MonthRunRecordV1;
      checkpoint: MonthRunCheckpointV1;
    }>
  | Readonly<{
      kind: "blocked";
      reason:
        | "recovery"
        | "incompatible-persistence"
        | "incompatible-checkpoint"
        | "corrupted-checkpoint";
      message: string;
      recovery: RecoveryStatusV1 | null;
      save: SaveRecordV1 | null;
      run: MonthRunRecordV1 | null;
    }>
  | Readonly<{ kind: "rejected"; error: PersistedMonthRunError }>;

export type PersistedMonthRunCommitMaterializer = (input: Readonly<{
  save: SaveRecordV1;
  completedCheckpoint: MonthRunCheckpointV1;
}>) => Readonly<{
  snapshot: AuthoritativeJsonValue;
  result: AuthoritativeJsonValue;
}>;

export type PersistedMonthRunOrchestratorOptions = Readonly<{
  persistence: PersistenceService;
  steps: readonly MonthRunStep[];
  expectedCompatibility: MonthRunCompatibilityV1;
  materializeCommit: PersistedMonthRunCommitMaterializer;
}>;

export type PersistedMonthRunOrchestrator = Readonly<{
  load(saveId: SaveId): Promise<PersistedMonthRunResult>;
  begin(command: BeginMonthCommandV1): Promise<PersistedMonthRunResult>;
  resume(command: ResumeMonthCommandV1): Promise<PersistedMonthRunResult>;
  retry(): Promise<PersistedMonthRunResult>;
}>;
