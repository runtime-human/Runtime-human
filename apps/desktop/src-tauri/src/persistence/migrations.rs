use rusqlite::params;
use rusqlite_migration::{M, Migrations};

use super::{error::PersistenceError, hash::sha256_hex};

pub(crate) const CURRENT_SCHEMA_VERSION: i64 = 1;
const MIGRATION_V1_NAME: &str = "initial-durable-store";

const SCHEMA_V1: &str = r#"
CREATE TABLE app_metadata (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
) STRICT;

CREATE TABLE save_games (
    save_id TEXT PRIMARY KEY NOT NULL CHECK (length(save_id) BETWEEN 1 AND 128),
    revision INTEGER NOT NULL CHECK (revision BETWEEN 0 AND 9007199254740991),
    snapshot_json TEXT NOT NULL,
    snapshot_sha256 TEXT NOT NULL CHECK (
        length(snapshot_sha256) = 64
        AND snapshot_sha256 NOT GLOB '*[^0-9a-f]*'
    ),
    save_schema_fingerprint TEXT NOT NULL CHECK (
        length(save_schema_fingerprint) = 64
        AND save_schema_fingerprint NOT GLOB '*[^0-9a-f]*'
    ),
    last_committed_run_id TEXT,
    created_sequence INTEGER NOT NULL CHECK (created_sequence >= 0),
    updated_sequence INTEGER NOT NULL CHECK (updated_sequence >= created_sequence),
    CHECK (
        last_committed_run_id IS NULL
        OR length(last_committed_run_id) BETWEEN 1 AND 128
    )
) STRICT;

CREATE TABLE month_runs (
    run_id TEXT PRIMARY KEY NOT NULL CHECK (length(run_id) BETWEEN 1 AND 128),
    save_id TEXT NOT NULL REFERENCES save_games(save_id) ON DELETE RESTRICT,
    base_save_revision INTEGER NOT NULL CHECK (
        base_save_revision BETWEEN 0 AND 9007199254740991
    ),
    run_revision INTEGER NOT NULL CHECK (run_revision BETWEEN 0 AND 9007199254740991),
    status TEXT NOT NULL CHECK (status IN (
        'ready',
        'suspended',
        'completed',
        'committed',
        'failed',
        'incompatible',
        'recovery-required',
        'abandoned'
    )),
    checkpoint_json TEXT NOT NULL,
    checkpoint_payload_sha256 TEXT NOT NULL CHECK (
        length(checkpoint_payload_sha256) = 64
        AND checkpoint_payload_sha256 NOT GLOB '*[^0-9a-f]*'
    ),
    checkpoint_hash TEXT NOT NULL CHECK (
        length(checkpoint_hash) = 64
        AND checkpoint_hash NOT GLOB '*[^0-9a-f]*'
    ),
    previous_checkpoint_hash TEXT,
    compatibility_json TEXT NOT NULL,
    compatibility_payload_sha256 TEXT NOT NULL CHECK (
        length(compatibility_payload_sha256) = 64
        AND compatibility_payload_sha256 NOT GLOB '*[^0-9a-f]*'
    ),
    committed_save_revision INTEGER CHECK (
        committed_save_revision IS NULL
        OR committed_save_revision BETWEEN 0 AND 9007199254740991
    ),
    result_json TEXT,
    result_sha256 TEXT,
    created_sequence INTEGER NOT NULL CHECK (created_sequence >= 0),
    updated_sequence INTEGER NOT NULL CHECK (updated_sequence >= created_sequence),
    CHECK (
        previous_checkpoint_hash IS NULL
        OR (
            length(previous_checkpoint_hash) = 64
            AND previous_checkpoint_hash NOT GLOB '*[^0-9a-f]*'
        )
    ),
    CHECK (
        result_sha256 IS NULL
        OR (
            length(result_sha256) = 64
            AND result_sha256 NOT GLOB '*[^0-9a-f]*'
        )
    ),
    CHECK (
        (
            status = 'committed'
            AND committed_save_revision IS NOT NULL
            AND result_json IS NOT NULL
            AND result_sha256 IS NOT NULL
        )
        OR (
            status <> 'committed'
            AND committed_save_revision IS NULL
            AND result_json IS NULL
            AND result_sha256 IS NULL
        )
    )
) STRICT;

CREATE UNIQUE INDEX ux_month_runs_one_active_per_save
ON month_runs(save_id)
WHERE status IN ('ready', 'suspended', 'completed');

