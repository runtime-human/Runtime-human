use std::sync::Arc;

use tempfile::TempDir;

use crate::desktop_performance::{
    DesktopPerformanceEventName, DesktopPerformanceOperationCategory, DesktopPerformanceRecorder,
};

use super::{
    PersistenceError, PersistenceHandle,
    commands::run_blocking_observed,
};

#[test]
fn tauri_dispatch_queue_and_database_spans_share_one_operation_id() {
    let temp = TempDir::new().expect("temporary directory");
    let recorder = DesktopPerformanceRecorder::with_capacity(16);
    let handle = Arc::new(
        PersistenceHandle::start_with_performance(
            temp.path().join("runtime-human.sqlite3"),
            recorder.clone(),
        )
        .expect("start observed persistence worker"),
    );

    let status = tauri::async_runtime::block_on(run_blocking_observed(
        Arc::clone(&handle),
        DesktopPerformanceOperationCategory::Recovery,
        |handle, operation| handle.recovery_status_with_operation(operation),
    ))
    .expect("read recovery status through observed command boundary");
    assert!(status.writable);

    handle.shutdown().expect("shutdown persistence worker");

    let snapshot = recorder.snapshot();
    let dispatch = snapshot
        .events
        .iter()
        .find(|event| event.name == DesktopPerformanceEventName::TauriCommandDispatch)
        .expect("Tauri command dispatch event");
    let queue_wait = snapshot
        .events
        .iter()
        .find(|event| event.name == DesktopPerformanceEventName::PersistenceQueueWait)
        .expect("queue wait event");
    let database = snapshot
        .events
        .iter()
        .find(|event| event.name == DesktopPerformanceEventName::PersistenceDatabaseOperation)
        .expect("database operation event");

    assert_eq!(
        dispatch.category,
        Some(DesktopPerformanceOperationCategory::Recovery),
    );
    assert_eq!(queue_wait.category, dispatch.category);
    assert_eq!(database.category, dispatch.category);
    assert_eq!(queue_wait.operation_id, dispatch.operation_id);
    assert_eq!(database.operation_id, dispatch.operation_id);
    assert!(dispatch.operation_id.is_some());
    assert!(dispatch.duration_micros.is_some());
    assert_eq!(dispatch.queue_depth, None);
}

#[test]
fn dispatch_observability_preserves_worker_unavailable_error() {
    let temp = TempDir::new().expect("temporary directory");
    let recorder = DesktopPerformanceRecorder::with_capacity(16);
    let handle = Arc::new(
        PersistenceHandle::start_with_performance(
            temp.path().join("runtime-human.sqlite3"),
            recorder.clone(),
        )
        .expect("start observed persistence worker"),
    );
    handle.shutdown().expect("shutdown persistence worker");

    let result = tauri::async_runtime::block_on(run_blocking_observed(
        Arc::clone(&handle),
        DesktopPerformanceOperationCategory::Recovery,
        |handle, operation| handle.recovery_status_with_operation(operation),
    ));

    assert!(matches!(result, Err(PersistenceError::Unavailable)));

    let snapshot = recorder.snapshot();
    let dispatch_events = snapshot
        .events
        .iter()
        .filter(|event| event.name == DesktopPerformanceEventName::TauriCommandDispatch)
        .collect::<Vec<_>>();
    assert_eq!(dispatch_events.len(), 1);
    assert_eq!(
        dispatch_events[0].category,
        Some(DesktopPerformanceOperationCategory::Recovery),
    );
    assert!(dispatch_events[0].operation_id.is_some());
    assert!(snapshot.events.iter().all(|event| {
        event.name != DesktopPerformanceEventName::PersistenceQueueWait
            && event.name != DesktopPerformanceEventName::PersistenceDatabaseOperation
    }));
}
