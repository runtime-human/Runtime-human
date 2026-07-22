use std::{
    fs,
    path::Path,
    process::{Command, ExitStatus},
};

use rusqlite::Connection;
use serde::Deserialize;
use tempfile::TempDir;

use super::{
    BeginPersistedMonthRunCommandV1, CanonicalPayloadV1, CommitPersistedMonthRunCommandV1,
    CreateBackupCommandV1, CreateSaveCommandV1, Database, DurableMonthRunStatus,
    LoadMonthRunQueryV1, LoadSaveQueryV1, MutationOutcome, PersistenceError, PersistenceHandle,
    RecoveryStatus, StoreMonthRunBoundaryCommandV1,
};

const SAVE_SCHEMA_FINGERPRINT: &str =
    "3600af54eacdd6486e464e3744b82f2f8662bf45411554726174d77133d1b423";
const READY_CHECKPOINT_HASH: &str =
    "c2923246cc7e5763a96f4ded00ab376ecc66e47446aabb4e646b7f0d69e7b8b2";
const COMPLETED_CHECKPOINT_HASH: &str =
    "5abfbe1fca8e2e3aac24456c42ab236ba6b856e8a9260e6364d82a25e565290a";
const CRASH_TEST_DATABASE_ENV: &str = "RUNTIME_HUMAN_CRASH_TEST_DATABASE";
const CRASH_EXIT_CODE: i32 = 86;
const FIXTURE_JSON: &str =
    include_str!("../../../../../fixtures/persistence/month-run-persistence-v1.json");

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PersistenceFixture {
    payloads: FixturePayloads,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct FixturePayloads {
    initial_save: CanonicalPayloadV1,
    final_save: CanonicalPayloadV1,
    compatibility: CanonicalPayloadV1,
    ready_checkpoint: CanonicalPayloadV1,
    completed_checkpoint: CanonicalPayloadV1,
    committed_checkpoint: CanonicalPayloadV1,
    result: CanonicalPayloadV1,
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

#[test]
fn final_commit_rolls_back_when_the_run_update_fails_after_save_cas() {
    let temp = TempDir::new().expect("temporary directory");
    let database_path = temp.path().join("runtime-human.sqlite3");
    let mut database = prepare_completed_run(&database_path);
    database
        .connection_mut()
        .expect("writable connection")
        .execute_batch(
            "CREATE TEMP TRIGGER fail_committed_run_update
             BEFORE UPDATE OF status ON month_runs
             WHEN NEW.status = 'committed'
             BEGIN
               SELECT RAISE(ABORT, 'injected commit failure');
             END;",
        )
        .expect("install failure trigger");

    assert!(database.commit_month_run(commit_command()).is_err());

    let save = load_fixture_save(&database);
    let run = load_fixture_run(&database);
    assert_eq!(save.revision, 0);
    assert_eq!(run.status, DurableMonthRunStatus::Completed);
    assert_eq!(run.run_revision, 4);
    let commit_receipts: i64 = database
        .connection()
        .expect("connection")
        .query_row(
            "SELECT COUNT(*) FROM request_receipts WHERE request_id = 'commit-run-test-1'",
            [],
            |row| row.get(0),
        )
        .expect("count commit receipts");
    assert_eq!(commit_receipts, 0);
    database.close().expect("close database");
}

#[test]
fn committed_operation_replays_after_process_exit_before_acknowledgement() {
    if std::env::var_os(CRASH_TEST_DATABASE_ENV).is_some() {
        return;
    }

    let temp = TempDir::new().expect("temporary directory");
    let database_path = temp.path().join("runtime-human.sqlite3");
    prepare_completed_run(&database_path)
        .close()
        .expect("close prepared database");

    let status = run_commit_crash_child(&database_path);
    assert_eq!(status.code(), Some(CRASH_EXIT_CODE));

    let mut database = Database::open_or_create(&database_path).expect("reopen crashed database");
    assert_eq!(database.recovery_status(), RecoveryStatus::UncleanButValid);
    database
        .verify_application_integrity()
        .expect("verify committed crash state");
    let save = load_fixture_save(&database);
    let run = load_fixture_run(&database);
    assert_eq!(save.revision, 1);
    assert_eq!(run.status, DurableMonthRunStatus::Committed);
    assert_eq!(run.committed_save_revision, Some(1));

    let replay = database
        .commit_month_run(commit_command())
        .expect("replay committed command");
    assert!(matches!(replay, MutationOutcome::Duplicate(_)));
    assert_eq!(load_fixture_save(&database).revision, 1);
    database.close().expect("close recovered database");
}

#[test]
fn child_commit_and_exit_before_acknowledgement() {
    let Some(database_path) = std::env::var_os(CRASH_TEST_DATABASE_ENV) else {
        return;
    };
    let mut database = Database::open_or_create(Path::new(&database_path)).expect("child open");
    let outcome = database
        .commit_month_run(commit_command())
        .expect("child commit");
    assert!(matches!(outcome, MutationOutcome::Accepted(_)));
    std::process::exit(CRASH_EXIT_CODE);
}

fn prepare_completed_run(path: &Path) -> Database {
    let mut database = Database::open_or_create(path).expect("open database");
    create_fixture_save(&mut database);
    begin_fixture_run(&mut database);
    store_completed_boundary(&mut database);
    database
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

fn begin_fixture_run(database: &mut Database) {
    let fixture = fixture();
    let result = database
        .begin_month_run(BeginPersistedMonthRunCommandV1 {
            schema_version: "begin-persisted-month-run-command-v1".to_owned(),
            request_id: "begin-run-request-1".to_owned(),
            save_id: "save-fixture".to_owned(),
            expected_save_revision: 0,
            run_id: "run-fixture".to_owned(),
            checkpoint: fixture.payloads.ready_checkpoint,
            compatibility: fixture.payloads.compatibility,
        })
        .expect("begin MonthRun");
    assert!(matches!(result, MutationOutcome::Accepted(_)));
}

fn store_completed_boundary(database: &mut Database) {
    let fixture = fixture();
    let result = database
        .store_month_run_boundary(StoreMonthRunBoundaryCommandV1 {
            schema_version: "store-month-run-boundary-command-v1".to_owned(),
            request_id: "store-completed-request-1".to_owned(),
            save_id: "save-fixture".to_owned(),
            run_id: "run-fixture".to_owned(),
            expected_run_revision: 0,
            expected_checkpoint_payload_sha256: fixture.payloads.ready_checkpoint.sha256,
            expected_checkpoint_hash: READY_CHECKPOINT_HASH.to_owned(),
            run_revision: 4,
            status: DurableMonthRunStatus::Completed,
            checkpoint: fixture.payloads.completed_checkpoint,
        })
        .expect("store completed boundary");
    assert!(matches!(result, MutationOutcome::Accepted(_)));
}

fn commit_command() -> CommitPersistedMonthRunCommandV1 {
    let fixture = fixture();
    CommitPersistedMonthRunCommandV1 {
        schema_version: "commit-persisted-month-run-command-v1".to_owned(),
        request_id: "commit-run-test-1".to_owned(),
        save_id: "save-fixture".to_owned(),
        run_id: "run-fixture".to_owned(),
        expected_save_revision: 0,
        expected_run_revision: 4,
        expected_checkpoint_payload_sha256: fixture.payloads.completed_checkpoint.sha256,
        expected_checkpoint_hash: COMPLETED_CHECKPOINT_HASH.to_owned(),
        committed_checkpoint: fixture.payloads.committed_checkpoint,
        snapshot: fixture.payloads.final_save,
        result: fixture.payloads.result,
    }
}

fn load_fixture_save(database: &Database) -> super::SaveRecordV1 {
    database
        .load_save(LoadSaveQueryV1 {
            schema_version: "load-save-query-v1".to_owned(),
            save_id: "save-fixture".to_owned(),
        })
        .expect("load save")
        .expect("save exists")
}

fn load_fixture_run(database: &Database) -> super::MonthRunRecordV1 {
    database
        .load_month_run(LoadMonthRunQueryV1 {
            schema_version: "load-month-run-query-v1".to_owned(),
            run_id: "run-fixture".to_owned(),
        })
        .expect("load MonthRun")
        .expect("MonthRun exists")
}

fn run_commit_crash_child(database_path: &Path) -> ExitStatus {
    Command::new(std::env::current_exe().expect("current test executable"))
        .arg("--exact")
        .arg("persistence::tests::child_commit_and_exit_before_acknowledgement")
        .arg("--nocapture")
        .env(CRASH_TEST_DATABASE_ENV, database_path)
        .status()
        .expect("run commit crash child")
}

fn tamper_save_payload(path: &Path) {
    let connection = Connection::open(path).expect("open database for corruption fixture");
    connection
        .execute(
            "UPDATE save_games SET snapshot_json = ?1 WHERE save_id = ?2",
            ["{\"tampered\":true}", "save-fixture"],
        )
        .expect("tamper save payload");
    connection
        .close()
        .expect("close corruption fixture connection");

    let wal = path.with_extension("sqlite3-wal");
    if wal.exists() {
        fs::metadata(wal).expect("tamper WAL remains readable");
    }
}

fn fixture() -> PersistenceFixture {
    serde_json::from_str(FIXTURE_JSON).expect("valid persistence fixture")
}
