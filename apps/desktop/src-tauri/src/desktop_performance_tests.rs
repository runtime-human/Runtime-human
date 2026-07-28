use serde_json::json;

use super::desktop_performance::{
    DESKTOP_PERFORMANCE_SNAPSHOT_SCHEMA_VERSION, DesktopPerformanceEventName,
    DesktopPerformanceOperationCategory, DesktopPerformanceRecorder,
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
