use std::{sync::Arc, time::Instant};

use tauri::State;

use crate::{
    desktop_performance::DesktopPerformanceOperationCategory,
    diagnostics::log_persistence_operation_failed,
};

use super::{
    BackupMetadataV1, BeginPersistedMonthRunAcceptedV1, BeginPersistedMonthRunCommandV1,
    CommitPersistedMonthRunAcceptedV1, CommitPersistedMonthRunCommandV1, CreateBackupCommandV1,
    CreateSaveAcceptedV1, CreateSaveCommandV1, GetRecoveryStatusQueryV1, LoadActiveMonthRunQueryV1,
    LoadMonthRunQueryV1, LoadSaveQueryV1, MonthRunRecordV1, PersistenceError, PersistenceHandle,
    PersistenceMutationResultV1, PersistenceQueryResultV1, RecoveryStatusV1, SaveRecordV1,
    StoreMonthRunBoundaryAcceptedV1, StoreMonthRunBoundaryCommandV1,
    worker::PersistenceOperationContext,
};

pub(crate) type ManagedPersistence = Arc<PersistenceHandle>;
type CommandResult<T> = Result<T, ()>;

#[tauri::command]
pub(crate) async fn persistence_create_save_v1(
    state: State<'_, ManagedPersistence>,
    command: CreateSaveCommandV1,
) -> CommandResult<PersistenceMutationResultV1<CreateSaveAcceptedV1>> {
    let handle = Arc::clone(state.inner());
    Ok(run_blocking_observed(
        handle,
        DesktopPerformanceOperationCategory::Mutation,
        move |handle, operation| handle.create_save_with_operation(command, operation),
    )
    .await
    .into())
}

#[tauri::command]
pub(crate) async fn persistence_load_save_v1(
    state: State<'_, ManagedPersistence>,
    query: LoadSaveQueryV1,
) -> CommandResult<PersistenceQueryResultV1<SaveRecordV1>> {
    let handle = Arc::clone(state.inner());
    Ok(run_blocking_observed(
        handle,
        DesktopPerformanceOperationCategory::Query,
        move |handle, operation| handle.load_save_with_operation(query, operation),
    )
    .await
    .into())
}

#[tauri::command]
pub(crate) async fn persistence_begin_month_run_v1(
    state: State<'_, ManagedPersistence>,
    command: BeginPersistedMonthRunCommandV1,
) -> CommandResult<PersistenceMutationResultV1<BeginPersistedMonthRunAcceptedV1>> {
    let handle = Arc::clone(state.inner());
    Ok(run_blocking_observed(
        handle,
        DesktopPerformanceOperationCategory::Mutation,
        move |handle, operation| handle.begin_month_run_with_operation(command, operation),
    )
    .await
    .into())
}

#[tauri::command]
pub(crate) async fn persistence_load_month_run_v1(
    state: State<'_, ManagedPersistence>,
    query: LoadMonthRunQueryV1,
) -> CommandResult<PersistenceQueryResultV1<MonthRunRecordV1>> {
    let handle = Arc::clone(state.inner());
    Ok(run_blocking_observed(
        handle,
        DesktopPerformanceOperationCategory::Query,
        move |handle, operation| handle.load_month_run_with_operation(query, operation),
    )
    .await
    .into())
}

#[tauri::command]
pub(crate) async fn persistence_load_active_month_run_v1(
    state: State<'_, ManagedPersistence>,
    query: LoadActiveMonthRunQueryV1,
) -> CommandResult<PersistenceQueryResultV1<MonthRunRecordV1>> {
    let handle = Arc::clone(state.inner());
    Ok(run_blocking_observed(
        handle,
        DesktopPerformanceOperationCategory::Query,
        move |handle, operation| handle.load_active_month_run_with_operation(query, operation),
    )
    .await
    .into())
}

#[tauri::command]
pub(crate) async fn persistence_store_month_run_boundary_v1(
    state: State<'_, ManagedPersistence>,
    command: StoreMonthRunBoundaryCommandV1,
) -> CommandResult<PersistenceMutationResultV1<StoreMonthRunBoundaryAcceptedV1>> {
    let handle = Arc::clone(state.inner());
    Ok(run_blocking_observed(
        handle,
        DesktopPerformanceOperationCategory::Mutation,
        move |handle, operation| handle.store_boundary_with_operation(command, operation),
    )
    .await
    .into())
}

#[tauri::command]
pub(crate) async fn persistence_commit_month_run_v1(
    state: State<'_, ManagedPersistence>,
    command: CommitPersistedMonthRunCommandV1,
) -> CommandResult<PersistenceMutationResultV1<CommitPersistedMonthRunAcceptedV1>> {
    let handle = Arc::clone(state.inner());
    Ok(run_blocking_observed(
        handle,
        DesktopPerformanceOperationCategory::Mutation,
        move |handle, operation| handle.commit_month_run_with_operation(command, operation),
    )
    .await
    .into())
}

#[tauri::command]
pub(crate) async fn persistence_create_backup_v1(
    state: State<'_, ManagedPersistence>,
    command: CreateBackupCommandV1,
) -> CommandResult<PersistenceMutationResultV1<BackupMetadataV1>> {
    let handle = Arc::clone(state.inner());
    Ok(run_blocking_observed(
        handle,
        DesktopPerformanceOperationCategory::Backup,
        move |handle, operation| handle.create_backup_with_operation(command, operation),
    )
    .await
    .into())
}

#[tauri::command]
pub(crate) async fn persistence_get_recovery_status_v1(
    state: State<'_, ManagedPersistence>,
    query: GetRecoveryStatusQueryV1,
) -> CommandResult<PersistenceQueryResultV1<RecoveryStatusV1>> {
    let handle = Arc::clone(state.inner());
    let result = run_blocking_observed(
        handle,
        DesktopPerformanceOperationCategory::Recovery,
        move |handle, operation| {
            query.validate()?;
            handle.recovery_status_with_operation(operation).map(Some)
        },
    )
    .await;
    Ok(result.into())
}

pub(super) async fn run_blocking_observed<T: Send + 'static>(
    handle: Arc<PersistenceHandle>,
    category: DesktopPerformanceOperationCategory,
    operation: impl FnOnce(
        Arc<PersistenceHandle>,
        PersistenceOperationContext,
    ) -> Result<T, PersistenceError>
    + Send
    + 'static,
) -> Result<T, PersistenceError> {
    let started = Instant::now();
    let operation_context = handle.begin_operation();
    let blocking_handle = Arc::clone(&handle);
    let result = match tauri::async_runtime::spawn_blocking(move || {
        operation(blocking_handle, operation_context)
    })
    .await
    {
        Ok(result) => result,
        Err(_) => Err(PersistenceError::Unavailable),
    };

    handle.record_tauri_command_dispatch(operation_context, category, started.elapsed());
    if let Err(error) = &result {
        log_persistence_operation_failed(category, error.diagnostic_code());
    }
    result
}
