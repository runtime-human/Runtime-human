use std::fmt;

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

pub(crate) const MAX_CANONICAL_PAYLOAD_BYTES: usize = 4 * 1024 * 1024;
const MAX_JAVASCRIPT_SAFE_INTEGER: u64 = 9_007_199_254_740_991;

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct PersistenceContractError {
    code: &'static str,
    message: String,
}

impl PersistenceContractError {
    fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }

    pub(crate) const fn code(&self) -> &'static str {
        self.code
    }
}

impl fmt::Display for PersistenceContractError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}: {}", self.code, self.message)
    }
}

impl std::error::Error for PersistenceContractError {}

pub(crate) trait ValidatePersistenceContract {
    fn validate_contract(&self) -> Result<(), PersistenceContractError>;
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CanonicalPayloadV1 {
    pub(crate) schema_version: String,
    pub(crate) json: String,
    pub(crate) sha256: String,
}

impl ValidatePersistenceContract for CanonicalPayloadV1 {
    fn validate_contract(&self) -> Result<(), PersistenceContractError> {
        validate_schema(&self.schema_version, "canonical-payload-v1")?;
        if self.json.as_bytes().len() > MAX_CANONICAL_PAYLOAD_BYTES {
            return Err(PersistenceContractError::new(
                "PayloadTooLarge",
                format!(
                    "canonical payload exceeds {} UTF-8 bytes",
                    MAX_CANONICAL_PAYLOAD_BYTES
                ),
            ));
        }
        serde_json::from_str::<serde_json::Value>(&self.json).map_err(|error| {
            PersistenceContractError::new(
                "InvalidCommand",
                format!("canonical payload is not valid JSON: {error}"),
            )
        })?;
        validate_sha256(&self.sha256)?;
        let actual = sha256_hex(self.json.as_bytes());
        if actual != self.sha256 {
            return Err(PersistenceContractError::new(
                "PayloadHashMismatch",
                "canonical payload SHA-256 does not match its exact UTF-8 bytes",
            ));
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CreateSaveCommandV1 {
    pub(crate) schema_version: String,
    pub(crate) request_id: String,
    pub(crate) save_id: String,
    pub(crate) snapshot: CanonicalPayloadV1,
}

impl ValidatePersistenceContract for CreateSaveCommandV1 {
    fn validate_contract(&self) -> Result<(), PersistenceContractError> {
        validate_schema(&self.schema_version, "create-save-command-v1")?;
        validate_protocol_id(&self.request_id, "RequestId")?;
        validate_protocol_id(&self.save_id, "SaveId")?;
        self.snapshot.validate_contract()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
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

impl ValidatePersistenceContract for BeginPersistedMonthRunCommandV1 {
    fn validate_contract(&self) -> Result<(), PersistenceContractError> {
        validate_schema(
            &self.schema_version,
            "begin-persisted-month-run-command-v1",
        )?;
        validate_protocol_id(&self.request_id, "RequestId")?;
        validate_protocol_id(&self.save_id, "SaveId")?;
        validate_revision(self.expected_save_revision, "SaveRevision")?;
        validate_protocol_id(&self.run_id, "MonthRunId")?;
        self.checkpoint.validate_contract()?;
        self.compatibility.validate_contract()
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum DurableMonthRunStatus {
    Ready,
    Suspended,
    Completed,
    Failed,
    Incompatible,
    RecoveryRequired,
    Abandoned,
}

impl DurableMonthRunStatus {
    pub(crate) const fn as_str(self) -> &'static str {
        match self {
            Self::Ready => "ready",
            Self::Suspended => "suspended",
            Self::Completed => "completed",
            Self::Failed => "failed",
            Self::Incompatible => "incompatible",
            Self::RecoveryRequired => "recovery-required",
            Self::Abandoned => "abandoned",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct StoreMonthRunBoundaryCommandV1 {
    pub(crate) schema_version: String,
    pub(crate) request_id: String,
    pub(crate) save_id: String,
    pub(crate) run_id: String,
    pub(crate) expected_run_revision: u64,
    pub(crate) run_revision: u64,
    pub(crate) status: DurableMonthRunStatus,
    pub(crate) checkpoint: CanonicalPayloadV1,
}

impl ValidatePersistenceContract for StoreMonthRunBoundaryCommandV1 {
    fn validate_contract(&self) -> Result<(), PersistenceContractError> {
        validate_schema(
            &self.schema_version,
            "store-month-run-boundary-command-v1",
        )?;
        validate_protocol_id(&self.request_id, "RequestId")?;
        validate_protocol_id(&self.save_id, "SaveId")?;
        validate_protocol_id(&self.run_id, "MonthRunId")?;
        validate_revision(self.expected_run_revision, "MonthRunRevision")?;
        validate_revision(self.run_revision, "MonthRunRevision")?;
        if self.run_revision <= self.expected_run_revision {
            return Err(PersistenceContractError::new(
                "InvalidRunBoundary",
                "stored MonthRun revision must be newer than the expected revision",
            ));
        }
        self.checkpoint.validate_contract()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CommitPersistedMonthRunCommandV1 {
    pub(crate) schema_version: String,
    pub(crate) request_id: String,
    pub(crate) save_id: String,
    pub(crate) run_id: String,
    pub(crate) expected_save_revision: u64,
    pub(crate) expected_run_revision: u64,
    pub(crate) snapshot: CanonicalPayloadV1,
    pub(crate) result: CanonicalPayloadV1,
}

impl ValidatePersistenceContract for CommitPersistedMonthRunCommandV1 {
    fn validate_contract(&self) -> Result<(), PersistenceContractError> {
        validate_schema(
            &self.schema_version,
            "commit-persisted-month-run-command-v1",
        )?;
        validate_protocol_id(&self.request_id, "RequestId")?;
        validate_protocol_id(&self.save_id, "SaveId")?;
        validate_protocol_id(&self.run_id, "MonthRunId")?;
        validate_revision(self.expected_save_revision, "SaveRevision")?;
        validate_revision(self.expected_run_revision, "MonthRunRevision")?;
        self.snapshot.validate_contract()?;
        self.result.validate_contract()
    }
}

#[cfg(test)]
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct PersistenceFixtureV1 {
    schema_version: String,
    create_save_command: CreateSaveCommandV1,
    begin_month_run_command: BeginPersistedMonthRunCommandV1,
    store_boundary_command: StoreMonthRunBoundaryCommandV1,
    commit_month_run_command: CommitPersistedMonthRunCommandV1,
}

#[cfg(test)]
impl ValidatePersistenceContract for PersistenceFixtureV1 {
    fn validate_contract(&self) -> Result<(), PersistenceContractError> {
        validate_schema(
            &self.schema_version,
            "month-run-persistence-fixture-v1",
        )?;
        self.create_save_command.validate_contract()?;
        self.begin_month_run_command.validate_contract()?;
        self.store_boundary_command.validate_contract()?;
        self.commit_month_run_command.validate_contract()
    }
}

fn validate_schema(actual: &str, expected: &'static str) -> Result<(), PersistenceContractError> {
    if actual != expected {
        return Err(PersistenceContractError::new(
            "InvalidCommand",
            format!("unsupported schema marker: expected {expected}"),
        ));
    }
    Ok(())
}

fn validate_protocol_id(value: &str, kind: &str) -> Result<(), PersistenceContractError> {
    let valid = (1..=128).contains(&value.len())
        && value
            .as_bytes()
            .iter()
            .all(|byte| (b'!'..=b'~').contains(byte));
    if !valid {
        return Err(PersistenceContractError::new(
            "InvalidCommand",
            format!("{kind} must contain 1-128 printable ASCII characters without whitespace"),
        ));
    }
    Ok(())
}

fn validate_revision(value: u64, kind: &str) -> Result<(), PersistenceContractError> {
    if value > MAX_JAVASCRIPT_SAFE_INTEGER {
        return Err(PersistenceContractError::new(
            "InvalidCommand",
            format!("{kind} must be a non-negative JavaScript-safe integer"),
        ));
    }
    Ok(())
}

fn validate_sha256(value: &str) -> Result<(), PersistenceContractError> {
    let valid = value.len() == 64
        && value
            .as_bytes()
            .iter()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(byte));
    if !valid {
        return Err(PersistenceContractError::new(
            "InvalidCommand",
            "payload sha256 must be 64 lowercase hexadecimal characters",
        ));
    }
    Ok(())
}

fn sha256_hex(bytes: &[u8]) -> String {
    let digest = Sha256::digest(bytes);
    let mut encoded = String::with_capacity(64);
    for byte in digest {
        use fmt::Write as _;
        write!(&mut encoded, "{byte:02x}").expect("writing into String cannot fail");
    }
    encoded
}

#[cfg(test)]
mod tests {
    use super::{PersistenceFixtureV1, ValidatePersistenceContract};

    const FIXTURE: &str = include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../../fixtures/persistence/month-run-persistence-v1.json"
    ));

    #[test]
    fn shared_fixture_deserializes_and_validates() {
        let fixture: PersistenceFixtureV1 =
            serde_json::from_str(FIXTURE).expect("fixture must deserialize");

        fixture
            .validate_contract()
            .expect("fixture must satisfy persistence contract invariants");
    }

    #[test]
    fn unknown_fields_are_rejected() {
        let invalid = FIXTURE.replacen(
            "\"schemaVersion\": \"create-save-command-v1\"",
            "\"schemaVersion\": \"create-save-command-v1\", \"futureField\": true",
            1,
        );

        let error = serde_json::from_str::<PersistenceFixtureV1>(&invalid)
            .expect_err("unknown command fields must fail");

        assert!(error.to_string().contains("unknown field"));
    }

    #[test]
    fn payload_hash_mismatch_is_rejected() {
        let invalid = FIXTURE.replacen(
            "613057a590ecb0a2edbe99152d746dcb23f6542b28f2a71122b8a2016ae2aa82",
            "0000000000000000000000000000000000000000000000000000000000000000",
            1,
        );
        let fixture: PersistenceFixtureV1 =
            serde_json::from_str(&invalid).expect("shape must still deserialize");

        let error = fixture
            .validate_contract()
            .expect_err("hash mismatch must fail validation");

        assert_eq!(error.code(), "PayloadHashMismatch");
    }
}
