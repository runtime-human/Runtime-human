use std::{fs, path::Path};

use rusqlite::Connection;
use serde::Deserialize;
use tempfile::TempDir;

use super::{
    CanonicalPayloadV1, CreateBackupCommandV1, CreateSaveCommandV1, Database, LoadSaveQueryV1,
    MutationOutcome, PersistenceError, PersistenceHandle, RecoveryStatus,
};

const SAVE_SCHEMA_FINGERPRINT: &str =
    "3600af54eacdd6486e464e3744b82f2f8662bf45411554726174d77133d1b423";
const FIXTURE_JSON: &str = include_str!(
    "../../../../../fixtures/persistence/month-run-persistence-v1.json"
);

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PersistenceFixture {
    payloads: FixturePayloads,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct FixturePayloads {
    initial_save: CanonicalPayloadV1,
}

#[test]
fn verified_backup_survives_reopen_and_replays_receipt() {
    let temp = TempDir::new().expect("temporary directory");
    let database_path = temp.path().join("runtime-human.sqlite3");
    let backup_directory = temp.path().join("backups");
    let mut database = Database::open_or_create(&database_path).expect("open database");
    create_fixture_save(&mut database);

    let command = CreateBackupCommandV1 {
        schema_version: "create-backup-command-v1".to_owned(),
        request_id: "backup-request-1".to_owned(),
        save_id: "save-fixture".to_owned(),
    };
    let accepted = database
        .create_backup(command.clone(), &backup_directory)
        .expect("create backup");
    let metadata = match accepted {
        MutationOutcome::Accepted(metadata) => metadata,
        MutationOutcome::Duplicate(_) => panic!("first backup cannot be duplicate"),
    };

    let backup_path = backup_directory.join(format!("{}.sqlite3", metadata.backup_id));
    assert!(backup_path.is_file());
    let backup = Database::open_existing_read_only(&backup_path).expect("open backup read-only");
    let stored = backup
        .load_save(LoadSaveQueryV1 {
            schema_version: "load-save-query-v1".to_owned(),
            save_id: "save-fixture".to_owned(),
        })
        .expect("load backup save")
        .expect("backup save exists");
    assert_eq!(stored.revision, 0);
    assert_eq!(stored.snapshot, fixture().payloads.initial_save);
    backup.close().expect("close backup");

    let duplicate = database
        .create_backup(command, &backup_directory)
        .expect("replay backup receipt");
    assert!(matches!(duplicate, MutationOutcome::Duplicate(value) if value == metadata));
    database.close().expect("close primary database");
}

#[test]
fn unclean_but_valid_database_passes_application_integrity_scan() {
    let temp = TempDir::new().expect("temporary directory");
    let database_path = temp.path().join("runtime-human.sqlite3");
    {
        let mut database = Database::open_or_create(&database_path).expect("open database");
        create_fixture_save(&mut database);
    }

    let reopened = Database::open_or_create(&database_path).expect("reopen unclean database");
    assert_eq!(reopened.recovery_status(), RecoveryStatus::UncleanButValid);
    reopened
        .verify_application_integrity()
        .expect("valid unclean database");
    reopened.close().expect("close recovered database");
}

#[test]
fn worker_rejects_tampered_authoritative_payload_after_unclean_shutdown() {
    let temp = TempDir::new().expect("temporary directory");
    let database_path = temp.path().join("runtime-human.sqlite3");
    {
        let mut database = Database::open_or_create(&database_path).expect("open database");
        create_fixture_save(&mut database);
    }

    tamper_save_payload(&database_path);
    let result = PersistenceHandle::start(database_path);
    assert!(matches!(result, Err(PersistenceError::RecoveryRequired)));
}

fn create_fixture_save(database: &mut Database) {
    let result = database
        .create_save(CreateSaveCommandV1 {
            schema_version: "create-save-command-v1".to_owned(),
            request_id: "create-save-request-1".to_owned(),
            save_id: "save-fixture".to_owned(),
            save_schema_fingerprint: SAVE_SCHEMA_FINGERPRINT.to_owned(),
            snapshot: fixture().payloads.initial_save,
        })
        .expect("create save");
    assert!(matches!(result, MutationOutcome::Accepted(_)));
}

fn tamper_save_payload(path: &Path) {
    let connection = Connection::open(path).expect("open database for corruption fixture");
    connection
        .execute(
            "UPDATE save_games SET snapshot_json = ?1 WHERE save_id = ?2",
            ["{\"tampered\":true}", "save-fixture"],
        )
        .expect("tamper save payload");
    connection.close().expect("close corruption fixture connection");

    let wal = path.with_extension("sqlite3-wal");
    if wal.exists() {
        fs::metadata(wal).expect("tamper WAL remains readable");
    }
}

fn fixture() -> PersistenceFixture {
    serde_json::from_str(FIXTURE_JSON).expect("valid persistence fixture")
}
