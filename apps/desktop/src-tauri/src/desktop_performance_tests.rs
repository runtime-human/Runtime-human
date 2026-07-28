use std::time::Duration;

use serde_json::json;

use super::desktop_performance::{
    DESKTOP_PERFORMANCE_SNAPSHOT_SCHEMA_VERSION, DesktopPerformanceEventName,
    DesktopPerformanceOperationCategory, DesktopPerformanceRecorder,
    read_desktop_performance_snapshot,
};

#[test]
fn startup_milestones_are_recorded_once_in_monotonic_order() {
    let recorder = DesktopPerformanceRecorder::with_capacity(8);

    assert!(recorder.record_once(DesktopPerformanceEventName::ProcessEntry));
    assert!(recorder.record_once(DesktopPerformanceEventName::TauriSetupStart));
    assert!(!recorder.record_once(DesktopPerformanceEventName::ProcessEntry));
    assert!(recorder.record_once(DesktopPerformanceEventName::PersistenceWorkerReady));

    let snapshot = recorder.snapshot();
    assert_eq!(
        snapshot.schema_version,
        DESKTOP_PERFORMANCE_SNAPSHOT_SCHEMA_VERSION,
    );
    assert_eq!(snapshot.events.len(), 3);
    assert_eq!(snapshot.dropped_events, 0);
    assert_eq!(
        snapshot
            .events
            .iter()
            .map(|event| event.name)
            .collect::<Vec<_>>(),
        vec![
            DesktopPerformanceEventName::ProcessEntry,
            DesktopPerformanceEventName::TauriSetupStart,
            DesktopPerformanceEventName::PersistenceWorkerReady,
        ],
    );
    assert!(
        snapshot
            .events
            .windows(2)
            .all(|events| events[0].at_micros <= events[1].at_micros),
    );
}

#[test]
fn recorder_is_bounded_and_counts_discarded_events() {
    let recorder = DesktopPerformanceRecorder::with_capacity(2);

    assert!(recorder.record_once(DesktopPerformanceEventName::ProcessEntry));
    assert!(recorder.record_once(DesktopPerformanceEventName::TauriSetupStart));
    assert!(!recorder.record_once(DesktopPerformanceEventName::PersistenceWorkerReady));

    let snapshot = recorder.snapshot();
    assert_eq!(snapshot.events.len(), 2);
    assert_eq!(snapshot.dropped_events, 1);
}

#[test]
fn telemetry_failure_never_changes_operation_result() {
    #[derive(Debug, PartialEq, Eq)]
    struct SentinelError;

    let recorder = DesktopPerformanceRecorder::with_capacity(0);
    let operation_id = recorder.next_operation_id();
    let result: Result<u32, SentinelError> = recorder.measure(
        DesktopPerformanceEventName::PersistenceDatabaseOperation,
        Some(DesktopPerformanceOperationCategory::Mutation),
        Some(operation_id),
        Some(4),
        || Err(SentinelError),
    );

    assert_eq!(result, Err(SentinelError));
    assert_eq!(recorder.snapshot().dropped_events, 1);
}

#[test]
fn telemetry_write_drops_instead_of_waiting_for_snapshot_lock() {
    let recorder = DesktopPerformanceRecorder::with_capacity(1);

    recorder.with_state_lock_for_test(|| {
        assert!(!recorder.record_duration(
            DesktopPerformanceEventName::PersistenceQueueWait,
            Duration::from_micros(1),
            Some(DesktopPerformanceOperationCategory::Query),
            Some(1),
            Some(1),
        ));
    });

    let snapshot = recorder.snapshot();
    assert!(snapshot.events.is_empty());
    assert_eq!(snapshot.dropped_events, 1);
}

#[test]
fn completed_duration_keeps_the_closed_operation_context() {
    let recorder = DesktopPerformanceRecorder::with_capacity(1);

    assert!(recorder.record_duration(
        DesktopPerformanceEventName::PersistenceQueueWait,
        Duration::from_micros(42),
        Some(DesktopPerformanceOperationCategory::Query),
        Some(7),
        Some(3),
    ));

    let event = &recorder.snapshot().events[0];
    assert_eq!(event.duration_micros, Some(42));
    assert_eq!(
        event.category,
        Some(DesktopPerformanceOperationCategory::Query)
    );
    assert_eq!(event.operation_id, Some(7));
    assert_eq!(event.queue_depth, Some(3));
}

#[test]
fn read_surface_is_complete_repeatable_and_non_destructive() {
    let recorder = DesktopPerformanceRecorder::with_capacity(2);
    assert!(recorder.record_once(DesktopPerformanceEventName::ProcessEntry));
    assert!(recorder.record_once(DesktopPerformanceEventName::TauriSetupStart));

    let first = read_desktop_performance_snapshot(&recorder);
    let second = read_desktop_performance_snapshot(&recorder);

    assert_eq!(first, second);
    assert_eq!(first.events.len(), 2);
    assert_eq!(recorder.snapshot(), first);
}

#[test]
fn snapshot_serialization_has_the_closed_v1_shape() {
    let recorder = DesktopPerformanceRecorder::with_capacity(1);
    assert!(recorder.record_once(DesktopPerformanceEventName::ProcessEntry));

    let serialized = serde_json::to_value(recorder.snapshot()).expect("serialize snapshot");
    let event = &serialized["events"][0];

    assert_eq!(
        serialized["schemaVersion"],
        json!(DESKTOP_PERFORMANCE_SNAPSHOT_SCHEMA_VERSION),
    );
    assert_eq!(serialized["droppedEvents"], json!(0));
    assert_eq!(event["name"], json!("processEntry"));
    assert!(event["atMicros"].is_u64());
    assert_eq!(event["durationMicros"], serde_json::Value::Null);
    assert_eq!(event["category"], serde_json::Value::Null);
    assert_eq!(event["operationId"], serde_json::Value::Null);
    assert_eq!(event["queueDepth"], serde_json::Value::Null);
    assert_eq!(
        event.as_object().expect("event object").len(),
        6,
        "the v1 event field set is closed",
    );
}
