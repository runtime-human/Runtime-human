use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use super::{
    contracts::CanonicalPayloadV1,
    error::PersistenceError,
    hash::{sha256_hex, validate_sha256_hex},
    records::SaveRecordV1,
};

const MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;
// Must stay identical to PROFESSIONAL_SAVE_CANDIDATE_V2_FINGERPRINT in game-application.
pub(crate) const PROFESSIONAL_TARGET_FINGERPRINT: &str =
    "ed6792b4a434c3be7c70adeb6fb8cbf429bfa6d5f9d1444a782bc5a7472759f0";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct UpgradeProfessionalSaveCommandV1 {
    pub(crate) schema_version: String,
    pub(crate) request_id: String,
    pub(crate) save_id: String,
    pub(crate) expected_save_revision: u64,
    pub(crate) expected_updated_sequence: u64,
    pub(crate) expected_snapshot_sha256: String,
    pub(crate) expected_source_save_schema_fingerprint: String,
    pub(crate) target_save_schema_fingerprint: String,
    pub(crate) snapshot: CanonicalPayloadV1,
}

impl UpgradeProfessionalSaveCommandV1 {
    pub(crate) fn validate(&self) -> Result<(), PersistenceError> {
        if self.schema_version != "upgrade-professional-save-command-v1"
            || self.request_id.is_empty()
            || self.request_id.len() > 128
            || self.save_id.is_empty()
            || self.save_id.len() > 128
            || self.request_id.bytes().any(|v| !(b'!'..=b'~').contains(&v))
            || self.save_id.bytes().any(|v| !(b'!'..=b'~').contains(&v))
            || self.expected_save_revision > MAX_SAFE_INTEGER
            || self.expected_updated_sequence > MAX_SAFE_INTEGER
        {
            return Err(PersistenceError::InvalidCommand(
                "unsupported professional upgrade command or identity".to_owned(),
            ));
        }
        validate_sha256_hex(&self.expected_snapshot_sha256, "expectedSnapshotSha256")?;
        validate_sha256_hex(
            &self.expected_source_save_schema_fingerprint,
            "expectedSourceSaveSchemaFingerprint",
        )?;
        validate_sha256_hex(
            &self.target_save_schema_fingerprint,
            "targetSaveSchemaFingerprint",
        )?;
        if self.target_save_schema_fingerprint != PROFESSIONAL_TARGET_FINGERPRINT {
            return Err(PersistenceError::InvalidCommand(
                "unsupported professional candidate target fingerprint".to_owned(),
            ));
        }
        if self.expected_source_save_schema_fingerprint == self.target_save_schema_fingerprint {
            return Err(PersistenceError::InvalidCommand(
                "professional upgrade cannot reuse the old schema fingerprint".to_owned(),
            ));
        }
        self.snapshot.validate()?;
        Ok(())
    }

    /// Defense in depth: never permit the generic persistence worker to install
    /// arbitrary experience, grades, or rewritten January history in an upgrade.
    pub(crate) fn validate_transition(&self, old: &SaveRecordV1) -> Result<(), PersistenceError> {
        let target = self.snapshot.validate()?;
        let legacy: Value = serde_json::from_str(&old.snapshot.json)
            .map_err(|_| PersistenceError::CorruptedStoredPayload)?;
        validate_professional_target_structure(
            &target,
            &legacy,
            &UpgradeAnchor {
                save_id: &old.save_id,
                run_id: old.last_committed_run_id.as_deref(),
                legacy_revision: old.revision,
                legacy_snapshot_sha256: Some(old.snapshot.sha256.as_str()),
            },
        )
    }
}

/// Facts about the pre-upgrade (v1) save that a v2 snapshot must agree with.
pub(crate) struct UpgradeAnchor<'a> {
    pub(crate) save_id: &'a str,
    pub(crate) run_id: Option<&'a str>,
    /// Save revision of the legacy (v1) save, i.e. before the upgrade advanced it.
    pub(crate) legacy_revision: u64,
    /// `None` when the original v1 snapshot bytes are no longer available
    /// (recovery scan): the original snapshot hash is then only shape-checked.
    pub(crate) legacy_snapshot_sha256: Option<&'a str>,
}

