use serde::{Deserialize, Serialize};

use super::{
    contracts::{parse_checkpoint_identity, CanonicalPayloadV1, DurableMonthRunStatus},
    error::PersistenceError,
    hash::validate_sha256_hex,
};

const MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CommitPersistedMonthRunCommandV1 {
    pub(crate) schema_version: String,
    pub(crate) request_id: String,
    pub(crate) save_id: String,
    pub(crate) run_id: String,
    pub(crate) expected_save_revision: u64,
    pub(crate) expected_run_revision: u64,
    pub(crate) expected_checkpoint_payload_sha256: String,
    pub(crate) expected_checkpoint_hash: String,
    pub(crate) committed_checkpoint: CanonicalPayloadV1,
    pub(crate) snapshot: CanonicalPayloadV1,
    pub(crate) result: CanonicalPayloadV1,
}

impl CommitPersistedMonthRunCommandV1 {
    pub(crate) fn validate(&self) -> Result<(), PersistenceError> {
        if self.schema_version != "commit-persisted-month-run-command-v1" {
            return Err(PersistenceError::InvalidCommand(
                "unsupported commit command schema".to_owned(),
            ));
        }
        validate_id(&self.request_id, "requestId")?;
        validate_id(&self.save_id, "saveId")?;
        validate_id(&self.run_id, "runId")?;
        validate_revision(self.expected_save_revision, "expectedSaveRevision")?;
        validate_revision(self.expected_run_revision, "expectedRunRevision")?;
        validate_sha256_hex(
            &self.expected_checkpoint_payload_sha256,
            "expectedCheckpointPayloadSha256",
        )?;
        validate_sha256_hex(&self.expected_checkpoint_hash, "expectedCheckpointHash")?;
        self.snapshot.validate()?;
        self.result.validate()?;

        let identity = parse_checkpoint_identity(&self.committed_checkpoint)?;
        if identity.save_id != self.save_id
            || identity.run_id != self.run_id
            || identity.base_save_revision != self.expected_save_revision
            || identity.status != DurableMonthRunStatus::Committed
            || identity.run_revision != self.expected_run_revision + 1
            || identity.previous_checkpoint_hash.as_deref()
                != Some(self.expected_checkpoint_hash.as_str())
        {
            return Err(PersistenceError::InvalidCommand(
                "commit command does not match its committed MonthRun checkpoint".to_owned(),
            ));
        }
        Ok(())
    }
}

fn validate_id(value: &str, name: &str) -> Result<(), PersistenceError> {
    if value.is_empty()
        || value.len() > 128
        || !value.as_bytes().iter().all(|byte| (b'!'..=b'~').contains(byte))
    {
        return Err(PersistenceError::InvalidCommand(format!(
            "{name} must contain 1-128 printable ASCII characters without whitespace"
        )));
    }
    Ok(())
}

fn validate_revision(value: u64, name: &str) -> Result<(), PersistenceError> {
    if value > MAX_SAFE_INTEGER {
        return Err(PersistenceError::InvalidCommand(format!(
            "{name} must be a non-negative JavaScript-safe integer"
        )));
    }
    Ok(())
}
