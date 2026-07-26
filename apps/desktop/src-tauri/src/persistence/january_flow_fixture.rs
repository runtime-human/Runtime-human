use serde::Deserialize;

use super::{
    BeginPersistedMonthRunCommandV1, CommitPersistedMonthRunCommandV1, CreateSaveCommandV1,
    DurableMonthRunStatus, StoreMonthRunBoundaryCommandV1,
};

const FIXTURE_JSON: &str =
    include_str!("../../../../../fixtures/persistence/january-1990-persistence-flow-v1.json");

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct JanuaryPersistenceFlowFixture {
    pub(super) schema_version: String,
    pub(super) create_save: CreateSaveCommandV1,
    pub(super) begin: BeginPersistedMonthRunCommandV1,
    pub(super) boundaries: Vec<StoreMonthRunBoundaryCommandV1>,
    pub(super) commit: CommitPersistedMonthRunCommandV1,
    pub(super) expectations: JanuaryPersistenceExpectations,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct JanuaryPersistenceExpectations {
    pub(super) boundary_program_counters: Vec<u64>,
    pub(super) boundary_statuses: Vec<DurableMonthRunStatus>,
    pub(super) committed_program_counter: u64,
    pub(super) final_save_revision: u64,
    pub(super) final_run_status: DurableMonthRunStatus,
    pub(super) completed_checkpoint_hash: String,
    pub(super) committed_checkpoint_hash: String,
}

pub(super) fn load_january_persistence_flow_fixture() -> JanuaryPersistenceFlowFixture {
    serde_json::from_str(FIXTURE_JSON).expect("January persistence flow fixture parses")
}
