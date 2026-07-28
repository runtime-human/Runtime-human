use crate::desktop_performance::{
    DesktopPerformanceEventName, DesktopPerformanceOperationCategory, DesktopPerformanceRecorder,
};

use super::{PersistenceError, commands::run_blocking_observed};

#[test]
fn tauri_dispatch_span_preserves_result_and_operation_context() {
    let recorder = DesktopPerformanceRecorder::with_capacity(4);
    let result = tauri::async_runtime::block_on(run_blocking_observed(
        recorder.clone(),
        DesktopPerformanceOperationCategory::Query,
        91,
        || Ok::<_, PersistenceError>(42),
    ));

    assert_eq!(result.expect("blocking operation"), 42);
    let snapshot = recorder.snapshot();
    let dispatch = snapshot
        .events
        .iter()
        .find(|event| event.name == DesktopPerformanceEventName::TauriCommandDispatch)
        .expect("Tauri dispatch event");

    assert_eq!(dispatch.operation_id, Some(91));
    assert_eq!(
        dispatch.category,
        Some(DesktopPerformanceOperationCategory::Query),
    );
    assert!(dispatch.duration_micros.is_some());
    assert_eq!(dispatch.queue_depth, None);
}

#[test]
fn tauri_dispatch_observability_never_changes_operation_error() {
    let recorder = DesktopPerformanceRecorder::with_capacity(0);
    let result = tauri::async_runtime::block_on(run_blocking_observed::<()>(
        recorder.clone(),
        DesktopPerformanceOperationCategory::Mutation,
        92,
        || Err(PersistenceError::Unavailable),
    ));

    assert!(matches!(result, Err(PersistenceError::Unavailable)));
    assert_eq!(recorder.snapshot().dropped_events, 1);
}
