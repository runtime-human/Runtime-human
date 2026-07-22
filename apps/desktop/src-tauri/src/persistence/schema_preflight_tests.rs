use rusqlite::{Connection, OpenFlags};
use tempfile::TempDir;

use super::{
    CreateBackupCommandV1, PersistenceError, PersistenceHandle, RecoveryStatusV1Value,
    migrations::CURRENT_SCHEMA_VERSION,
};

#[test]
fn newer_schema_fallback_does_not_change_persistent_journal_mode() {
    let temp = TempDir::new().expect("temporary directory");
    let database_path = temp.path().join("runtime-human.sqlite3");
    create_newer_schema_fixture(&database_path);

    let handle = PersistenceHandle::start(database_path.clone()).expect("start read-only fallback");
    let recovery = handle.recovery_status().expect("read recovery status");
    assert_eq!(recovery.status, RecoveryStatusV1Value::NewerSchemaReadOnly);
    assert!(!recovery.writable);
    handle.shutdown().expect("shutdown read-only fallback");

    let connection = Connection::open_with_flags(
        &database_path,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )
    .expect("reopen newer-schema fixture read-only");
    let journal_mode: String = connection
        .pragma_query_value(None, "journal_mode", |row| row.get(0))
        .expect("read fixture journal mode");
    assert!(
        journal_mode.eq_ignore_ascii_case("delete"),
        "read-only fallback changed persistent journal mode to {journal_mode}"
    );
    connection.close().expect("close fixture inspection");
}

#[test]
fn newer_schema_rejects_mutation_before_backup_side_effects() {
    let temp = TempDir::new().expect("temporary directory");
    let database_path = temp.path().join("runtime-human.sqlite3");
    create_newer_schema_fixture(&database_path);

    let handle = PersistenceHandle::start(database_path).expect("start read-only fallback");
    let error = handle
        .create_backup(CreateBackupCommandV1 {
            schema_version: "create-backup-command-v1".to_owned(),
            request_id: "future-schema-backup".to_owned(),
            save_id: "future-schema-save".to_owned(),
        })
        .expect_err("newer-schema mutation must be rejected");

    assert!(matches!(
        error,
        PersistenceError::IncompatibleSchema { found, supported }
            if found == CURRENT_SCHEMA_VERSION + 1 && supported == CURRENT_SCHEMA_VERSION
    ));
    assert!(
        !temp.path().join("backups").exists(),
        "read-only fallback created backup filesystem state"
    );
    handle.shutdown().expect("shutdown read-only fallback");
}

fn create_newer_schema_fixture(database_path: &std::path::Path) {
    let connection = Connection::open(database_path).expect("create newer-schema fixture");
    let journal_mode: String = connection
        .pragma_update_and_check(None, "journal_mode", "DELETE", |row| row.get(0))
        .expect("set fixture journal mode");
    assert!(journal_mode.eq_ignore_ascii_case("delete"));
    connection
        .pragma_update(None, "user_version", CURRENT_SCHEMA_VERSION + 1)
        .expect("set newer schema version");
    connection.close().expect("close fixture database");
}
