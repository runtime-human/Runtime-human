use serde_json::{Map, Value};

use super::{
    contracts::CanonicalPayloadV1,
    error::PersistenceError,
    hash::{sha256_hex, validate_sha256_hex},
};

const FINGERPRINT_DOMAIN: &str = "runtime-human:fingerprint:v1";
const CHECKPOINT_NAMESPACE: &str = "month-run-checkpoint-v1";

pub(crate) fn verify_checkpoint_fingerprint(
    payload: &CanonicalPayloadV1,
) -> Result<String, PersistenceError> {
    let mut checkpoint = payload.validate()?;
    let object = checkpoint.as_object_mut().ok_or_else(|| {
        PersistenceError::InvalidCommand("MonthRun checkpoint must be an object".to_owned())
    })?;
    let claimed = object
        .remove("checkpointHash")
        .and_then(|value| value.as_str().map(ToOwned::to_owned))
        .ok_or_else(|| {
            PersistenceError::InvalidCommand(
                "MonthRun checkpoint must contain checkpointHash".to_owned(),
            )
        })?;
    validate_sha256_hex(&claimed, "checkpointHash")?;

    let mut envelope = Map::new();
    envelope.insert("domain".to_owned(), Value::String(FINGERPRINT_DOMAIN.to_owned()));
    envelope.insert(
        "namespace".to_owned(),
        Value::String(CHECKPOINT_NAMESPACE.to_owned()),
    );
    envelope.insert("value".to_owned(), checkpoint);
    let canonical = serde_json::to_vec(&Value::Object(envelope)).map_err(|error| {
        PersistenceError::Invariant(format!("failed to serialize checkpoint fingerprint: {error}"))
    })?;
    let expected = sha256_hex(canonical);
    if claimed != expected {
        return Err(PersistenceError::InvalidCommand(
            "MonthRun checkpoint fingerprint does not match its payload".to_owned(),
        ));
    }
    Ok(claimed)
}
