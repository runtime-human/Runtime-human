use rusqlite::{
    params, Connection, OptionalExtension, Row, Transaction, TransactionBehavior,
};
use serde::{de::DeserializeOwned, Serialize};

use super::{
    checkpoint_integrity::verify_checkpoint_fingerprint,
    commit_contract::CommitPersistedMonthRunCommandV1,
    contracts::{
        normalized_command_sha256, parse_checkpoint_identity,
        BeginPersistedMonthRunCommandV1, CanonicalPayloadV1, CreateSaveCommandV1,
        DurableMonthRunStatus, LoadActiveMonthRunQueryV1, LoadMonthRunQueryV1, LoadSaveQueryV1,
        StoreMonthRunBoundaryCommandV1,
    },
    database::{Database, RecoveryStatus},
    error::PersistenceError,
    hash::{sha256_hex, verify_sha256},
    records::{
        BeginPersistedMonthRunAcceptedV1, CommitPersistedMonthRunAcceptedV1,
        CreateSaveAcceptedV1, MonthRunRecordV1, MutationOutcome, RecoveryStatusV1,
        RecoveryStatusV1Value, SaveRecordV1, StoreMonthRunBoundaryAcceptedV1,
    },
};

const MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;
const MAX_RESULT_BYTES: usize = 1024 * 1024;

const OP_CREATE_SAVE: &str = "create-save-v1";
const OP_BEGIN_MONTH_RUN: &str = "begin-month-run-v1";
const OP_STORE_BOUNDARY: &str = "store-month-run-boundary-v1";
const OP_COMMIT_MONTH_RUN: &str = "commit-month-run-v1";

impl Database {
    pub(crate) fn create_save(
        &mut self,
        command: CreateSaveCommandV1,
    ) -> Result<MutationOutcome<CreateSaveAcceptedV1>, PersistenceError> {
        command.validate()?;
        let payload_hash = normalized_command_sha256(&command)?;
        let transaction = immediate(self.connection_mut()?, "creating a save")?;

        if let Some(result) = classify_receipt::<CreateSaveAcceptedV1>(
            &transaction,
            &command.request_id,
            OP_CREATE_SAVE,
            &payload_hash,
        )? {
            return Ok(MutationOutcome::Duplicate(result));
        }
        if save_exists(&transaction, &command.save_id)? {
            return Err(PersistenceError::SaveAlreadyExists);
        }

        let sequence = allocate_sequence(&transaction)?;
        transaction
            .execute(
                "INSERT INTO save_games (
                    save_id, revision, snapshot_json, snapshot_sha256,
                    save_schema_fingerprint, last_committed_run_id,
                    created_sequence, updated_sequence
                ) VALUES (?1, 0, ?2, ?3, ?4, NULL, ?5, ?5)",
                params![
                    command.save_id,
                    command.snapshot.json,
                    command.snapshot.sha256,
                    command.save_schema_fingerprint,
                    sequence,
                ],
            )
            .map_err(|source| PersistenceError::storage("inserting the save", source))?;

