use serde::Deserialize;
use tempfile::TempDir;

use super::{
    BeginPersistedMonthRunCommandV1, CanonicalPayloadV1, CreateSaveCommandV1, Database,
    DurableMonthRunStatus, MutationOutcome, PersistenceHandle, RecoveryStatusV1Value,
    StoreMonthRunBoundaryCommandV1,
};

const SAVE_SCHEMA_FINGERPRINT: &str =
    "3600af54eacdd6486e464e3744b82f2f8662bf45411554726174d77133d1b423";
const READY_CHECKPOINT_HASH: &str =
    "c2923246cc7e5763a96f4ded00ab376ecc66e47446aabb4e646b7f0d69e7b8b2";
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
    compatibility: CanonicalPayloadV1,
    ready_checkpoint: CanonicalPayloadV1,
    completed_checkpoint: CanonicalPayloadV1,
}

#[test]
fn recovery_scan_rejects_tampered_terminal_month_run() {
    let temp = TempDir::new().expect("temporary directory");
    let database_path = temp.path().join("runtime-human.sqlite3");
    let fixture = fixture();

    let mut database = Database::open_or_create(&database_path).expect("open database");
    let created = database
        .create_save(CreateSaveCommandV1 {
            schema_version: "create-save-command-v1".to_owned(),
            request_id: "recovery-all-runs-create-save".to_owned(),
            save_id: "recovery-all-runs-save".to_owned(),
            save_schema_fingerprint: SAVE_SCHEMA_FINGERPRINT.to_owned(),
            snapshot: fixture.payloads.initial_save,
        })
        .expect("create save");
    assert!(matches!(created, MutationOutcome::Accepted(_)));

    let begun = database
        .begin_month_run(BeginPersistedMonthRunCommandV1 {
            schema_version: "begin-persisted-month-run-command-v1".to_owned(),
            request_id: "recovery-all-runs-begin".to_owned(),
            save_id: "recovery-all-runs-save".to_owned(),
            expected_save_revision: 0,
            run_id: "recovery-all-runs-run".to_owned(),
            checkpoint: fixture.payloads.ready_checkpoint,
            compatibility: fixture.payloads.compatibility,
        })
        .expect("begin MonthRun");
    assert!(matches!(begun, MutationOutcome::Accepted(_)));

    let completed = database
        .store_month_run_boundary(StoreMonthRunBoundaryCommandV1 {
            schema_version: "store-month-run-boundary-command-v1".to_owned(),
            request_id: "recovery-all-runs-complete".to_owned(),
            save_id: "recovery-all-runs-save".to_owned(),
            run_id: "recovery-all-runs-run".to_owned(),
            expected_run_revision: 0,
            expected_checkpoint_payload_sha256: fixture.payloads.ready_checkpoint.sha256,
            expected_checkpoint_hash: READY_CHECKPOINT_HASH.to_owned(),
            run_revision: 4,
            status: DurableMonthRunStatus::Completed,
            checkpoint: fixture.payloads.completed_checkpoint,
        })
        .expect("store completed boundary");
    assert!(matches!(completed, MutationOutcome::Accepted(_)));

    database
        .connection_mut()
        .expect("writable connection")
        .execute(
            "UPDATE month_runs SET status = 'failed' WHERE run_id = ?1",
            ["recovery-all-runs-run"],
        )
        .expect("tamper terminal MonthRun status");
    drop(database);

    let handle = PersistenceHandle::start(database_path).expect("start recovery worker");
    let status = handle.recovery_status().expect("load recovery status");
    assert_eq!(status.status, RecoveryStatusV1Value::Corrupted);
    assert!(!status.writable);
    handle.shutdown().expect("shutdown recovery worker");
}

fn fixture() -> PersistenceFixture {
    serde_json::from_str(FIXTURE_JSON).expect("valid persistence fixture")
}
