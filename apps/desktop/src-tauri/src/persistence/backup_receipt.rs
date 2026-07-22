use rusqlite::{Connection, OptionalExtension, TransactionBehavior, params};

use super::{
    error::PersistenceError,
    hash::{sha256_hex, verify_sha256},
    records::BackupMetadataV1,
};

pub(crate) const OP_CREATE_BACKUP: &str = "create-backup-v1";
const MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;

pub(crate) fn load_backup_receipt(
    connection: &Connection,
    request_id: &str,
    payload_hash: &str,
) -> Result<Option<BackupMetadataV1>, PersistenceError> {
    let receipt = connection
        .query_row(
            "SELECT operation, payload_sha256, result_json, result_sha256
             FROM request_receipts WHERE request_id = ?1",
            [request_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                ))
            },
        )
        .optional()
        .map_err(|source| PersistenceError::storage("loading a backup receipt", source))?;
    let Some((operation, stored_payload_hash, result_json, result_hash)) = receipt else {
        return Ok(None);
    };
    if operation != OP_CREATE_BACKUP || stored_payload_hash != payload_hash {
        return Err(PersistenceError::RequestPayloadConflict);
    }
    verify_sha256(result_json.as_bytes(), &result_hash)
        .map_err(|_| PersistenceError::CorruptedStoredPayload)?;
    let metadata = serde_json::from_str(&result_json)
        .map_err(|_| PersistenceError::CorruptedStoredPayload)?;
    Ok(Some(metadata))
}

pub(crate) fn insert_backup_receipt(
    connection: &mut Connection,
    request_id: &str,
    payload_hash: &str,
    metadata: &BackupMetadataV1,
) -> Result<(), PersistenceError> {
    let transaction = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|source| PersistenceError::storage("starting the backup receipt transaction", source))?;
    if let Some(existing) = load_backup_receipt(&transaction, request_id, payload_hash)? {
        if existing == *metadata {
            return transaction.commit().map_err(|source| {
                PersistenceError::storage("committing the duplicate backup receipt", source)
            });
        }
        return Err(PersistenceError::RequestPayloadConflict);
    }

    let sequence = allocate_sequence(&transaction)?;
    let result_json = serde_json::to_string(metadata).map_err(|error| {
        PersistenceError::Invariant(format!("failed to serialize backup receipt: {error}"))
    })?;
    let result_hash = sha256_hex(result_json.as_bytes());
    transaction
        .execute(
            "INSERT INTO request_receipts (
                request_id, operation, payload_sha256, result_json, result_sha256,
                save_id, run_id, created_sequence
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, ?7)",
            params![
                request_id,
                OP_CREATE_BACKUP,
                payload_hash,
                result_json,
                result_hash,
                metadata.save_id,
                sequence,
            ],
        )
        .map_err(|source| PersistenceError::storage("inserting the backup receipt", source))?;
    transaction
        .commit()
        .map_err(|source| PersistenceError::storage("committing the backup receipt", source))
}

fn allocate_sequence(transaction: &rusqlite::Transaction<'_>) -> Result<u64, PersistenceError> {
    let current: String = transaction
        .query_row(
            "SELECT value FROM app_metadata WHERE key = 'operation_sequence'",
            [],
            |row| row.get(0),
        )
        .map_err(|source| PersistenceError::storage("loading operation sequence", source))?;
    let current = current
        .parse::<u64>()
        .ok()
        .filter(|value| *value <= MAX_SAFE_INTEGER)
        .ok_or_else(|| PersistenceError::Invariant("operation sequence metadata is invalid".to_owned()))?;
    let next = current
        .checked_add(1)
        .filter(|value| *value <= MAX_SAFE_INTEGER)
        .ok_or_else(|| PersistenceError::Invariant("operation sequence exhausted safe integer range".to_owned()))?;
    let changed = transaction
        .execute(
            "UPDATE app_metadata SET value = ?1
             WHERE key = 'operation_sequence' AND value = ?2",
            params![next.to_string(), current.to_string()],
        )
        .map_err(|source| PersistenceError::storage("advancing operation sequence", source))?;
    if changed != 1 {
        return Err(PersistenceError::Invariant(
            "operation sequence changed unexpectedly".to_owned(),
        ));
    }
    Ok(next)
}