        let accepted = CreateSaveAcceptedV1 {
            schema_version: "create-save-accepted-v1".to_owned(),
            save: SaveRecordV1 {
                schema_version: "save-record-v1".to_owned(),
                save_id: command.save_id,
                revision: 0,
                save_schema_fingerprint: command.save_schema_fingerprint,
                snapshot: command.snapshot,
                last_committed_run_id: None,
                created_sequence: sequence,
                updated_sequence: sequence,
            },
        };
        insert_receipt(
            &transaction,
            &command.request_id,
            OP_CREATE_SAVE,
            &payload_hash,
            &accepted,
            Some(&accepted.save.save_id),
            None,
            sequence,
        )?;
        transaction
            .commit()
            .map_err(|source| PersistenceError::storage("committing save creation", source))?;
        Ok(MutationOutcome::Accepted(accepted))
    }

    pub(crate) fn load_save(
        &self,
        query: LoadSaveQueryV1,
    ) -> Result<Option<SaveRecordV1>, PersistenceError> {
        query.validate()?;
        load_save_record(self.connection()?, &query.save_id)
    }

    pub(crate) fn begin_month_run(
        &mut self,
        command: BeginPersistedMonthRunCommandV1,
    ) -> Result<MutationOutcome<BeginPersistedMonthRunAcceptedV1>, PersistenceError> {
        let identity = command.validate()?;
        let verified_hash = verify_checkpoint_fingerprint(&command.checkpoint)?;
        if verified_hash != identity.checkpoint_hash {
            return Err(PersistenceError::InvalidCommand(
                "checkpoint identity and verified fingerprint differ".to_owned(),
            ));
        }
        let payload_hash = normalized_command_sha256(&command)?;
        let transaction = immediate(self.connection_mut()?, "beginning a MonthRun")?;

        if let Some(result) = classify_receipt::<BeginPersistedMonthRunAcceptedV1>(
            &transaction,
            &command.request_id,
            OP_BEGIN_MONTH_RUN,
            &payload_hash,
        )? {
            return Ok(MutationOutcome::Duplicate(result));
        }

        let save = load_save_record(&transaction, &command.save_id)?
            .ok_or(PersistenceError::SaveNotFound)?;
        if save.revision != command.expected_save_revision {
            return Err(PersistenceError::SaveRevisionConflict);
        }
        if month_run_exists(&transaction, &command.run_id)?
            || load_active_month_run_record(&transaction, &command.save_id)?.is_some()
        {
            return Err(PersistenceError::ActiveRunExists);
        }

        let sequence = allocate_sequence(&transaction)?;
        transaction
            .execute(
                "INSERT INTO month_runs (
                    run_id, save_id, base_save_revision, run_revision, status,
                    checkpoint_json, checkpoint_payload_sha256, checkpoint_hash,
                    previous_checkpoint_hash, compatibility_json,
                    compatibility_payload_sha256, committed_save_revision,
                    result_json, result_sha256, created_sequence, updated_sequence
                ) VALUES (
                    ?1, ?2, ?3, 0, 'ready', ?4, ?5, ?6, NULL, ?7, ?8,
                    NULL, NULL, NULL, ?9, ?9
                )",
                params![
                    command.run_id,
                    command.save_id,
                    command.expected_save_revision,
                    command.checkpoint.json,
                    command.checkpoint.sha256,
                    identity.checkpoint_hash,
                    command.compatibility.json,
                    command.compatibility.sha256,
                    sequence,
                ],
            )
            .map_err(|source| PersistenceError::storage("inserting the MonthRun", source))?;

        append_journal(
            &transaction,
            &command.run_id,
            "created",
            None,
            None,
            &command.checkpoint.sha256,
            &identity.checkpoint_hash,
            sequence,
        )?;
        let run = load_month_run_record(&transaction, &command.run_id)?
            .ok_or_else(|| PersistenceError::Invariant("inserted MonthRun disappeared".to_owned()))?;
        let accepted = BeginPersistedMonthRunAcceptedV1 {
            schema_version: "begin-persisted-month-run-accepted-v1".to_owned(),
            run,
        };
        insert_receipt(
            &transaction,
            &command.request_id,
            OP_BEGIN_MONTH_RUN,
            &payload_hash,
            &accepted,
            Some(&command.save_id),
            Some(&command.run_id),
            sequence,
        )?;
        transaction.commit().map_err(|source| {
            PersistenceError::storage("committing MonthRun creation", source)
        })?;
        Ok(MutationOutcome::Accepted(accepted))
    }

    pub(crate) fn load_month_run(
        &self,
        query: LoadMonthRunQueryV1,
    ) -> Result<Option<MonthRunRecordV1>, PersistenceError> {
        query.validate()?;
        load_month_run_record(self.connection()?, &query.run_id)
    }

    pub(crate) fn load_active_month_run(
        &self,
        query: LoadActiveMonthRunQueryV1,
    ) -> Result<Option<MonthRunRecordV1>, PersistenceError> {
        query.validate()?;
        load_active_month_run_record(self.connection()?, &query.save_id)
    }

    pub(crate) fn store_month_run_boundary(
        &mut self,
        command: StoreMonthRunBoundaryCommandV1,
    ) -> Result<MutationOutcome<StoreMonthRunBoundaryAcceptedV1>, PersistenceError> {
        let identity = command.validate()?;
        let verified_hash = verify_checkpoint_fingerprint(&command.checkpoint)?;
        if verified_hash != identity.checkpoint_hash {
            return Err(PersistenceError::InvalidCommand(
                "checkpoint identity and verified fingerprint differ".to_owned(),
            ));
        }
        let payload_hash = normalized_command_sha256(&command)?;
        let transaction = immediate(self.connection_mut()?, "storing a MonthRun boundary")?;

        if let Some(result) = classify_receipt::<StoreMonthRunBoundaryAcceptedV1>(
            &transaction,
            &command.request_id,
            OP_STORE_BOUNDARY,
            &payload_hash,
        )? {
            return Ok(MutationOutcome::Duplicate(result));
        }

        let current = load_month_run_record(&transaction, &command.run_id)?
            .ok_or(PersistenceError::RunNotFound)?;
        if current.save_id != command.save_id {
            return Err(PersistenceError::RunNotFound);
        }
        compare_checkpoint_cas(
            &current,
            command.expected_run_revision,
            &command.expected_checkpoint_payload_sha256,
            &command.expected_checkpoint_hash,
        )?;
        if !allowed_boundary_transition(current.status, command.status) {
            return Err(PersistenceError::InvalidRunBoundary);
        }
        if canonical_json_value(&current.compatibility.json)? != identity.compatibility {
            return Err(PersistenceError::InvalidCommand(
                "checkpoint compatibility cannot change within a MonthRun".to_owned(),
            ));
        }

        let sequence = allocate_sequence(&transaction)?;
        let changed = transaction
            .execute(
                "UPDATE month_runs SET
                    run_revision = ?1,
                    status = ?2,
                    checkpoint_json = ?3,
                    checkpoint_payload_sha256 = ?4,
                    checkpoint_hash = ?5,
                    previous_checkpoint_hash = ?6,
                    updated_sequence = ?7
                 WHERE run_id = ?8
                   AND save_id = ?9
                   AND run_revision = ?10
                   AND checkpoint_payload_sha256 = ?11
                   AND checkpoint_hash = ?12",
                params![
                    command.run_revision,
                    command.status.as_str(),
                    command.checkpoint.json,
                    command.checkpoint.sha256,
                    identity.checkpoint_hash,
                    identity.previous_checkpoint_hash,
                    sequence,
                    command.run_id,
                    command.save_id,
                    command.expected_run_revision,
                    command.expected_checkpoint_payload_sha256,
                    command.expected_checkpoint_hash,
                ],
            )
            .map_err(|source| PersistenceError::storage("updating the MonthRun checkpoint", source))?;
        if changed != 1 {
            return Err(PersistenceError::RunRevisionConflict);
        }

        append_journal(
            &transaction,
            &command.run_id,
            command.status.as_str(),
            Some(&command.expected_checkpoint_payload_sha256),
            Some(&command.expected_checkpoint_hash),
            &command.checkpoint.sha256,
            &identity.checkpoint_hash,
            sequence,
        )?;
        let run = load_month_run_record(&transaction, &command.run_id)?
            .ok_or_else(|| PersistenceError::Invariant("updated MonthRun disappeared".to_owned()))?;
        let accepted = StoreMonthRunBoundaryAcceptedV1 {
            schema_version: "store-month-run-boundary-accepted-v1".to_owned(),
            run,
        };
        insert_receipt(
            &transaction,
            &command.request_id,
            OP_STORE_BOUNDARY,
            &payload_hash,
            &accepted,
            Some(&command.save_id),
            Some(&command.run_id),
            sequence,
        )?;
        transaction.commit().map_err(|source| {
            PersistenceError::storage("committing the MonthRun boundary", source)
        })?;
        Ok(MutationOutcome::Accepted(accepted))
    }

    pub(crate) fn commit_month_run(
        &mut self,
        command: CommitPersistedMonthRunCommandV1,
    ) -> Result<MutationOutcome<CommitPersistedMonthRunAcceptedV1>, PersistenceError> {
        command.validate()?;
        let committed_identity = parse_checkpoint_identity(&command.committed_checkpoint)?;
        let verified_hash = verify_checkpoint_fingerprint(&command.committed_checkpoint)?;
        if verified_hash != committed_identity.checkpoint_hash {
            return Err(PersistenceError::InvalidCommand(
                "committed checkpoint identity and fingerprint differ".to_owned(),
            ));
        }
        let payload_hash = normalized_command_sha256(&command)?;
        let transaction = immediate(self.connection_mut()?, "committing a MonthRun")?;

        if let Some(result) = classify_receipt::<CommitPersistedMonthRunAcceptedV1>(
            &transaction,
            &command.request_id,
            OP_COMMIT_MONTH_RUN,
            &payload_hash,
        )? {
            return Ok(MutationOutcome::Duplicate(result));
        }

        let current_run = load_month_run_record(&transaction, &command.run_id)?
            .ok_or(PersistenceError::RunNotFound)?;
        if current_run.status == DurableMonthRunStatus::Committed {
            return Err(PersistenceError::RunAlreadyCommitted);
        }
        if current_run.status != DurableMonthRunStatus::Completed {
            return Err(PersistenceError::InvalidRunBoundary);
        }
        if current_run.save_id != command.save_id {
            return Err(PersistenceError::RunNotFound);
        }
        compare_checkpoint_cas(
            &current_run,
            command.expected_run_revision,
            &command.expected_checkpoint_payload_sha256,
            &command.expected_checkpoint_hash,
        )?;

        let current_save = load_save_record(&transaction, &command.save_id)?
            .ok_or(PersistenceError::SaveNotFound)?;
        if current_save.revision != command.expected_save_revision
            || current_run.base_save_revision != command.expected_save_revision
        {
            return Err(PersistenceError::SaveRevisionConflict);
        }
        if canonical_json_value(&current_run.compatibility.json)?
            != committed_identity.compatibility
        {
            return Err(PersistenceError::InvalidCommand(
                "committed checkpoint compatibility cannot change".to_owned(),
            ));
        }

        let next_save_revision = current_save
            .revision
            .checked_add(1)
            .filter(|revision| *revision <= MAX_SAFE_INTEGER)
            .ok_or_else(|| {
                PersistenceError::Invariant("save revision exhausted safe integer range".to_owned())
            })?;
        let sequence = allocate_sequence(&transaction)?;
        let save_changed = transaction
            .execute(
                "UPDATE save_games SET
                    revision = ?1,
                    snapshot_json = ?2,
                    snapshot_sha256 = ?3,
                    last_committed_run_id = ?4,
                    updated_sequence = ?5
                 WHERE save_id = ?6 AND revision = ?7",
                params![
                    next_save_revision,
                    command.snapshot.json,
                    command.snapshot.sha256,
                    command.run_id,
                    sequence,
                    command.save_id,
                    command.expected_save_revision,
                ],
            )
            .map_err(|source| PersistenceError::storage("updating the committed save", source))?;
        if save_changed != 1 {
            return Err(PersistenceError::SaveRevisionConflict);
        }

        let run_changed = transaction
            .execute(
                "UPDATE month_runs SET
                    run_revision = ?1,
                    status = 'committed',
                    checkpoint_json = ?2,
                    checkpoint_payload_sha256 = ?3,
                    checkpoint_hash = ?4,
                    previous_checkpoint_hash = ?5,
                    committed_save_revision = ?6,
                    result_json = ?7,
                    result_sha256 = ?8,
                    updated_sequence = ?9
                 WHERE run_id = ?10
                   AND save_id = ?11
                   AND status = 'completed'
                   AND run_revision = ?12
                   AND checkpoint_payload_sha256 = ?13
                   AND checkpoint_hash = ?14",
                params![
                    committed_identity.run_revision,
                    command.committed_checkpoint.json,
                    command.committed_checkpoint.sha256,
                    committed_identity.checkpoint_hash,
                    committed_identity.previous_checkpoint_hash,
                    next_save_revision,
                    command.result.json,
                    command.result.sha256,
                    sequence,
                    command.run_id,
                    command.save_id,
                    command.expected_run_revision,
                    command.expected_checkpoint_payload_sha256,
                    command.expected_checkpoint_hash,
                ],
            )
            .map_err(|source| PersistenceError::storage("marking the MonthRun committed", source))?;
        if run_changed != 1 {
            return Err(PersistenceError::RunRevisionConflict);
        }

        append_journal(
            &transaction,
            &command.run_id,
            "committed",
            Some(&command.expected_checkpoint_payload_sha256),
            Some(&command.expected_checkpoint_hash),
            &command.committed_checkpoint.sha256,
            &committed_identity.checkpoint_hash,
            sequence,
        )?;
        let save = load_save_record(&transaction, &command.save_id)?
            .ok_or_else(|| PersistenceError::Invariant("committed save disappeared".to_owned()))?;
        let run = load_month_run_record(&transaction, &command.run_id)?
            .ok_or_else(|| PersistenceError::Invariant("committed MonthRun disappeared".to_owned()))?;
        let accepted = CommitPersistedMonthRunAcceptedV1 {
            schema_version: "commit-persisted-month-run-accepted-v1".to_owned(),
            save,
            run,
        };
        insert_receipt(
            &transaction,
            &command.request_id,
            OP_COMMIT_MONTH_RUN,
            &payload_hash,
            &accepted,
            Some(&command.save_id),
            Some(&command.run_id),
            sequence,
        )?;
        transaction.commit().map_err(|source| {
            PersistenceError::storage("committing the completed MonthRun", source)
        })?;
        Ok(MutationOutcome::Accepted(accepted))
    }

    pub(crate) fn recovery_status_record(&self) -> RecoveryStatusV1 {
        let (status, writable) = match self.recovery_status() {
            RecoveryStatus::Healthy => (RecoveryStatusV1Value::Healthy, self.is_writable()),
            RecoveryStatus::UncleanButValid => {
                (RecoveryStatusV1Value::UncleanButValid, self.is_writable())
            }
            RecoveryStatus::NewerSchemaReadOnly => {
                (RecoveryStatusV1Value::NewerSchemaReadOnly, false)
            }
        };
        RecoveryStatusV1 {
            schema_version: "recovery-status-v1".to_owned(),
            status,
            writable,
            backup_available: false,
        }
    }
}

