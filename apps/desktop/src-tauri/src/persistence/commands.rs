use std::sync::Arc;

use tauri::State;

use super::{
    BackupMetadataV1, BeginPersistedMonthRunAcceptedV1, BeginPersistedMonthRunCommandV1,
    CommitPersistedMonthRunAcceptedV1, CommitPersistedMonthRunCommandV1, CreateBackupCommandV1,
    CreateSaveAcceptedV1, CreateSaveCommandV1, GetRecoveryStatusQueryV1, LoadActiveMonthRunQueryV1,
    LoadMonthRunQueryV1, LoadSaveQueryV1, MonthRunRecordV1, PersistenceHandle,
    PersistenceMutationResultV1, PersistenceQueryResultV1, RecoveryStatusV1, SaveRecordV1,
    StoreMonthRunBoundaryAcceptedV1, StoreMonthRunBoundaryCommandV1,
};

pub(crate) type ManagedPersistence = Arc<PersistenceHandle>;

#[tauri::command]
pub(crate) async fn persistence_create_save_v1(
    state: State<'_, ManagedPersistence>,
    command: CreateSaveCommandV1,
) -> PersistenceMutationResultV1<CreateSaveAcceptedV1> {
    let handle = Arc::clone(state.inner());
    run_blocking(move || handle.create_save(command))
        .await
        .into()
}

#[tauri::command]
pub(crate) async fn persistence_load_save_v1(
    state: State<'_, ManagedPersistence>,
    query: LoadSaveQueryV1,
) -> PersistenceQueryResultV1<SaveRecordV1> {
    let handle = Arc::clone(state.inner());
    run_blocking(move || handle.load_save(query)).await.into()
}

#[tauri::command]
pub(crate) async fn persistence_begin_month_run_v1(
    state: State<'_, ManagedPersistence>,
    command: BeginPersistedMonthRunCommandV1,
) -> PersistenceMutationResultV1<BeginPersistedMonthRunAcceptedV1> {
    let handle = Arc::clone(state.inner());
    run_blocking(move || handle.begin_month_run(command))
        .await
        .into()
}

#[tauri::command]
pub(crate) async fn persistence_load_month_run_v1(
    state: State<'_, ManagedPersistence>,
    query: LoadMonthRunQueryV1,
) -> PersistenceQueryResultV1<MonthRunRecordV1> {
    let handle = Arc::clone(state.inner());
    run_blocking(move || handle.load_month_run(query))
        .await
        .into()
}

#[tauri::command]
pub(crate) async fn persistence_load_active_month_run_v1(
    state: State<'_, ManagedPersistence>,
    query: LoadActiveMonthRunQueryV1,
) -> PersistenceQueryResultV1<MonthRunRecordV1> {
    let handle = Arc::clone(state.inner());
    run_blocking(move || handle.load_active_month_run(query))
        .await
        .into()
}

#[tauri::command]
pub(crate) async fn persistence_store_month_run_boundary_v1(
    state: State<'_, ManagedPersistence>,
    command: StoreMonthRunBoundaryCommandV1,
) -> PersistenceMutationResultV1<StoreMonthRunBoundaryAcceptedV1> {
    let handle = Arc::clone(state.inner());
    run_blocking(move || handle.store_boundary(command))
        .await
        .into()
}

#[tauri::command]
pub(crate) async fn persistence_commit_month_run_v1(
    state: State<'_, ManagedPersistence>,
    command: CommitPersistedMonthRunCommandV1,
) -> PersistenceMutationResultV1<CommitPersistedMonthRunAcceptedV1> {
    let handle = Arc::clone(state.inner());
    run_blocking(move || handle.commit_month_run(command))
        .await
        .into()
}

#[tauri::command]
pub(crate) async fn persistence_create_backup_v1(
    state: State<'_, ManagedPersistence>,
    command: CreateBackupCommandV1,
) -> PersistenceMutationResultV1<BackupMetadataV1> {
    let handle = Arc::clone(state.inner());
    run_blocking(move || handle.create_backup(command))
        .await
        .into()
}

#[tauri::command]
pub(crate) async fn persistence_get_recovery_status_v1(
    state: State<'_, ManagedPersistence>,
    query: GetRecoveryStatusQueryV1,
) -> PersistenceQueryResultV1<RecoveryStatusV1> {
    let handle = Arc::clone(state.inner());
    let result = run_blocking(move || {
        query.validate()?;
        handle.recovery_status().map(Some)
    })
    .await;
    result.into()
}

async fn run_blocking<T: Send + 'static>(
    operation: impl FnOnce() -> Result<T, super::PersistenceError> + Send + 'static,
) -> Result<T, super::PersistenceError> {
    tauri::async_runtime::spawn_blocking(operation)
        .await
        .map_err(|_| super::PersistenceError::Unavailable)?
}