CREATE TABLE request_receipts (
    request_id TEXT PRIMARY KEY NOT NULL CHECK (length(request_id) BETWEEN 1 AND 128),
    operation TEXT NOT NULL CHECK (length(operation) BETWEEN 1 AND 64),
    payload_sha256 TEXT NOT NULL CHECK (
        length(payload_sha256) = 64
        AND payload_sha256 NOT GLOB '*[^0-9a-f]*'
    ),
    result_json TEXT NOT NULL,
    result_sha256 TEXT NOT NULL CHECK (
        length(result_sha256) = 64
        AND result_sha256 NOT GLOB '*[^0-9a-f]*'
    ),
    save_id TEXT,
    run_id TEXT,
    created_sequence INTEGER NOT NULL CHECK (created_sequence >= 0),
    CHECK (save_id IS NULL OR length(save_id) BETWEEN 1 AND 128),
    CHECK (run_id IS NULL OR length(run_id) BETWEEN 1 AND 128)
) STRICT;

CREATE TABLE month_run_journal (
    run_id TEXT NOT NULL REFERENCES month_runs(run_id) ON DELETE RESTRICT,
    sequence INTEGER NOT NULL CHECK (sequence >= 0),
    event_kind TEXT NOT NULL CHECK (length(event_kind) BETWEEN 1 AND 64),
    source_checkpoint_payload_sha256 TEXT,
    source_checkpoint_hash TEXT,
    checkpoint_payload_sha256 TEXT NOT NULL CHECK (
        length(checkpoint_payload_sha256) = 64
        AND checkpoint_payload_sha256 NOT GLOB '*[^0-9a-f]*'
    ),
    checkpoint_hash TEXT NOT NULL CHECK (
        length(checkpoint_hash) = 64
        AND checkpoint_hash NOT GLOB '*[^0-9a-f]*'
    ),
    previous_entry_sha256 TEXT,
    entry_sha256 TEXT NOT NULL CHECK (
        length(entry_sha256) = 64
        AND entry_sha256 NOT GLOB '*[^0-9a-f]*'
    ),
    created_sequence INTEGER NOT NULL CHECK (created_sequence >= 0),
    PRIMARY KEY (run_id, sequence),
    CHECK (
        source_checkpoint_payload_sha256 IS NULL
        OR (
            length(source_checkpoint_payload_sha256) = 64
            AND source_checkpoint_payload_sha256 NOT GLOB '*[^0-9a-f]*'
        )
    ),
    CHECK (
        source_checkpoint_hash IS NULL
        OR (
            length(source_checkpoint_hash) = 64
            AND source_checkpoint_hash NOT GLOB '*[^0-9a-f]*'
        )
    ),
    CHECK (
        previous_entry_sha256 IS NULL
        OR (
            length(previous_entry_sha256) = 64
            AND previous_entry_sha256 NOT GLOB '*[^0-9a-f]*'
        )
    ),
    CHECK (
        (sequence = 0 AND source_checkpoint_payload_sha256 IS NULL AND source_checkpoint_hash IS NULL)
        OR
        (sequence > 0 AND source_checkpoint_payload_sha256 IS NOT NULL AND source_checkpoint_hash IS NOT NULL)
    )
) STRICT, WITHOUT ROWID;
"#;

pub(crate) fn migration_manifest_sha256() -> String {
    sha256_hex(format!("1\0{MIGRATION_V1_NAME}\0{SCHEMA_V1}"))
}

pub(crate) fn migration_set() -> Migrations<'static> {
    Migrations::new(vec![
        M::up_with_hook(SCHEMA_V1, |transaction| {
            let manifest = migration_manifest_sha256();
            transaction.execute(
                "INSERT INTO app_metadata (key, value) VALUES (?1, ?2)",
                params!["migration_manifest_sha256", manifest],
            )?;
            transaction.execute(
                "INSERT INTO app_metadata (key, value) VALUES (?1, ?2)",
                params!["operation_sequence", "0"],
            )?;
            transaction.execute(
                "INSERT INTO app_metadata (key, value) VALUES (?1, ?2)",
                params!["clean_shutdown", "true"],
            )?;
            Ok(())
        })
        .foreign_key_check(),
    ])
}

pub(crate) fn apply_migrations(
    connection: &mut rusqlite::Connection,
) -> Result<(), PersistenceError> {
    migration_set()
        .to_latest(connection)
        .map_err(|error| PersistenceError::Invariant(format!("migration failed: {error}")))
}