fn immediate<'connection>(
    connection: &'connection mut Connection,
    context: &'static str,
) -> Result<Transaction<'connection>, PersistenceError> {
    connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|source| PersistenceError::storage(context, source))
}

fn classify_receipt<T: DeserializeOwned>(
    transaction: &Transaction<'_>,
    request_id: &str,
    operation: &str,
    payload_hash: &str,
) -> Result<Option<T>, PersistenceError> {
    let receipt = transaction
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
        .map_err(|source| PersistenceError::storage("loading a request receipt", source))?;

    let Some((stored_operation, stored_payload_hash, result_json, result_hash)) = receipt else {
        return Ok(None);
    };
    if stored_operation != operation || stored_payload_hash != payload_hash {
        return Err(PersistenceError::RequestPayloadConflict);
    }
    verify_sha256(result_json.as_bytes(), &result_hash)
        .map_err(|_| PersistenceError::CorruptedStoredPayload)?;
    let result = serde_json::from_str(&result_json)
        .map_err(|_| PersistenceError::CorruptedStoredPayload)?;
    Ok(Some(result))
}

#[allow(clippy::too_many_arguments)]
fn insert_receipt<T: Serialize>(
    transaction: &Transaction<'_>,
    request_id: &str,
    operation: &str,
    payload_hash: &str,
    result: &T,
    save_id: Option<&str>,
    run_id: Option<&str>,
    sequence: u64,
) -> Result<(), PersistenceError> {
    let result_json = serde_json::to_string(result).map_err(|error| {
        PersistenceError::Invariant(format!("failed to serialize receipt result: {error}"))
    })?;
    if result_json.len() > MAX_RESULT_BYTES {
        return Err(PersistenceError::Invariant(
            "receipt result exceeds the configured byte limit".to_owned(),
        ));
    }
    let result_hash = sha256_hex(result_json.as_bytes());
    transaction
        .execute(
            "INSERT INTO request_receipts (
                request_id, operation, payload_sha256, result_json, result_sha256,
                save_id, run_id, created_sequence
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                request_id,
                operation,
                payload_hash,
                result_json,
                result_hash,
                save_id,
                run_id,
                sequence,
            ],
        )
        .map_err(|source| PersistenceError::storage("inserting a request receipt", source))?;
    Ok(())
}

