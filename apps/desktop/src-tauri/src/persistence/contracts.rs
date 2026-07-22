use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::{
    error::PersistenceError,
    hash::{sha256_hex, validate_sha256_hex, verify_sha256},
};

pub(crate) const MAX_CANONICAL_PAYLOAD_BYTES: usize = 4 * 1024 * 1024;
const MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;
const CHECKPOINT_KEYS: [&str; 21] = [
    "acceptedDecisions",
    "baseSaveRevision",
    "checkpointHash",
    "compatibility",
    "materializedOutcomes",
    "pendingDecision",
    "phase",
    "plan",
    "previousCheckpointHash",
    "programCounter",
    "provisionalState",
    "rngState",
    "runId",
    "runRevision",
    "saveId",
    "schemaVersion",
    "status",
    "stepIndex",
    "terminalReason",
    "terminalResult",
    "compatibility",
];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CanonicalPayloadV1 {
    pub(crate) schema_version: String,
    pub(crate) json: String,
    pub(crate) sha256: String,
}

impl CanonicalPayloadV1 {
    pub(crate) fn validate(&self) -> Result<Value, PersistenceError> {
        if self.schema_version != "canonical-payload-v1" {
            return Err(PersistenceError::InvalidCommand(
                "unsupported canonical payload schema".to_owned(),
            ));
        }
        if self.json.len() > MAX_CANONICAL_PAYLOAD_BYTES {
            return Err(PersistenceError::PayloadTooLarge {
                limit: MAX_CANONICAL_PAYLOAD_BYTES,
            });
        }
        let value = serde_json::from_str(&self.json).map_err(|_| {
            PersistenceError::InvalidCommand("canonical payload must contain valid JSON".to_owned())
        })?;
        verify_sha256(self.json.as_bytes(), &self.sha256)?;
        Ok(value)
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum DurableMonthRunStatus {
    Ready,
    Suspended,
    Completed,
    Committed,
    Failed,
    Incompatible,
    RecoveryRequired,
    Abandoned,
}

impl DurableMonthRunStatus {
    pub(crate) fn is_storable_boundary(self) -> bool {
        matches!(
            self,
            Self::Suspended
                | Self::Completed
                | Self::Failed
                | Self::Incompatible
                | Self::RecoveryRequired
                | Self::Abandoned
        )
    }

    pub(crate) fn as_str(self) -> &'static str {
        match self {
            Self::Ready => "ready",
            Self::Suspended => "suspended",
            Self::Completed => "completed",
            Self::Committed => "committed",
            Self::Failed => "failed",
            Self::Incompatible => "incompatible",
            Self::RecoveryRequired => "recovery-required",
            Self::Abandoned => "abandoned",
        }
    }
}

#[derive(Debug, Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
enum CheckpointStatus {
    Ready,
    Running,
    Suspended,
    Completed,
    Committed,
    Failed,
    Incompatible,
    RecoveryRequired,
    Abandoned,
}

impl CheckpointStatus {
    fn as_durable(self) -> Option<DurableMonthRunStatus> {
        match self {
            Self::Ready => Some(DurableMonthRunStatus::Ready),
            Self::Running => None,
            Self::Suspended => Some(DurableMonthRunStatus::Suspended),
            Self::Completed => Some(DurableMonthRunStatus::Completed),
            Self::Committed => Some(DurableMonthRunStatus::Committed),
            Self::Failed => Some(DurableMonthRunStatus::Failed),
            Self::Incompatible => Some(DurableMonthRunStatus::Incompatible),
            Self::RecoveryRequired => Some(DurableMonthRunStatus::RecoveryRequired),
            Self::Abandoned => Some(DurableMonthRunStatus::Abandoned),
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CheckpointProjectionV1 {
    schema_version: String,
    run_id: String,
    save_id: String,
    base_save_revision: u64,
    run_revision: u64,
    status: CheckpointStatus,
    phase: String,
    step_index: u64,
    program_counter: u64,
    plan: Value,
    compatibility: Value,
    rng_state: String,
    provisional_state: Value,
    materialized_outcomes: Vec<Value>,
    pending_decision: Option<Value>,
    accepted_decisions: Vec<Value>,
    terminal_result: Option<Value>,
    terminal_reason: Option<Value>,
    previous_checkpoint_hash: Option<String>,
    checkpoint_hash: String,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct CheckpointIdentityV1 {
    pub(crate) run_id: String,
    pub(crate) save_id: String,
    pub(crate) base_save_revision: u64,
    pub(crate) run_revision: u64,
    pub(crate) status: DurableMonthRunStatus,
    pub(crate) compatibility: Value,
    pub(crate) previous_checkpoint_hash: Option<String>,
    pub(crate) checkpoint_hash: String,
}

pub(crate) fn parse_checkpoint_identity(
    payload: &CanonicalPayloadV1,
) -> Result<CheckpointIdentityV1, PersistenceError> {
    let value = payload.validate()?;
    assert_exact_checkpoint_keys(&value)?;
    let checkpoint: CheckpointProjectionV1 = serde_json::from_value(value).map_err(|_| {
        PersistenceError::InvalidCommand("invalid MonthRun checkpoint shape".to_owned())
    })?;

    if checkpoint.schema_version != "month-run-checkpoint-v1" {
        return Err(PersistenceError::InvalidCommand(
            "unsupported MonthRun checkpoint schema".to_owned(),
        ));
    }
    validate_id(&checkpoint.run_id, "runId")?;
    validate_id(&checkpoint.save_id, "saveId")?;
    validate_revision(checkpoint.base_save_revision, "baseSaveRevision")?;
    validate_revision(checkpoint.run_revision, "runRevision")?;
    validate_revision(checkpoint.step_index, "stepIndex")?;
    validate_revision(checkpoint.program_counter, "programCounter")?;
    validate_sha256_hex(&checkpoint.checkpoint_hash, "checkpointHash")?;
    if let Some(previous) = checkpoint.previous_checkpoint_hash.as_deref() {
        validate_sha256_hex(previous, "previousCheckpointHash")?;
    }
    if checkpoint.phase.is_empty()
        || checkpoint.rng_state.is_empty()
        || checkpoint.run_revision != checkpoint.step_index
        || checkpoint.program_counter > checkpoint.step_index
    {
        return Err(PersistenceError::InvalidCommand(
            "invalid MonthRun checkpoint progress".to_owned(),
        ));
    }

    let _ = (
        checkpoint.plan,
        checkpoint.provisional_state,
        checkpoint.materialized_outcomes,
        checkpoint.pending_decision,
        checkpoint.accepted_decisions,
        checkpoint.terminal_result,
        checkpoint.terminal_reason,
    );

    Ok(CheckpointIdentityV1 {
        run_id: checkpoint.run_id,
        save_id: checkpoint.save_id,
        base_save_revision: checkpoint.base_save_revision,
        run_revision: checkpoint.run_revision,
        status: checkpoint.status.as_durable().ok_or_else(|| {
            PersistenceError::InvalidCommand(
                "transient running checkpoints cannot cross the persistence boundary".to_owned(),
            )
        })?,
        compatibility: checkpoint.compatibility,
        previous_checkpoint_hash: checkpoint.previous_checkpoint_hash,
        checkpoint_hash: checkpoint.checkpoint_hash,
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CreateSaveCommandV1 {
    pub(crate) schema_version: String,
    pub(crate) request_id: String,
    pub(crate) save_id: String,
    pub(crate) save_schema_fingerprint: String,
    pub(crate) snapshot: CanonicalPayloadV1,
}

impl CreateSaveCommandV1 {
    pub(crate) fn validate(&self) -> Result<(), PersistenceError> {
        require_schema(&self.schema_version, "create-save-command-v1")?;
        validate_id(&self.request_id, "requestId")?;
        validate_id(&self.save_id, "saveId")?;
        validate_sha256_hex(&self.save_schema_fingerprint, "saveSchemaFingerprint")?;
        self.snapshot.validate()?;
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct LoadSaveQueryV1 {
    pub(crate) schema_version: String,
    pub(crate) save_id: String,
}

impl LoadSaveQueryV1 {
    pub(crate) fn validate(&self) -> Result<(), PersistenceError> {
        require_schema(&self.schema_version, "load-save-query-v1")?;
        validate_id(&self.save_id, "saveId")
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct BeginPersistedMonthRunCommandV1 {
    pub(crate) schema_version: String,
    pub(crate) request_id: String,
    pub(crate) save_id: String,
    pub(crate) expected_save_revision: u64,
    pub(crate) run_id: String,
    pub(crate) checkpoint: CanonicalPayloadV1,
    pub(crate) compatibility: CanonicalPayloadV1,
}

impl BeginPersistedMonthRunCommandV1 {
    pub(crate) fn validate(&self) -> Result<CheckpointIdentityV1, PersistenceError> {
        require_schema(&self.schema_version, "begin-persisted-month-run-command-v1")?;
        validate_id(&self.request_id, "requestId")?;
        validate_id(&self.save_id, "saveId")?;
        validate_revision(self.expected_save_revision, "expectedSaveRevision")?;
        validate_id(&self.run_id, "runId")?;
        let identity = parse_checkpoint_identity(&self.checkpoint)?;
        let compatibility = self.compatibility.validate()?;

        if identity.save_id != self.save_id
            || identity.run_id != self.run_id
            || identity.base_save_revision != self.expected_save_revision
            || identity.run_revision != 0
            || identity.status != DurableMonthRunStatus::Ready
            || identity.previous_checkpoint_hash.is_some()
            || identity.compatibility != compatibility
        {
            return Err(PersistenceError::InvalidCommand(
                "begin command does not match its ready MonthRun checkpoint".to_owned(),
            ));
        }
        Ok(identity)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct LoadMonthRunQueryV1 {
    pub(crate) schema_version: String,
    pub(crate) run_id: String,
}

impl LoadMonthRunQueryV1 {
    pub(crate) fn validate(&self) -> Result<(), PersistenceError> {
        require_schema(&self.schema_version, "load-month-run-query-v1")?;
        validate_id(&self.run_id, "runId")
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct LoadActiveMonthRunQueryV1 {
    pub(crate) schema_version: String,
    pub(crate) save_id: String,
}

impl LoadActiveMonthRunQueryV1 {
    pub(crate) fn validate(&self) -> Result<(), PersistenceError> {
        require_schema(&self.schema_version, "load-active-month-run-query-v1")?;
        validate_id(&self.save_id, "saveId")
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct StoreMonthRunBoundaryCommandV1 {
    pub(crate) schema_version: String,
    pub(crate) request_id: String,
    pub(crate) save_id: String,
    pub(crate) run_id: String,
    pub(crate) expected_run_revision: u64,
    pub(crate) expected_checkpoint_payload_sha256: String,
    pub(crate) expected_checkpoint_hash: String,
    pub(crate) run_revision: u64,
    pub(crate) status: DurableMonthRunStatus,
    pub(crate) checkpoint: CanonicalPayloadV1,
}

impl StoreMonthRunBoundaryCommandV1 {
    pub(crate) fn validate(&self) -> Result<CheckpointIdentityV1, PersistenceError> {
        require_schema(&self.schema_version, "store-month-run-boundary-command-v1")?;
        validate_id(&self.request_id, "requestId")?;
        validate_id(&self.save_id, "saveId")?;
        validate_id(&self.run_id, "runId")?;
        validate_revision(self.expected_run_revision, "expectedRunRevision")?;
        validate_revision(self.run_revision, "runRevision")?;
        validate_sha256_hex(
            &self.expected_checkpoint_payload_sha256,
            "expectedCheckpointPayloadSha256",
        )?;
        validate_sha256_hex(&self.expected_checkpoint_hash, "expectedCheckpointHash")?;
        if self.run_revision <= self.expected_run_revision || !self.status.is_storable_boundary() {
            return Err(PersistenceError::InvalidRunBoundary);
        }

        let identity = parse_checkpoint_identity(&self.checkpoint)?;
        if identity.save_id != self.save_id
            || identity.run_id != self.run_id
            || identity.run_revision != self.run_revision
            || identity.status != self.status
        {
            return Err(PersistenceError::InvalidCommand(
                "boundary command does not match its MonthRun checkpoint".to_owned(),
            ));
        }
        Ok(identity)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CreateBackupCommandV1 {
    pub(crate) schema_version: String,
    pub(crate) request_id: String,
    pub(crate) save_id: String,
}

impl CreateBackupCommandV1 {
    pub(crate) fn validate(&self) -> Result<(), PersistenceError> {
        require_schema(&self.schema_version, "create-backup-command-v1")?;
        validate_id(&self.request_id, "requestId")?;
        validate_id(&self.save_id, "saveId")
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct GetRecoveryStatusQueryV1 {
    pub(crate) schema_version: String,
}

impl GetRecoveryStatusQueryV1 {
    pub(crate) fn validate(&self) -> Result<(), PersistenceError> {
        require_schema(&self.schema_version, "get-recovery-status-query-v1")
    }
}

pub(crate) fn normalized_command_sha256<T: Serialize>(
    command: &T,
) -> Result<String, PersistenceError> {
    let bytes = serde_json::to_vec(command).map_err(|error| {
        PersistenceError::Invariant(format!("failed to serialize normalized command: {error}"))
    })?;
    Ok(sha256_hex(bytes))
}

fn assert_exact_checkpoint_keys(value: &Value) -> Result<(), PersistenceError> {
    let object = value.as_object().ok_or_else(|| {
        PersistenceError::InvalidCommand("MonthRun checkpoint must be an object".to_owned())
    })?;
    let actual: BTreeSet<&str> = object.keys().map(String::as_str).collect();
    let expected: BTreeSet<&str> = CHECKPOINT_KEYS.into_iter().collect();
    if actual != expected {
        return Err(PersistenceError::InvalidCommand(
            "MonthRun checkpoint contains unknown or missing fields".to_owned(),
        ));
    }
    Ok(())
}

fn require_schema(actual: &str, expected: &str) -> Result<(), PersistenceError> {
    if actual != expected {
        return Err(PersistenceError::InvalidCommand(format!(
            "unsupported schema {actual}; expected {expected}"
        )));
    }
    Ok(())
}

fn validate_id(value: &str, name: &str) -> Result<(), PersistenceError> {
    if value.is_empty()
        || value.len() > 128
        || !value
            .as_bytes()
            .iter()
            .all(|byte| (b'!'..=b'~').contains(byte))
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
