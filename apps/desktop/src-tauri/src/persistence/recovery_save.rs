use rusqlite::Connection;

use super::{
    database::Database,
    error::PersistenceError,
    hash::{validate_sha256_hex, verify_sha256},
};

impl Database {
    pub(crate) fn verify_save_integrity(&self) -> Result<(), PersistenceError> {
        verify_save_payloads(self.connection()?)
    }
}

fn verify_save_payloads(connection: &Connection) -> Result<(), PersistenceError> {
    let mut statement = connection
        .prepare(
            "SELECT snapshot_json, snapshot_sha256, save_schema_fingerprint
             FROM save_games ORDER BY save_id",
        )
        .map_err(|source| PersistenceError::storage("preparing save recovery scan", source))?;
    let mut rows = statement
        .query([])
        .map_err(|source| PersistenceError::storage("querying saves for recovery", source))?;
    while let Some(row) = rows
        .next()
        .map_err(|source| PersistenceError::storage("reading saves for recovery", source))?
    {
        let snapshot_json: String = row
            .get(0)
            .map_err(|source| PersistenceError::storage("reading save snapshot", source))?;
        let snapshot_sha256: String = row
            .get(1)
            .map_err(|source| PersistenceError::storage("reading save snapshot hash", source))?;
        let schema_fingerprint: String = row
            .get(2)
            .map_err(|source| PersistenceError::storage("reading save schema fingerprint", source))?;
        verify_sha256(snapshot_json.as_bytes(), &snapshot_sha256)
            .map_err(|_| PersistenceError::CorruptedStoredPayload)?;
        validate_sha256_hex(&schema_fingerprint, "saveSchemaFingerprint")
            .map_err(|_| PersistenceError::CorruptedStoredPayload)?;
        serde_json::from_str::<serde_json::Value>(&snapshot_json)
            .map_err(|_| PersistenceError::CorruptedStoredPayload)?;
    }
    Ok(())
}