fn allocate_sequence(transaction: &Transaction<'_>) -> Result<u64, PersistenceError> {
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
        .ok_or_else(|| {
            PersistenceError::Invariant("operation sequence metadata is invalid".to_owned())
        })?;
    let next = current
        .checked_add(1)
        .filter(|value| *value <= MAX_SAFE_INTEGER)
        .ok_or_else(|| {
            PersistenceError::Invariant("operation sequence exhausted safe integer range".to_owned())
        })?;
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

fn save_exists(connection: &Connection, save_id: &str) -> Result<bool, PersistenceError> {
    connection
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM save_games WHERE save_id = ?1)",
            [save_id],
            |row| row.get(0),
        )
        .map_err(|source| PersistenceError::storage("checking save identity", source))
}

fn month_run_exists(connection: &Connection, run_id: &str) -> Result<bool, PersistenceError> {
    connection
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM month_runs WHERE run_id = ?1)",
            [run_id],
            |row| row.get(0),
        )
        .map_err(|source| PersistenceError::storage("checking MonthRun identity", source))
}

fn load_save_record(
    connection: &Connection,
    save_id: &str,
) -> Result<Option<SaveRecordV1>, PersistenceError> {
    let record = connection
        .query_row(
            "SELECT save_id, revision, snapshot_json, snapshot_sha256,
                    save_schema_fingerprint, last_committed_run_id,
                    created_sequence, updated_sequence
             FROM save_games WHERE save_id = ?1",
            [save_id],
            map_save_row,
        )
        .optional()
        .map_err(|source| PersistenceError::storage("loading the save", source))?;
    if let Some(record) = record.as_ref() {
        record
            .snapshot
            .validate()
            .map_err(|_| PersistenceError::CorruptedStoredPayload)?;
    }
    Ok(record)
}

