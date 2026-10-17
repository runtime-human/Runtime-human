use tempfile::tempdir;

use crate::desktop_performance::{DesktopPerformanceEventName, DesktopPerformanceRecorder};

use super::Database;

#[test]
fn writable_database_bootstrap_records_closed_phase_spans_in_order() {
    let directory = tempdir().expect("create temporary database directory");
    let database_path = directory.path().join("runtime-human.sqlite3");
    let performance = DesktopPerformanceRecorder::with_capacity(32);

    let database = Database::open_or_create_with_performance(&database_path, performance.clone())
        .expect("open database with bootstrap evidence");

    let snapshot = performance.snapshot();
    let bootstrap_events = snapshot
        .events
        .iter()
        .filter(|event| event.duration_micros.is_some())
        .collect::<Vec<_>>();
    assert_eq!(
        bootstrap_events
            .iter()
            .map(|event| event.name)
            .collect::<Vec<_>>(),
        vec![
            DesktopPerformanceEventName::PersistenceBootstrapPath,
            DesktopPerformanceEventName::PersistenceBootstrapSqliteVersion,
            DesktopPerformanceEventName::PersistenceBootstrapConnectionOpen,
            DesktopPerformanceEventName::PersistenceBootstrapSchemaCheck,
            DesktopPerformanceEventName::PersistenceBootstrapConnectionConfigure,
            DesktopPerformanceEventName::PersistenceBootstrapMigration,
            DesktopPerformanceEventName::PersistenceBootstrapManifestVerify,
            DesktopPerformanceEventName::PersistenceBootstrapIntegrityVerify,
            DesktopPerformanceEventName::PersistenceBootstrapCleanMarker,
        ],
    );
    assert!(
        bootstrap_events
            .iter()
            .all(|event| event.category.is_none())
    );
    assert!(
        bootstrap_events
            .iter()
            .all(|event| event.operation_id.is_none())
    );
    assert!(
        bootstrap_events
            .iter()
            .all(|event| event.queue_depth.is_none())
    );
    assert_eq!(snapshot.dropped_events, 0);

    database.close().expect("close database");
}
