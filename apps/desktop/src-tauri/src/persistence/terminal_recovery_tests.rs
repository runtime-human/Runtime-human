use rusqlite::Connection;
use serde::Deserialize;
use tempfile::TempDir;

use super::{
    BeginPersistedMonthRunCommandV1, CanonicalPayloadV1, CommitPersistedMonthRunCommandV1,
    CreateSaveCommandV1, Database, DurableMonthRunStatus, MutationOutcome, PersistenceHandle,
    RecoveryStatusV1Value, StoreMonthRunBoundaryCommandV1,
};

const SAVE_SCHEMA_FINGERPRINT: &str =
    "3600af54eacdd6486e464e3744b82f2f8662bf45411554726174d77133d1b423";
const READY_CHECKPOINT_HASH: &str =
    "c2923246cc7e5763a96f4ded00ab376ecc66e47446aabb4e646b7f0d69e7b8b2";
const COMPLETED_CHECKPOINT_HASH: &str =
    "5abfbe1fca8e2e3aac24456c42ab236ba6b856e8a9260e6364d82a25e565290a";
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
fn unclean_start_rejects_corrupted_committed_month_run_result() {
    let temp = TempDir::new().expect("temporary directory");
    let database_path = temp.path().join("runtime-human.sqlite3");

    {
        let fixture = fixture();
        let mut database = Database::open_or_create(&database_path).expect("open database");

        assert!(matches!(
            database
                .create_save(CreateSaveCommandV1 {
                    schema_version: "create-save-command-v1".to_owned(),
                    request_id: "terminal-create-save".to_owned(),
                    save_id: "save-fixture".to_owned(),
                    save_schema_fingerprint: SAVE_SCHEMA_FINGERPRINT.to_owned(),
                    snapshot: fixture.payloads.initial_save.clone(),
                })
                .expect("create save"),
            MutationOutcome::Accepted(_)
        ));

        assert!(matches!(
            database
                .begin_month_run(BeginPersistedMonthRunCommandV1 {
                    schema_version: "begin-persisted-month-run-command-v1".to_owned(),
                    request_id: "terminal-begin-run".to_owned(),
                    save_id: "save-fixture".to_owned(),
                    expected_save_revision: 0,
                    run_id: "run-fixture".to_owned(),
                    checkpoint: fixture.payloads.ready_checkpoint.clone(),
                    compatibility: fixture.payloads.compatibility,
                })
                .expect("begin MonthRun"),
            MutationOutcome::Accepted(_)
        ));

        assert!(matches!(
            database
                .store_month_run_boundary(StoreMonthRunBoundaryCommandV1 {
                    schema_version: "store-month-run-boundary-command-v1".to_owned(),
                    request_id: "terminal-store-completed".to_owned(),
                    save_id: "save-fixture".to_owned(),
                    run_id: "run-fixture".to_owned(),
                    expected_run_revision: 0,
                    expected_checkpoint_payload_sha256: fixture.payloads.ready_checkpoint.sha256,
                    expected_checkpoint_hash: READY_CHECKPOINT_HASH.to_owned(),
                    run_revision: 4,
                    status: DurableMonthRunStatus::Completed,
                    checkpoint: fixture.payloads.completed_checkpoint.clone(),
                })
                .expect("store completed boundary"),
            MutationOutcome::Accepted(_)
        ));

        assert!(matches!(
            database
                .commit_month_run(CommitPersistedMonthRunCommandV1 {
                    schema_version: "commit-persisted-month-run-command-v1".to_owned(),
                    request_id: "terminal-commit-run".to_owned(),
                    save_id: "save-fixture".to_owned(),
                    run_id: "run-fixture".to_owned(),
                    expected_save_revision: 0,
                    expected_run_revision: 4,
                    expected_checkpoint_payload_sha256: fixture
                        .payloads
                        .completed_checkpoint
                        .sha256,
                    expected_checkpoint_hash: COMPLETED_CHECKPOINT_HASH.to_owned(),
                    committed_checkpoint: fixture.payloads.committed_checkpoint,
                    snapshot: fixture.payloads.final_save,
                    result: fixture.payloads.result,
                })
                .expect("commit MonthRun"),
            MutationOutcome::Accepted(_)
        ));

        // Deliberately skip Database::close(): recovery must take the unclean-start path.
    }

    let connection = Connection::open(&database_path).expect("open corruption fixture");
    connection
        .execute(
            "UPDATE month_runs SET result_json = ?1 WHERE run_id = ?2",
            ["{\"tampered\":true}", "run-fixture"],
        )
        .expect("tamper committed result without updating its hash");
    connection.close().expect("close corruption fixture");

    let handle = PersistenceHandle::start(database_path).expect("start recovery worker");
    let recovery = handle.recovery_status().expect("read recovery status");
    assert_eq!(recovery.status, RecoveryStatusV1Value::Corrupted);
    assert!(!recovery.writable);
    handle.shutdown().expect("shutdown recovery worker");
}

fn fixture() -> PersistenceFixture {
    serde_json::from_str(FIXTURE_JSON).expect("valid persistence fixture")
}