fn map_save_row(row: &Row<'_>) -> rusqlite::Result<SaveRecordV1> {
    Ok(SaveRecordV1 {
        schema_version: "save-record-v1".to_owned(),
        save_id: row.get(0)?,
        revision: row_u64(row, 1)?,
        snapshot: CanonicalPayloadV1 {
            schema_version: "canonical-payload-v1".to_owned(),
            json: row.get(2)?,
            sha256: row.get(3)?,
        },
        save_schema_fingerprint: row.get(4)?,
        last_committed_run_id: row.get(5)?,
        created_sequence: row_u64(row, 6)?,
        updated_sequence: row_u64(row, 7)?,
    })
}

fn load_month_run_record(
    connection: &Connection,
    run_id: &str,
) -> Result<Option<MonthRunRecordV1>, PersistenceError> {
    let record = connection
        .query_row(
            "SELECT run_id, save_id, base_save_revision, run_revision, status,
                    checkpoint_json, checkpoint_payload_sha256, checkpoint_hash,
                    previous_checkpoint_hash, compatibility_json,
                    compatibility_payload_sha256, committed_save_revision,
                    result_json, result_sha256, created_sequence, updated_sequence
             FROM month_runs WHERE run_id = ?1",
            [run_id],
            map_month_run_row,
        )
        .optional()
        .map_err(|source| PersistenceError::storage("loading the MonthRun", source))?;
    if let Some(record) = record.as_ref() {
        verify_month_run_record(connection, record)?;
    }
    Ok(record)
}

