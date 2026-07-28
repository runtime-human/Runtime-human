mod backup;
mod backup_receipt;
mod checkpoint_integrity;
pub(crate) mod commands;
#[cfg(test)]
mod commands_tests;
mod commit_contract;
mod contracts;
mod database;
mod error;
mod failpoint;
mod hash;
#[cfg(test)]
mod january_flow_fixture;
#[cfg(test)]
mod january_flow_tests;
mod migrations;
#[cfg(test)]
mod performance_baseline_tests;
#[cfg(test)]
mod performance_observability_tests;
mod records;
mod recovery;
mod recovery_save;
#[cfg(test)]
mod schema_preflight_tests;
#[cfg(test)]
mod shutdown_tests;
#[cfg(test)]
mod sqlite_performance;
mod store;
#[cfg(test)]
mod terminal_recovery_tests;
#[cfg(test)]
mod tests;
mod worker;

pub(crate) use commands::ManagedPersistence;
pub(crate) use commit_contract::CommitPersistedMonthRunCommandV1;
pub(crate) use contracts::{
    BeginPersistedMonthRunCommandV1, CanonicalPayloadV1, CreateBackupCommandV1,
    CreateSaveCommandV1, DurableMonthRunStatus, GetRecoveryStatusQueryV1,
    LoadActiveMonthRunQueryV1, LoadMonthRunQueryV1, LoadSaveQueryV1,
    StoreMonthRunBoundaryCommandV1,
};
pub(crate) use database::{Database, RecoveryStatus};
pub(crate) use error::{PersistenceError, PersistenceErrorV1};
pub(crate) use records::{
    BackupMetadataV1, BeginPersistedMonthRunAcceptedV1, CommitPersistedMonthRunAcceptedV1,
    CreateSaveAcceptedV1, MonthRunRecordV1, MutationOutcome, PersistenceMutationResultV1,
    PersistenceQueryResultV1, RecoveryStatusV1, RecoveryStatusV1Value, SaveRecordV1,
    StoreMonthRunBoundaryAcceptedV1,
};
pub(crate) use worker::PersistenceHandle;
