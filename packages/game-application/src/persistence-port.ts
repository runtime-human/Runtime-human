export type PersistenceInvokePort = <T>(
  command: string,
  arguments_: Readonly<Record<string, unknown>>,
) => Promise<T>;

export const PERSISTENCE_COMMANDS = Object.freeze({
  createSave: "persistence_create_save_v1",
  loadSave: "persistence_load_save_v1",
  beginMonthRun: "persistence_begin_month_run_v1",
  loadMonthRun: "persistence_load_month_run_v1",
  loadActiveMonthRun: "persistence_load_active_month_run_v1",
  storeMonthRunBoundary: "persistence_store_month_run_boundary_v1",
  commitMonthRun: "persistence_commit_month_run_v1",
  createBackup: "persistence_create_backup_v1",
  getRecoveryStatus: "persistence_get_recovery_status_v1",
} as const);