fn load_active_month_run_record(
    connection: &Connection,
    save_id: &str,
) -> Result<Option<MonthRunRecordV1>, PersistenceError> {
    let run_id: Option<String> = connection
        .query_row(
            "SELECT run_id FROM month_runs
             WHERE save_id = ?1 AND status IN ('ready', 'suspended', 'completed')",
            [save_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|source| PersistenceError::storage("loading the active MonthRun", source))?;
    match run_id {
        Some(run_id) => load_month_run_record(connection, &run_id),
        None => Ok(None),
    }
}

fn map_month_run_row(row: &Row<'_>) -> rusqlite::Result<MonthRunRecordV1> {
    let result_json: Option<String> = row.get(12)?;
    let result_sha256: Option<String> = row.get(13)?;
    let result = match (result_json, result_sha256) {
        (Some(json), Some(sha256)) => Some(CanonicalPayloadV1 {
            schema_version: "canonical-payload-v1".to_owned(),
            json,
            sha256,
        }),
        (None, None) => None,
        _ => return Err(rusqlite::Error::InvalidQuery),
    };
    Ok(MonthRunRecordV1 {
        schema_version: "month-run-record-v1".to_owned(),
        run_id: row.get(0)?,
        save_id: row.get(1)?,
        base_save_revision: row_u64(row, 2)?,
        run_revision: row_u64(row, 3)?,
        status: parse_status(&row.get::<_, String>(4)?)?,
        checkpoint: CanonicalPayloadV1 {
            schema_version: "canonical-payload-v1".to_owned(),
            json: row.get(5)?,
            sha256: row.get(6)?,
        },
        checkpoint_hash: row.get(7)?,
        previous_checkpoint_hash: row.get(8)?,
        compatibility: CanonicalPayloadV1 {
            schema_version: "canonical-payload-v1".to_owned(),
            json: row.get(9)?,
            sha256: row.get(10)?,
        },
        committed_save_revision: row_optional_u64(row, 11)?,
        result,
        created_sequence: row_u64(row, 14)?,
        updated_sequence: row_u64(row, 15)?,
    })
}

fn verify_month_run_record(
    connection: &Connection,
    record: &MonthRunRecordV1,
) -> Result<(), PersistenceError> {
    let identity = parse_checkpoint_identity(&record.checkpoint)
        .map_err(|_| PersistenceError::CorruptedStoredPayload)?;
    verify_checkpoint_fingerprint(&record.checkpoint)
        .map_err(|_| PersistenceError::CorruptedStoredPayload)?;
    record
        .compatibility
        .validate()
        .map_err(|_| PersistenceError::CorruptedStoredPayload)?;
    if let Some(result) = record.result.as_ref() {
        result
            .validate()
            .map_err(|_| PersistenceError::CorruptedStoredPayload)?;
    }

    if identity.run_id != record.run_id
        || identity.save_id != record.save_id
        || identity.base_save_revision != record.base_save_revision
        || identity.run_revision != record.run_revision
        || identity.status != record.status
        || identity.checkpoint_hash != record.checkpoint_hash
        || identity.previous_checkpoint_hash != record.previous_checkpoint_hash
        || canonical_json_value(&record.compatibility.json)? != identity.compatibility
    {
        return Err(PersistenceError::CorruptedStoredPayload);
    }

    let journal_tail = connection
        .query_row(
            "SELECT checkpoint_payload_sha256, checkpoint_hash
             FROM month_run_journal WHERE run_id = ?1
             ORDER BY sequence DESC LIMIT 1",
            [&record.run_id],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )
        .optional()
        .map_err(|source| PersistenceError::storage("loading the MonthRun journal tail", source))?;
    if journal_tail.as_ref()
        != Some(&(record.checkpoint.sha256.clone(), record.checkpoint_hash.clone()))
    {
        return Err(PersistenceError::CorruptedStoredPayload);
    }
    Ok(())
}

fn compare_checkpoint_cas(
    current: &MonthRunRecordV1,
    expected_revision: u64,
    expected_payload_hash: &str,
    expected_checkpoint_hash: &str,
) -> Result<(), PersistenceError> {
    if current.run_revision != expected_revision {
        return Err(PersistenceError::RunRevisionConflict);
    }
    if current.checkpoint.sha256 != expected_payload_hash
        || current.checkpoint_hash != expected_checkpoint_hash
    {
        return Err(PersistenceError::CheckpointHashConflict);
    }
    Ok(())
}

fn allowed_boundary_transition(
    current: DurableMonthRunStatus,
    next: DurableMonthRunStatus,
) -> bool {
    match current {
        DurableMonthRunStatus::Ready | DurableMonthRunStatus::Suspended => {
            next.is_storable_boundary()
        }
        DurableMonthRunStatus::Completed => next == DurableMonthRunStatus::RecoveryRequired,
        DurableMonthRunStatus::Committed
        | DurableMonthRunStatus::Failed
        | DurableMonthRunStatus::Incompatible
        | DurableMonthRunStatus::RecoveryRequired
        | DurableMonthRunStatus::Abandoned => false,
    }
}

#[allow(clippy::too_many_arguments)]
fn append_journal(
    transaction: &Transaction<'_>,
    run_id: &str,
    event_kind: &str,
    source_payload_hash: Option<&str>,
    source_checkpoint_hash: Option<&str>,
    checkpoint_payload_hash: &str,
    checkpoint_hash: &str,
    created_sequence: u64,
) -> Result<(), PersistenceError> {
    let previous = transaction
        .query_row(
            "SELECT sequence, entry_sha256 FROM month_run_journal
             WHERE run_id = ?1 ORDER BY sequence DESC LIMIT 1",
            [run_id],
            |row| Ok((row_u64(row, 0)?, row.get::<_, String>(1)?)),
        )
        .optional()
        .map_err(|source| PersistenceError::storage("loading the journal tail", source))?;
    let (sequence, previous_entry_hash) = match previous {
        Some((sequence, hash)) => (
            sequence.checked_add(1).ok_or_else(|| {
                PersistenceError::Invariant("journal sequence overflow".to_owned())
            })?,
            Some(hash),
        ),
        None => (0, None),
    };
    if sequence == 0 && (source_payload_hash.is_some() || source_checkpoint_hash.is_some()) {
        return Err(PersistenceError::Invariant(
            "initial journal entry cannot have a durable source".to_owned(),
        ));
    }
    if sequence > 0 && (source_payload_hash.is_none() || source_checkpoint_hash.is_none()) {
        return Err(PersistenceError::Invariant(
            "non-initial journal entry requires a durable source".to_owned(),
        ));
    }

    let entry_hash = journal_entry_hash(
        run_id,
        sequence,
        event_kind,
        source_payload_hash,
        source_checkpoint_hash,
        checkpoint_payload_hash,
        checkpoint_hash,
        previous_entry_hash.as_deref(),
    )?;
    transaction
        .execute(
            "INSERT INTO month_run_journal (
                run_id, sequence, event_kind,
                source_checkpoint_payload_sha256, source_checkpoint_hash,
                checkpoint_payload_sha256, checkpoint_hash,
                previous_entry_sha256, entry_sha256, created_sequence
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                run_id,
                sequence,
                event_kind,
                source_payload_hash,
                source_checkpoint_hash,
                checkpoint_payload_hash,
                checkpoint_hash,
                previous_entry_hash,
                entry_hash,
                created_sequence,
            ],
        )
        .map_err(|source| PersistenceError::storage("appending the MonthRun journal", source))?;
    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct JournalHashInput<'a> {
    schema_version: &'static str,
    run_id: &'a str,
    sequence: u64,
    event_kind: &'a str,
    source_checkpoint_payload_sha256: Option<&'a str>,
    source_checkpoint_hash: Option<&'a str>,
    checkpoint_payload_sha256: &'a str,
    checkpoint_hash: &'a str,
    previous_entry_sha256: Option<&'a str>,
}