/// Pure structural validation of a `professional-save-candidate-v2` snapshot.
/// Shared by the upgrade write path and the recovery scan so both judge the
/// zero-credit professional block, legacy receipt and January history identically.
pub(crate) fn validate_professional_target_structure(
    target: &Value,
    legacy: &Value,
    anchor: &UpgradeAnchor<'_>,
) -> Result<(), PersistenceError> {
    let value = target.as_object().ok_or_else(invalid_upgrade)?;
    require_keys(
        value,
        &["january", "legacyImport", "professional", "schemaVersion"],
    )?;
    if target["schemaVersion"] != "professional-save-candidate-v2" {
        return Err(invalid_upgrade());
    }
    if value.get("january") != Some(legacy) {
        return Err(PersistenceError::InvalidCommand(
            "upgrade cannot change committed January history".to_owned(),
        ));
    }
    let month = legacy
        .get("completedMonth")
        .and_then(Value::as_object)
        .ok_or_else(invalid_upgrade)?;
    if legacy.get("schemaVersion").and_then(Value::as_str) != Some("january-1990-save-snapshot-v1")
        || month.get("runId").and_then(Value::as_str) != anchor.run_id
        || month.get("baseSaveRevision").and_then(Value::as_u64)
            != anchor.legacy_revision.checked_sub(1)
    {
        return Err(invalid_upgrade());
    }
    let receipt = target["legacyImport"]
        .as_object()
        .ok_or_else(invalid_upgrade)?;
    require_keys(
        receipt,
        &[
            "assessmentStatus",
            "originalRunId",
            "originalSaveId",
            "originalSaveRevision",
            "originalSnapshotSha256",
            "schemaVersion",
            "sourceFingerprint",
        ],
    )?;
    if receipt.get("schemaVersion").and_then(Value::as_str)
        != Some("professional-legacy-january-receipt-v1")
        || receipt.get("assessmentStatus").and_then(Value::as_str) != Some("unassessed")
        || receipt.get("originalRunId").and_then(Value::as_str) != anchor.run_id
        || receipt.get("originalSaveId").and_then(Value::as_str) != Some(anchor.save_id)
        || receipt.get("originalSaveRevision").and_then(Value::as_u64)
            != Some(anchor.legacy_revision)
    {
        return Err(invalid_upgrade());
    }
    let original_sha = receipt
        .get("originalSnapshotSha256")
        .and_then(Value::as_str)
        .ok_or_else(invalid_upgrade)?;
    validate_sha256_hex(original_sha, "originalSnapshotSha256")?;
    if anchor
        .legacy_snapshot_sha256
        .is_some_and(|expected| expected != original_sha)
    {
        return Err(invalid_upgrade());
    }
    let source_fingerprint = receipt["sourceFingerprint"]
        .as_str()
        .ok_or_else(invalid_upgrade)?;
    validate_sha256_hex(source_fingerprint, "sourceFingerprint")?;
    let source_value = json!({
        "domain": "runtime-human:fingerprint:v1",
        "namespace": "january-professional-committed-source-v1",
        "value": {
            "saveId": anchor.save_id,
            "runId": month["runId"],
            "checkpointHash": month["completedCheckpointHash"],
            "result": month["terminalResult"],
        },
    });
    let canonical = serde_json::to_vec(&source_value).map_err(|_| invalid_upgrade())?;
    if source_fingerprint != sha256_hex(&canonical) {
        return Err(PersistenceError::InvalidCommand(
            "professional source fingerprint does not match committed history".to_owned(),
        ));
    }
    let professional = target["professional"]
        .as_object()
        .ok_or_else(invalid_upgrade)?;
    require_keys(
        professional,
        &[
            "aptitudes",
            "lastEpisode",
            "recentContexts",
            "schemaVersion",
            "skills",
            "technology",
        ],
    )?;
    if professional["schemaVersion"] != "professional-lab-state-v1"
        || !professional["skills"].as_array().is_some_and(Vec::is_empty)
        || !professional["recentContexts"]
            .as_array()
            .is_some_and(Vec::is_empty)
        || !professional["lastEpisode"].is_null()
        || !professional["technology"].is_null()
    {
        return Err(invalid_upgrade());
    }
    let aptitudes = professional["aptitudes"]
        .as_object()
        .ok_or_else(invalid_upgrade)?;
    require_keys(aptitudes, &["reasoning", "learning"])?;
    for key in ["reasoning", "learning"] {
        if !aptitudes[key].as_u64().is_some_and(|value| value <= 1000) {
            return Err(invalid_upgrade());
        }
    }
    Ok(())
}

fn require_keys(
    value: &serde_json::Map<String, Value>,
    allowed: &[&str],
) -> Result<(), PersistenceError> {
    if value.len() != allowed.len() || !value.keys().all(|key| allowed.contains(&key.as_str())) {
        return Err(invalid_upgrade());
    }
    Ok(())
}

fn invalid_upgrade() -> PersistenceError {
    PersistenceError::InvalidCommand(
        "professional upgrade must preserve committed history and unassessed state".to_owned(),
    )
}
