use serde::{Deserialize, Serialize};

use super::{
    contracts::{CanonicalPayloadV1, DurableMonthRunStatus},
    error::PersistenceErrorV1,
};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct SaveRecordV1 {
    pub(crate) schema_version: String,
    pub(crate) save_id: String,
    pub(crate) revision: u64,
    pub(crate) save_schema_fingerprint: String,
    pub(crate) snapshot: CanonicalPayloadV1,
    pub(crate) last_committed_run_id: Option<String>,
    pub(crate) created_sequence: u64,
    pub(crate) updated_sequence: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct MonthRunRecordV1 {
    pub(crate) schema_version: String,
    pub(crate) run_id: String,
    pub(crate) save_id: String,
    pub(crate) base_save_revision: u64,
    pub(crate) run_revision: u64,
    pub(crate) status: DurableMonthRunStatus,
    pub(crate) checkpoint: CanonicalPayloadV1,
    pub(crate) checkpoint_hash: String,
    pub(crate) previous_checkpoint_hash: Option<String>,
    pub(crate) compatibility: CanonicalPayloadV1,
    pub(crate) committed_save_revision: Option<u64>,
    pub(crate) result: Option<CanonicalPayloadV1>,
    pub(crate) created_sequence: u64,
    pub(crate) updated_sequence: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CreateSaveAcceptedV1 {
    pub(crate) schema_version: String,
    pub(crate) save: SaveRecordV1,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct BeginPersistedMonthRunAcceptedV1 {
    pub(crate) schema_version: String,
    pub(crate) run: MonthRunRecordV1,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct StoreMonthRunBoundaryAcceptedV1 {
    pub(crate) schema_version: String,
    pub(crate) run: MonthRunRecordV1,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CommitPersistedMonthRunAcceptedV1 {
    pub(crate) schema_version: String,
    pub(crate) save: SaveRecordV1,
    pub(crate) run: MonthRunRecordV1,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum RecoveryStatusV1Value {
    Healthy,
    UncleanButValid,
    NewerSchemaReadOnly,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RecoveryStatusV1 {
    pub(crate) schema_version: String,
    pub(crate) status: RecoveryStatusV1Value,
    pub(crate) writable: bool,
    pub(crate) backup_available: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub(crate) enum PersistenceMutationResultV1<T> {
    Accepted { value: T },
    Duplicate { value: T },
    Rejected { error: PersistenceErrorV1 },
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub(crate) enum PersistenceQueryResultV1<T> {
    Found { value: T },
    NotFound,
    Rejected { error: PersistenceErrorV1 },
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) enum MutationOutcome<T> {
    Accepted(T),
    Duplicate(T),
}

impl<T> MutationOutcome<T> {
    pub(crate) fn map<U>(self, mapper: impl FnOnce(T) -> U) -> MutationOutcome<U> {
        match self {
            Self::Accepted(value) => MutationOutcome::Accepted(mapper(value)),
            Self::Duplicate(value) => MutationOutcome::Duplicate(mapper(value)),
        }
    }
}

impl<T> From<Result<MutationOutcome<T>, super::error::PersistenceError>>
    for PersistenceMutationResultV1<T>
{
    fn from(result: Result<MutationOutcome<T>, super::error::PersistenceError>) -> Self {
        match result {
            Ok(MutationOutcome::Accepted(value)) => Self::Accepted { value },
            Ok(MutationOutcome::Duplicate(value)) => Self::Duplicate { value },
            Err(error) => Self::Rejected {
                error: error.public(),
            },
        }
    }
}

impl<T> From<Result<Option<T>, super::error::PersistenceError>> for PersistenceQueryResultV1<T> {
    fn from(result: Result<Option<T>, super::error::PersistenceError>) -> Self {
        match result {
            Ok(Some(value)) => Self::Found { value },
            Ok(None) => Self::NotFound,
            Err(error) => Self::Rejected {
                error: error.public(),
            },
        }
    }
}
