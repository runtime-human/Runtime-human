from pathlib import Path

worker_path = Path("apps/desktop/src-tauri/src/persistence/worker.rs")
worker = worker_path.read_text(encoding="utf-8")
old_worker = '''    let remaining_depth = release_queue_depth(queue_depth);

    performance.record_duration(
        DesktopPerformanceEventName::PersistenceQueueWait,
        enqueued_at.elapsed(),
        Some(category),
        Some(operation_id),
        Some(depth_at_enqueue),
    );
    performance.measure(
        DesktopPerformanceEventName::PersistenceDatabaseOperation,
        Some(category),
        Some(operation_id),
        Some(remaining_depth),
        || dispatch(database, command, backup_directory, mode),
    );'''
new_worker = '''    release_queue_depth(queue_depth);

    performance.record_duration(
        DesktopPerformanceEventName::PersistenceQueueWait,
        enqueued_at.elapsed(),
        Some(category),
        Some(operation_id),
        Some(depth_at_enqueue),
    );
    performance.measure(
        DesktopPerformanceEventName::PersistenceDatabaseOperation,
        Some(category),
        Some(operation_id),
        None,
        || dispatch(database, command, backup_directory, mode),
    );'''
if worker.count(old_worker) != 1:
    raise SystemExit("persistence database queue-depth block was not found exactly once")
worker_path.write_text(worker.replace(old_worker, new_worker), encoding="utf-8", newline="\n")

test_path = Path(
    "apps/desktop/src-tauri/src/persistence/performance_observability_tests.rs"
)
tests = test_path.read_text(encoding="utf-8")
replacements = {
    "assert_eq!(database.queue_depth, Some(0));": "assert_eq!(database.queue_depth, None);",
    ".all(|event| event.queue_depth == Some(0))": ".all(|event| event.queue_depth.is_none())",
}
for old, new in replacements.items():
    if tests.count(old) != 1:
        raise SystemExit(f"telemetry assertion was not found exactly once: {old}")
    tests = tests.replace(old, new)
test_path.write_text(tests, encoding="utf-8", newline="\n")
