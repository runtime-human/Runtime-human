use std::{sync::Arc, time::Instant};

use tauri::State;

use crate::desktop_performance::{
    DesktopPerformanceEventName, DesktopPerformanceOperationCategory, DesktopPerformanceRecorder,
};

use super::{
    BackupMetadataV1, BeginPersistedMonthRunAcceptedV1, BeginPersistedMonthRunCommandV1,
    CommitPersistedMonthRunAcceptedV1, CommitPersistedMonthRunCommandV1, CreateBackupCommandV1,
    CreateSaveAcceptedV1, CreateSaveCommandV1, GetRecoveryStatusQueryV1, LoadActiveMonthRunQueryV1,
    LoadMonthRunQueryV1, LoadSaveQueryV1, MonthRunRecordV1, PersistenceHandle,
    PersistenceMutationResultV1, PersistenceQueryResultV1, RecoveryStatusV1, SaveRecordV1,
    StoreMonthRunBoundaryAcceptedV1, StoreMonthRunBoundaryCommandV1,
};

pub(crate) type ManagedPersistence = Arc<PersistenceHandle>;
type CommandResult<T> = Result<T, ()>;

#[tauri::command]
pub(crate) async fn persistence_create_save_v1(
    state: State<'_, ManagedPersistence>,
    performance: State<'_, DesktopPerformanceRecorder>,
    command: CreateSaveCommandV1,
) -> CommandResult<PersistenceMutationResultV1<CreateSaveAcceptedV1>> {
    let handle = Arc::clone(state.inner());
    let operation_id = performance.next_operation_id();
    Ok(run_blocking_observed(
        performance.inner().clone(),
        DesktopPerformanceOperationCategory::Mutation,
        operation_id,
        move || handle.create_save_with_operation_id(command, operation_id),
    )
    .await
    .into())
}

#[tauri::command]
pub(crate) async fn persistence_load_save_v1(
    state: State<'_, ManagedPersistence>,
    performance: State<'_, DesktopPerformanceRecorder>,
    query: LoadSaveQueryV1,
) -> CommandResult<PersistenceQueryResultV1<SaveRecordV1>> {
    let handle = Arc::clone(state.inner());
    let operation_id = performance.next_operation_id();
    Ok(run_blocking_observed(
        performance.inner().clone(),
        DesktopPerformanceOperationCategory::Query,
        operation_id,
        move || handle.load_save_with_operation_id(query, operation_id),
    )
    .await
    .into())
}

#[tauri::command]
pub(crate) async fn persistence_begin_month_run_v1(
    state: State<'_, ManagedPersistence>,
    performance: State<'_, DesktopPerformanceRecorder>,
    command: BeginPersistedMonthRunCommandV1,
) -> CommandResult<PersistenceMutationResultV1<BeginPersistedMonthRunAcceptedV1>> {
    let handle = Arc::clone(state.inner());
    let operation_id = performance.next_operation_id();
    Ok(run_blocking_observed(
        performance.inner().clone(),
        DesktopPerformanceOperationCategory::Mutation,
        operation_id,
        move || handle.begin_month_run_with_operation_id(command, operation_id),
    )
    .await
    .into())
}

#[tauri::command]
pub(crate) async fn persistence_load_month_run_v1(
    state: State<'_, ManagedPersistence>,
    performance: State<'_, DesktopPerformanceRecorder>,
    query: LoadMonthRunQueryV1,
) -> CommandResult<PersistenceQueryResultV1<MonthRunRecordV1>> {
    let handle = Arc::clone(state.inner());
    let operation_id = performance.next_operation_id();
    Ok(run_blocking_observed(
        performance.inner().clone(),
        DesktopPerformanceOperationCategory::Query,
        operation_id,
        move || handle.load_month_run_with_operation_id(query, operation_id),
    )
    .await
    .into())
}

