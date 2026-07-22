use rusqlite::{Connection, OptionalExtension};
use serde::Serialize;

use super::{
    contracts::LoadMonthRunQueryV1,
    database::Database,
    error::PersistenceError,
    hash::{sha256_hex, verify_sha256},
};

impl Database {
    pub(crate) fn verify_application_integrity(&self) -> Result<(), PersistenceError> {
        self.verify_save_integrity()?;
        let connection = self.connection()?;
        verify_active_runs(self, connection)?;
        verify_receipts(connection)?;
        verify_committed_save_links(connection)?;
        verify_active_run_cardinality(connection)
    }
}

fn verify_active_runs(
    database: &Database,
    connection: &Connection,
) -> Result<(), PersistenceError> {
    let run_ids = {
        let mut statement = connection
            .prepare(
                "SELECT run_id FROM month_runs
                 WHERE status IN ('ready', 'suspended', 'completed')
                 ORDER BY run_id",
            )
            .map_err(|source| {
                PersistenceError::storage("preparing active run recovery scan", source)
            })?;
        let rows = statement
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|source| {
                PersistenceError::storage("querying active runs for recovery", source)
            })?;
        rows.collect::<rusqlite::Result<Vec<_>>>()
            .map_err(|source| {
                PersistenceError::storage("reading active runs for recovery", source)
            })?
    };

    for run_id in run_ids {
        let run = database
            .load_month_run(LoadMonthRunQueryV1 {
                schema_version: "load-month-run-query-v1".to_owned(),
                run_id: run_id.clone(),
            })?
            .ok_or(PersistenceError::CorruptedStoredPayload)?;
        verify_journal_chain(
            connection,
            &run_id,
            &run.checkpoint.sha256,
            &run.checkpoint_hash,
        )?;
    }
    Ok(())
}

fn verify_receipts(connection: &Connection) -> Result<(), PersistenceError> {
    let mut statement = connection
        .prepare("SELECT result_json, result_sha256 FROM request_receipts ORDER BY request_id")
        .map_err(|source| {
            PersistenceError::storage("preparing receipt recovery scan", source)
        })?;
    let mut rows = statement
        .query([])
        .map_err(|source| PersistenceError::storage("querying receipts for recovery", source))?;
    while let Some(row) = rows
        .next()
        .map_err(|source| PersistenceError::storage("reading receipts for recovery", source))?
    {
        let result_json: String = row
            .get(0)
            .map_err(|source| PersistenceError::storage("reading receipt result", source))?;
        let result_sha256: String = row
            .get(1)
            .map_err(|source| PersistenceError::storage("reading receipt hash", source))?;
        verify_sha256(result_json.as_bytes(), &result_sha256)
            .map_err(|_| PersistenceError::CorruptedStoredPayload)?;
        serde_json::from_str::<serde_json::Value>(&result_json)
            .map_err(|_| PersistenceError::CorruptedStoredPayload)?;
    }
    Ok(())
}

fn verify_committed_save_links(connection: &Connection) -> Result<(), PersistenceError> {
    let invalid_committed_runs: i64 = connection
        .query_row(
            "SELECT COUNT(*)
             FROM month_runs AS run
             LEFT JOIN save_games AS save ON save.save_id = run.save_id
             WHERE run.status = 'committed'
               AND (
                 save.save_id IS NULL
                 OR run.committed_save_revision IS NULL
                 OR run.committed_save_revision > save.revision
                 OR run.result_json IS NULL
                 OR run.result_sha256 IS NULL
               )",
            [],
            |row| row.get(0),
        )
        .map_err(|source| {
            PersistenceError::storage("checking committed MonthRun links", source)
        })?;
    if invalid_committed_runs != 0 {
        return Err(PersistenceError::CorruptedStoredPayload);
    }

    let invalid_latest_links: i64 = connection
        .query_row(
            "SELECT COUNT(*)
             FROM save_games AS save
             LEFT JOIN month_runs AS run ON run.run_id = save.last_committed_run_id
             WHERE save.last_committed_run_id IS NOT NULL
               AND (
                 run.run_id IS NULL
                 OR run.save_id <> save.save_id
                 OR run.status <> 'committed'
                 OR run.committed_save_revision <> save.revision
               )",
            [],
            |row| row.get(0),
        )
        .map_err(|source| {
            PersistenceError::storage("checking latest committed save links", source)
        })?;
    if invalid_latest_links != 0 {
        return Err(PersistenceError::CorruptedStoredPayload);
    }
    Ok(())
}

