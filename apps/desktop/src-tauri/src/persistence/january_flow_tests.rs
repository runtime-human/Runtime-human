use serde::Deserialize;
use tempfile::TempDir;

use super::{
    BeginPersistedMonthRunCommandV1, CommitPersistedMonthRunCommandV1, CreateSaveCommandV1,
    DurableMonthRunStatus, LoadActiveMonthRunQueryV1, LoadMonthRunQueryV1, LoadSaveQueryV1,
    MutationOutcome, PersistenceHandle, StoreMonthRunBoundaryCommandV1,
};

const FIXTURE_JSON: &str =
    include_str!("../../../../../fixtures/persistence/january-1990-persistence-flow-v1.json");

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct JanuaryPersistenceFlowFixture {
    schema_version: String,
    create_save: CreateSaveCommandV1,
    begin: BeginPersistedMonthRunCommandV1,
    boundaries: Vec<StoreMonthRunBoundaryCommandV1>,
    commit: CommitPersistedMonthRunCommandV1,
    expectations: JanuaryPersistenceExpectations,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct JanuaryPersistenceExpectations {
    boundary_program_counters: Vec<u64>,
    boundary_statuses: Vec<DurableMonthRunStatus>,
    committed_program_counter: u64,
    final_save_revision: u64,
    final_run_status: DurableMonthRunStatus,
    completed_checkpoint_hash: String,
    committed_checkpoint_hash: String,
}

#[test]
fn actual_january_flow_survives_file_backed_reopen_and_replays_commit() {
    let fixture = fixture();
    assert_eq!(fixture.schema_version, "january-1990-persistence-flow-v1");
    assert_eq!(fixture.boundaries.len(), 4);
    assert_eq!(fixture.expectations.boundary_program_counters, [2, 4, 7, 9]);
    assert_eq!(
        fixture.expectations.boundary_statuses,
        [
            DurableMonthRunStatus::Suspended,
            DurableMonthRunStatus::Suspended,
            DurableMonthRunStatus::Suspended,
            DurableMonthRunStatus::Completed,
        ]
    );

    let temp = TempDir::new().expect("temporary January database directory");
    let database_path = temp.path().join("runtime-human.sqlite3");
    let mut handle = PersistenceHandle::start(database_path.clone()).expect("start January worker");

    let created = handle
        .create_save(fixture.create_save.clone())
        .expect("create canonical January save");
    assert!(matches!(created, MutationOutcome::Accepted(_)));

    let begun = handle
        .begin_month_run(fixture.begin.clone())
        .expect("begin persisted January run");
    assert!(matches!(begun, MutationOutcome::Accepted(_)));

    for (index, command) in fixture.boundaries.iter().cloned().enumerate() {
        let stored = handle
            .store_boundary(command.clone())
            .expect("store January boundary");
        assert!(matches!(stored, MutationOutcome::Accepted(_)));

        if index < 3 {
            handle.shutdown().expect("close January worker at decision boundary");
            handle = PersistenceHandle::start(database_path.clone())
                .expect("reopen January worker at decision boundary");
            let active = handle
                .load_active_month_run(LoadActiveMonthRunQueryV1 {
                    schema_version: "load-active-month-run-query-v1".to_owned(),
                    save_id: fixture.create_save.save_id.clone(),
                })
                .expect("load active January run")
                .expect("active January run exists");
            assert_eq!(active.run_id, fixture.begin.run_id);
            assert_eq!(active.status, command.status);
            assert_eq!(active.run_revision, command.run_revision);
            assert_eq!(active.checkpoint_hash, command.checkpoint_hash);
            assert_eq!(
                checkpoint_program_counter(&active.checkpoint.json),
                fixture.expectations.boundary_program_counters[index]
            );
        }
    }

    assert_eq!(
        fixture.boundaries[3].checkpoint_hash,
        fixture.expectations.completed_checkpoint_hash
    );
    let committed = handle
        .commit_month_run(fixture.commit.clone())
        .expect("commit January month");
    assert!(matches!(committed, MutationOutcome::Accepted(_)));
    handle.shutdown().expect("close committed January worker");

    let reopened = PersistenceHandle::start(database_path).expect("reopen committed January worker");
    let save = reopened
        .load_save(LoadSaveQueryV1 {
            schema_version: "load-save-query-v1".to_owned(),
            save_id: fixture.create_save.save_id.clone(),
        })
        .expect("load committed January save")
        .expect("committed January save exists");
    assert_eq!(save.revision, fixture.expectations.final_save_revision);
    assert_eq!(save.last_committed_run_id.as_deref(), Some(fixture.begin.run_id.as_str()));

    let run = reopened
        .load_month_run(LoadMonthRunQueryV1 {
            schema_version: "load-month-run-query-v1".to_owned(),
            run_id: fixture.begin.run_id.clone(),
        })
        .expect("load committed January run")
        .expect("committed January run exists");
    assert_eq!(run.status, fixture.expectations.final_run_status);
    assert_eq!(run.committed_save_revision, Some(fixture.expectations.final_save_revision));
    assert_eq!(run.checkpoint_hash, fixture.expectations.committed_checkpoint_hash);
    assert_eq!(
        checkpoint_program_counter(&run.checkpoint.json),
        fixture.expectations.committed_program_counter
    );

    let replay = reopened
        .commit_month_run(fixture.commit.clone())
        .expect("replay January commit receipt");
    assert!(matches!(replay, MutationOutcome::Duplicate(_)));
    let replayed_save = reopened
        .load_save(LoadSaveQueryV1 {
            schema_version: "load-save-query-v1".to_owned(),
            save_id: fixture.create_save.save_id.clone(),
        })
        .expect("reload January save after duplicate commit")
        .expect("January save exists after duplicate commit");
    assert_eq!(replayed_save.revision, fixture.expectations.final_save_revision);
    reopened.shutdown().expect("shutdown final January worker");
}

fn checkpoint_program_counter(json: &str) -> u64 {
    serde_json::from_str::<serde_json::Value>(json)
        .expect("checkpoint contains JSON")
        .get("programCounter")
        .and_then(serde_json::Value::as_u64)
        .expect("checkpoint contains a safe programCounter")
}

fn fixture() -> JanuaryPersistenceFlowFixture {
    serde_json::from_str(FIXTURE_JSON).expect("January persistence flow fixture parses")
}