#[tauri::command]
pub(crate) async fn persistence_load_active_month_run_v1(
    state: State<'_, ManagedPersistence>,
    performance: State<'_, DesktopPerformanceRecorder>,
    query: LoadActiveMonthRunQueryV1,
) -> CommandResult<PersistenceQueryResultV1<MonthRunRecordV1>> {
    let handle = Arc::clone(state.inner());
    let operation_id = performance.next_operation_id();
    Ok(run_blocking_observed(
        performance.inner().clone(),
        DesktopPerformanceOperationCategory::Query,
        operation_id,
        move || handle.load_active_month_run_with_operation_id(query, operation_id),
    )
    .await
    .into())
}

#[tauri::command]
pub(crate) async fn persistence_store_month_run_boundary_v1(
    state: State<'_, ManagedPersistence>,
    performance: State<'_, DesktopPerformanceRecorder>,
    command: StoreMonthRunBoundaryCommandV1,
) -> CommandResult<PersistenceMutationResultV1<StoreMonthRunBoundaryAcceptedV1>> {
    let handle = Arc::clone(state.inner());
    let operation_id = performance.next_operation_id();
    Ok(run_blocking_observed(
        performance.inner().clone(),
        DesktopPerformanceOperationCategory::Mutation,
        operation_id,
        move || handle.store_boundary_with_operation_id(command, operation_id),
    )
    .await
    .into())
}

#[tauri::command]
pub(crate) async fn persistence_commit_month_run_v1(
    state: State<'_, ManagedPersistence>,
    performance: State<'_, DesktopPerformanceRecorder>,
    command: CommitPersistedMonthRunCommandV1,
) -> CommandResult<PersistenceMutationResultV1<CommitPersistedMonthRunAcceptedV1>> {
    let handle = Arc::clone(state.inner());
    let operation_id = performance.next_operation_id();
    Ok(run_blocking_observed(
        performance.inner().clone(),
        DesktopPerformanceOperationCategory::Mutation,
        operation_id,
        move || handle.commit_month_run_with_operation_id(command, operation_id),
    )
    .await
    .into())
}

#[tauri::command]
pub(crate) async fn persistence_create_backup_v1(
    state: State<'_, ManagedPersistence>,
    performance: State<'_, DesktopPerformanceRecorder>,
    command: CreateBackupCommandV1,
) -> CommandResult<PersistenceMutationResultV1<BackupMetadataV1>> {
    let handle = Arc::clone(state.inner());
    let operation_id = performance.next_operation_id();
    Ok(run_blocking_observed(
        performance.inner().clone(),
        DesktopPerformanceOperationCategory::Backup,
        operation_id,
        move || handle.create_backup_with_operation_id(command, operation_id),
    )
    .await
    .into())
}

#[tauri::command]
pub(crate) async fn persistence_get_recovery_status_v1(
    state: State<'_, ManagedPersistence>,
    performance: State<'_, DesktopPerformanceRecorder>,
    query: GetRecoveryStatusQueryV1,
) -> CommandResult<PersistenceQueryResultV1<RecoveryStatusV1>> {
    let handle = Arc::clone(state.inner());
    let operation_id = performance.next_operation_id();
    let result = run_blocking_observed(
        performance.inner().clone(),
        DesktopPerformanceOperationCategory::Recovery,
        operation_id,
        move || {
            query.validate()?;
            handle
                .recovery_status_with_operation_id(operation_id)
                .map(Some)
        },
    )
    .await;
    Ok(result.into())
}

pub(super) async fn run_blocking_observed<T: Send + 'static>(
    performance: DesktopPerformanceRecorder,
    category: DesktopPerformanceOperationCategory,
    operation_id: u64,
    operation: impl FnOnce() -> Result<T, super::PersistenceError> + Send + 'static,
) -> Result<T, super::PersistenceError> {
    let started = Instant::now();
    let result = tauri::async_runtime::spawn_blocking(operation)
        .await
        .map_err(|_| super::PersistenceError::Unavailable)?;
    performance.record_duration(
        DesktopPerformanceEventName::TauriCommandDispatch,
        started.elapsed(),
        Some(category),
        Some(operation_id),
        None,
    );
    result
}