#[allow(clippy::too_many_arguments)]
fn journal_entry_hash(
    run_id: &str,
    sequence: u64,
    event_kind: &str,
    source_payload_hash: Option<&str>,
    source_checkpoint_hash: Option<&str>,
    checkpoint_payload_hash: &str,
    checkpoint_hash: &str,
    previous_entry_hash: Option<&str>,
) -> Result<String, PersistenceError> {
    let input = JournalHashInput {
        schema_version: "month-run-journal-entry-v1",
        run_id,
        sequence,
        event_kind,
        source_checkpoint_payload_sha256: source_payload_hash,
        source_checkpoint_hash,
        checkpoint_payload_sha256: checkpoint_payload_hash,
        checkpoint_hash,
        previous_entry_sha256: previous_entry_hash,
    };
    let bytes = serde_json::to_vec(&input).map_err(|error| {
        PersistenceError::Invariant(format!("failed to hash journal entry: {error}"))
    })?;
    Ok(sha256_hex(bytes))
}

fn canonical_json_value(json: &str) -> Result<serde_json::Value, PersistenceError> {
    serde_json::from_str(json).map_err(|_| PersistenceError::CorruptedStoredPayload)
}

fn row_u64(row: &Row<'_>, index: usize) -> rusqlite::Result<u64> {
    let value = row.get::<_, i64>(index)?;
    u64::try_from(value).map_err(|error| {
        rusqlite::Error::FromSqlConversionFailure(
            index,
            rusqlite::types::Type::Integer,
            Box::new(error),
        )
    })
}

fn row_optional_u64(row: &Row<'_>, index: usize) -> rusqlite::Result<Option<u64>> {
    match row.get::<_, Option<i64>>(index)? {
        Some(value) => u64::try_from(value).map(Some).map_err(|error| {
            rusqlite::Error::FromSqlConversionFailure(
                index,
                rusqlite::types::Type::Integer,
                Box::new(error),
            )
        }),
        None => Ok(None),
    }
}

fn parse_status(value: &str) -> rusqlite::Result<DurableMonthRunStatus> {
    match value {
        "ready" => Ok(DurableMonthRunStatus::Ready),
        "suspended" => Ok(DurableMonthRunStatus::Suspended),
        "completed" => Ok(DurableMonthRunStatus::Completed),
        "committed" => Ok(DurableMonthRunStatus::Committed),
        "failed" => Ok(DurableMonthRunStatus::Failed),
        "incompatible" => Ok(DurableMonthRunStatus::Incompatible),
        "recovery-required" => Ok(DurableMonthRunStatus::RecoveryRequired),
        "abandoned" => Ok(DurableMonthRunStatus::Abandoned),
        _ => Err(rusqlite::Error::InvalidQuery),
    }
}