fn verify_active_run_cardinality(connection: &Connection) -> Result<(), PersistenceError> {
    let duplicate_save: Option<String> = connection
        .query_row(
            "SELECT save_id
             FROM month_runs
             WHERE status IN ('ready', 'suspended', 'completed')
             GROUP BY save_id
             HAVING COUNT(*) > 1
             LIMIT 1",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|source| {
            PersistenceError::storage("checking active MonthRun cardinality", source)
        })?;
    if duplicate_save.is_some() {
        return Err(PersistenceError::CorruptedStoredPayload);
    }
    Ok(())
}

fn verify_journal_chain(
    connection: &Connection,
    run_id: &str,
    current_payload_hash: &str,
    current_checkpoint_hash: &str,
) -> Result<(), PersistenceError> {
    let mut statement = connection
        .prepare(
            "SELECT sequence, event_kind,
                    source_checkpoint_payload_sha256, source_checkpoint_hash,
                    checkpoint_payload_sha256, checkpoint_hash,
                    previous_entry_sha256, entry_sha256
             FROM month_run_journal
             WHERE run_id = ?1
             ORDER BY sequence",
        )
        .map_err(|source| {
            PersistenceError::storage("preparing journal recovery scan", source)
        })?;
    let mut rows = statement
        .query([run_id])
        .map_err(|source| PersistenceError::storage("querying journal for recovery", source))?;

    let mut expected_sequence = 0_u64;
    let mut previous_payload_hash: Option<String> = None;
    let mut previous_checkpoint_hash: Option<String> = None;
    let mut previous_entry_hash: Option<String> = None;
    while let Some(row) = rows
        .next()
        .map_err(|source| PersistenceError::storage("reading journal for recovery", source))?
    {
        let sequence = read_u64(row, 0)?;
        let event_kind: String = row
            .get(1)
            .map_err(|source| PersistenceError::storage("reading journal event kind", source))?;
        let source_payload_hash: Option<String> = row
            .get(2)
            .map_err(|source| {
                PersistenceError::storage("reading journal source payload", source)
            })?;
        let source_checkpoint_hash: Option<String> = row
            .get(3)
            .map_err(|source| {
                PersistenceError::storage("reading journal source checkpoint", source)
            })?;
        let checkpoint_payload_hash: String = row
            .get(4)
            .map_err(|source| {
                PersistenceError::storage("reading journal payload hash", source)
            })?;
        let checkpoint_hash: String = row
            .get(5)
            .map_err(|source| {
                PersistenceError::storage("reading journal checkpoint hash", source)
            })?;
        let stored_previous_entry_hash: Option<String> = row
            .get(6)
            .map_err(|source| {
                PersistenceError::storage("reading previous journal hash", source)
            })?;
        let entry_hash: String = row
            .get(7)
            .map_err(|source| {
                PersistenceError::storage("reading journal entry hash", source)
            })?;

        if sequence != expected_sequence
            || source_payload_hash != previous_payload_hash
            || source_checkpoint_hash != previous_checkpoint_hash
            || stored_previous_entry_hash != previous_entry_hash
        {
            return Err(PersistenceError::CorruptedStoredPayload);
        }
        let calculated = journal_entry_hash(JournalHashInput {
            schema_version: "month-run-journal-entry-v1",
            run_id,
            sequence,
            event_kind: &event_kind,
            source_checkpoint_payload_sha256: source_payload_hash.as_deref(),
            source_checkpoint_hash: source_checkpoint_hash.as_deref(),
            checkpoint_payload_sha256: &checkpoint_payload_hash,
            checkpoint_hash: &checkpoint_hash,
            previous_entry_sha256: stored_previous_entry_hash.as_deref(),
        })?;
        if calculated != entry_hash {
            return Err(PersistenceError::CorruptedStoredPayload);
        }

        expected_sequence = expected_sequence
            .checked_add(1)
            .ok_or_else(|| {
                PersistenceError::Invariant("journal sequence overflow".to_owned())
            })?;
        previous_payload_hash = Some(checkpoint_payload_hash);
        previous_checkpoint_hash = Some(checkpoint_hash);
        previous_entry_hash = Some(entry_hash);
    }

    if previous_payload_hash.as_deref() != Some(current_payload_hash)
        || previous_checkpoint_hash.as_deref() != Some(current_checkpoint_hash)
    {
        return Err(PersistenceError::CorruptedStoredPayload);
    }
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

fn journal_entry_hash(input: JournalHashInput<'_>) -> Result<String, PersistenceError> {
    let bytes = serde_json::to_vec(&input).map_err(|error| {
        PersistenceError::Invariant(format!("failed to hash journal entry: {error}"))
    })?;
    Ok(sha256_hex(bytes))
}

fn read_u64(row: &rusqlite::Row<'_>, index: usize) -> Result<u64, PersistenceError> {
    let value: i64 = row
        .get(index)
        .map_err(|source| PersistenceError::storage("reading journal sequence", source))?;
    u64::try_from(value).map_err(|_| PersistenceError::CorruptedStoredPayload)
}
