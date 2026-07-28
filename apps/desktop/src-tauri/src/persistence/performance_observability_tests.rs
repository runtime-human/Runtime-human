use tempfile::TempDir;

use crate::desktop_performance::{
    DesktopPerformanceEventName, DesktopPerformanceOperationCategory, DesktopPerformanceRecorder,
};

use super::PersistenceHandle;

#[test]
fn queue_wait_and_database_spans_share_one_operation_context() {
    let temp = TempDir::new().expect("temporary directory");
    let recorder = DesktopPerformanceRecorder::with_capacity(16);
    let handle = PersistenceHandle::start_with_performance(
        temp.path().join("runtime-human.sqlite3"),
        recorder.clone(),
    )
    .expect("start observed persistence worker");

    handle.recovery_status().expect("read recovery status");
    handle.shutdown().expect("shutdown persistence worker");

    let snapshot = recorder.snapshot();
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
        queue_wait.category,
        Some(DesktopPerformanceOperationCategory::Recovery),
    );
    assert_eq!(database.category, queue_wait.category);
    assert_eq!(database.operation_id, queue_wait.operation_id);
    assert!(queue_wait.operation_id.is_some());
    assert_eq!(queue_wait.queue_depth, Some(1));
    assert_eq!(database.queue_depth, Some(0));
    assert!(queue_wait.duration_micros.is_some());
    assert!(database.duration_micros.is_some());
}

#[test]
fn sequential_commands_receive_distinct_operation_ids_and_return_to_zero_depth() {
    let temp = TempDir::new().expect("temporary directory");
    let recorder = DesktopPerformanceRecorder::with_capacity(16);
    let handle = PersistenceHandle::start_with_performance(
        temp.path().join("runtime-human.sqlite3"),
        recorder.clone(),
    )
    .expect("start observed persistence worker");

    handle.recovery_status().expect("first recovery status");
    handle.recovery_status().expect("second recovery status");
    handle.shutdown().expect("shutdown persistence worker");

    let snapshot = recorder.snapshot();
    let database_events = snapshot
        .events
        .iter()
        .filter(|event| event.name == DesktopPerformanceEventName::PersistenceDatabaseOperation)
        .collect::<Vec<_>>();

    assert_eq!(database_events.len(), 2);
    assert_ne!(
        database_events[0].operation_id,
        database_events[1].operation_id
    );
    assert!(
        database_events
            .iter()
            .all(|event| event.queue_depth == Some(0))
    );
}
