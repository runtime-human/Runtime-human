use std::fmt;
use std::path::Path;
use std::time::Duration;

use rusqlite::config::DbConfig;
use rusqlite::{Connection, TransactionBehavior, version_number};

const MINIMUM_SQLITE_VERSION: i32 = 3_051_003;
const SCHEMA_VERSION: i64 = 1;
const BUSY_TIMEOUT_MILLISECONDS: u64 = 5_000;

const SCHEMA_V1: &str = r#"
CREATE TABLE save_games (
    save_id TEXT PRIMARY KEY,
    revision INTEGER NOT NULL CHECK (revision BETWEEN 0 AND 9007199254740991),
    snapshot_json TEXT NOT NULL,
    snapshot_sha256 TEXT NOT NULL CHECK (
        length(snapshot_sha256) = 64
        AND snapshot_sha256 NOT GLOB '*[^0-9a-f]*'
    ),
    last_committed_run_id TEXT,
    CHECK (
        last_committed_run_id IS NULL
        OR length(last_committed_run_id) BETWEEN 1 AND 128
    )
) STRICT;

CREATE TABLE pending_month_runs (
    run_id TEXT PRIMARY KEY CHECK (length(run_id) BETWEEN 1 AND 128),
    save_id TEXT NOT NULL UNIQUE
        REFERENCES save_games(save_id) ON DELETE CASCADE,
    base_save_revision INTEGER NOT NULL
        CHECK (base_save_revision BETWEEN 0 AND 9007199254740991),
    run_revision INTEGER NOT NULL
        CHECK (run_revision BETWEEN 0 AND 9007199254740991),
    status TEXT NOT NULL CHECK (status IN (
        'ready',
        'suspended',
        'completed',
        'failed',
        'incompatible',
        'recovery-required',
        'abandoned'
    )),
    checkpoint_json TEXT NOT NULL,
    checkpoint_sha256 TEXT NOT NULL CHECK (
        length(checkpoint_sha256) = 64
        AND checkpoint_sha256 NOT GLOB '*[^0-9a-f]*'
    ),
    compatibility_json TEXT NOT NULL,
    compatibility_sha256 TEXT NOT NULL CHECK (
        length(compatibility_sha256) = 64
        AND compatibility_sha256 NOT GLOB '*[^0-9a-f]*'
    )
) STRICT;

CREATE TABLE request_receipts (
    request_id TEXT PRIMARY KEY CHECK (length(request_id) BETWEEN 1 AND 128),
    operation TEXT NOT NULL CHECK (length(operation) BETWEEN 1 AND 64),
    request_json TEXT NOT NULL,
    result_json TEXT NOT NULL,
    save_id TEXT,
    run_id TEXT,
    CHECK (save_id IS NULL OR length(save_id) BETWEEN 1 AND 128),
    CHECK (run_id IS NULL OR length(run_id) BETWEEN 1 AND 128)
) STRICT;

CREATE TABLE committed_month_runs (
    run_id TEXT PRIMARY KEY CHECK (length(run_id) BETWEEN 1 AND 128),
    save_id TEXT NOT NULL REFERENCES save_games(save_id),
    base_save_revision INTEGER NOT NULL
        CHECK (base_save_revision BETWEEN 0 AND 9007199254740991),
    committed_save_revision INTEGER NOT NULL
        CHECK (committed_save_revision BETWEEN 0 AND 9007199254740991),
    final_checkpoint_sha256 TEXT NOT NULL CHECK (
        length(final_checkpoint_sha256) = 64
        AND final_checkpoint_sha256 NOT GLOB '*[^0-9a-f]*'
    ),
    snapshot_sha256 TEXT NOT NULL CHECK (
        length(snapshot_sha256) = 64
        AND snapshot_sha256 NOT GLOB '*[^0-9a-f]*'
    ),
    result_json TEXT NOT NULL
) STRICT;
"#;

#[derive(Debug)]
pub(crate) struct PersistenceDatabaseError {
    code: &'static str,
    message: String,
}

impl PersistenceDatabaseError {
    fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }

    fn storage(context: &'static str, error: rusqlite::Error) -> Self {
        Self::new("StorageUnavailable", format!("{context}: {error}"))
    }

    #[cfg(test)]
    pub(crate) const fn code(&self) -> &'static str {
        self.code
    }
}

impl fmt::Display for PersistenceDatabaseError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}: {}", self.code, self.message)
    }
}

impl std::error::Error for PersistenceDatabaseError {}

pub(crate) fn open_database(path: &Path) -> Result<Connection, PersistenceDatabaseError> {
    ensure_supported_sqlite_version()?;

    let mut connection = Connection::open(path)
        .map_err(|error| PersistenceDatabaseError::storage("database open failed", error))?;
    configure_connection(&connection)?;
    migrate(&mut connection)?;
    verify_integrity(&connection)?;
    Ok(connection)
}

fn ensure_supported_sqlite_version() -> Result<(), PersistenceDatabaseError> {
    let actual = version_number();
    if actual < MINIMUM_SQLITE_VERSION {
        return Err(PersistenceDatabaseError::new(
            "UnsupportedSqliteVersion",
            format!(
                "SQLite {actual} is below the required encoded version {MINIMUM_SQLITE_VERSION}"
            ),
        ));
    }
    Ok(())
}

fn configure_connection(connection: &Connection) -> Result<(), PersistenceDatabaseError> {
    connection
        .busy_timeout(Duration::from_millis(BUSY_TIMEOUT_MILLISECONDS))
        .map_err(|error| PersistenceDatabaseError::storage("busy timeout setup failed", error))?;

    connection
        .set_db_config(DbConfig::SQLITE_DBCONFIG_DEFENSIVE, true)
        .map_err(|error| PersistenceDatabaseError::storage("defensive mode setup failed", error))?;
    connection
        .set_db_config(DbConfig::SQLITE_DBCONFIG_TRUSTED_SCHEMA, false)
        .map_err(|error| {
            PersistenceDatabaseError::storage("trusted schema setup failed", error)
        })?;
    connection
        .set_db_config(DbConfig::SQLITE_DBCONFIG_DQS_DDL, false)
        .map_err(|error| PersistenceDatabaseError::storage("DDL quoting setup failed", error))?;
    connection
        .set_db_config(DbConfig::SQLITE_DBCONFIG_DQS_DML, false)
        .map_err(|error| PersistenceDatabaseError::storage("DML quoting setup failed", error))?;

    let journal_mode: String = connection
        .pragma_update_and_check(None, "journal_mode", "WAL", |row| row.get(0))
        .map_err(|error| PersistenceDatabaseError::storage("WAL setup failed", error))?;
    if !journal_mode.eq_ignore_ascii_case("wal") {
        return Err(PersistenceDatabaseError::new(
            "StorageUnavailable",
            format!("SQLite refused WAL mode and returned {journal_mode}"),
        ));
    }

    connection
        .pragma_update(None, "synchronous", "NORMAL")
        .map_err(|error| PersistenceDatabaseError::storage("synchronous setup failed", error))?;
    connection
        .pragma_update(None, "foreign_keys", true)
        .map_err(|error| PersistenceDatabaseError::storage("foreign key setup failed", error))?;

    verify_pragma_i64(connection, "synchronous", 1)?;
    verify_pragma_i64(connection, "foreign_keys", 1)?;
    verify_pragma_i64(
        connection,
        "busy_timeout",
        BUSY_TIMEOUT_MILLISECONDS as i64,
    )?;
    Ok(())
}

fn verify_pragma_i64(
    connection: &Connection,
    name: &'static str,
    expected: i64,
) -> Result<(), PersistenceDatabaseError> {
    let actual: i64 = connection
        .pragma_query_value(None, name, |row| row.get(0))
        .map_err(|error| PersistenceDatabaseError::storage("pragma read-back failed", error))?;
    if actual != expected {
        return Err(PersistenceDatabaseError::new(
            "StorageUnavailable",
            format!("PRAGMA {name} expected {expected}, received {actual}"),
        ));
    }
    Ok(())
}

fn migrate(connection: &mut Connection) -> Result<(), PersistenceDatabaseError> {
    let current: i64 = connection
        .pragma_query_value(None, "user_version", |row| row.get(0))
        .map_err(|error| PersistenceDatabaseError::storage("schema version read failed", error))?;

    match current {
        SCHEMA_VERSION => Ok(()),
        0 => {
            let transaction = connection
                .transaction_with_behavior(TransactionBehavior::Immediate)
                .map_err(|error| {
                    PersistenceDatabaseError::storage("migration transaction failed", error)
                })?;
            transaction
                .execute_batch(SCHEMA_V1)
                .map_err(|error| PersistenceDatabaseError::storage("schema v1 failed", error))?;
            transaction
                .pragma_update(None, "user_version", SCHEMA_VERSION)
                .map_err(|error| {
                    PersistenceDatabaseError::storage("schema version update failed", error)
                })?;
            transaction.commit().map_err(|error| {
                PersistenceDatabaseError::storage("migration commit failed", error)
            })
        }
        unsupported => Err(PersistenceDatabaseError::new(
            "StorageUnavailable",
            format!("unsupported persistence schema version {unsupported}"),
        )),
    }
}

fn verify_integrity(connection: &Connection) -> Result<(), PersistenceDatabaseError> {
    let quick_check: String = connection
        .query_row("PRAGMA quick_check(1)", [], |row| row.get(0))
        .map_err(|error| PersistenceDatabaseError::storage("quick check failed", error))?;
    if quick_check != "ok" {
        return Err(PersistenceDatabaseError::new(
            "IntegrityCheckFailed",
            format!("SQLite quick_check returned {quick_check}"),
        ));
    }

    let mut statement = connection
        .prepare("PRAGMA foreign_key_check")
        .map_err(|error| {
            PersistenceDatabaseError::storage("foreign key check preparation failed", error)
        })?;
    let mut rows = statement.query([]).map_err(|error| {
        PersistenceDatabaseError::storage("foreign key check execution failed", error)
    })?;
    if rows
        .next()
        .map_err(|error| {
            PersistenceDatabaseError::storage("foreign key check decoding failed", error)
        })?
        .is_some()
    {
        return Err(PersistenceDatabaseError::new(
            "IntegrityCheckFailed",
            "SQLite foreign_key_check found at least one violation",
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeSet;

    use rusqlite::version_number;
    use tempfile::tempdir;

    use super::open_database;

    const REQUIRED_TABLES: [&str; 4] = [
        "committed_month_runs",
        "pending_month_runs",
        "request_receipts",
        "save_games",
    ];

    #[test]
    fn opens_bundled_sqlite_with_required_runtime_gates() {
        let directory = tempdir().expect("temporary directory must be created");
        let path = directory.path().join("runtime-human.sqlite3");
        let connection = open_database(&path).expect("database must open");

        assert!(version_number() >= 3_051_003);
        assert_eq!(pragma_text(&connection, "journal_mode"), "wal");
        assert_eq!(pragma_i64(&connection, "synchronous"), 1);
        assert_eq!(pragma_i64(&connection, "foreign_keys"), 1);
        assert_eq!(pragma_i64(&connection, "busy_timeout"), 5_000);
        assert_eq!(pragma_i64(&connection, "user_version"), 1);
        assert_eq!(quick_check(&connection), "ok");
        assert_eq!(foreign_key_violation_count(&connection), 0);
    }

    #[test]
    fn migration_is_idempotent_and_preserves_the_exact_schema() {
        let directory = tempdir().expect("temporary directory must be created");
        let path = directory.path().join("runtime-human.sqlite3");

        drop(open_database(&path).expect("first open must migrate"));
        let connection = open_database(&path).expect("second open must be idempotent");

        let mut statement = connection
            .prepare(
                "SELECT name FROM sqlite_schema \
                 WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
            )
            .expect("schema query must prepare");
        let tables = statement
            .query_map([], |row| row.get::<_, String>(0))
            .expect("schema query must execute")
            .collect::<Result<BTreeSet<_>, _>>()
            .expect("table names must decode");

        assert_eq!(
            tables,
            REQUIRED_TABLES
                .into_iter()
                .map(str::to_owned)
                .collect::<BTreeSet<_>>()
        );
        assert_eq!(pragma_i64(&connection, "user_version"), 1);
        assert_eq!(quick_check(&connection), "ok");
    }

    #[test]
    fn strict_schema_rejects_invalid_revision_storage() {
        let directory = tempdir().expect("temporary directory must be created");
        let path = directory.path().join("runtime-human.sqlite3");
        let connection = open_database(&path).expect("database must open");

        let error = connection
            .execute(
                "INSERT INTO save_games (save_id, revision, snapshot_json, snapshot_sha256) \
                 VALUES ('save-strict', 'not-an-integer', '{}', ?1)",
                ["0".repeat(64)],
            )
            .expect_err("STRICT table must reject a text revision");

        assert!(error.to_string().contains("cannot store TEXT value"));
    }

    #[test]
    fn unsupported_schema_version_is_rejected_without_mutation() {
        let directory = tempdir().expect("temporary directory must be created");
        let path = directory.path().join("runtime-human.sqlite3");
        let connection = rusqlite::Connection::open(&path).expect("raw database must open");
        connection
            .pragma_update(None, "user_version", 99)
            .expect("test schema version must be written");
        drop(connection);

        let error = open_database(&path).expect_err("future schema must not be opened");

        assert_eq!(error.code(), "StorageUnavailable");
        let connection = rusqlite::Connection::open(&path).expect("raw database must reopen");
        assert_eq!(pragma_i64(&connection, "user_version"), 99);
    }

    fn pragma_text(connection: &rusqlite::Connection, name: &str) -> String {
        connection
            .pragma_query_value(None, name, |row| row.get(0))
            .expect("pragma text value must be readable")
    }

    fn pragma_i64(connection: &rusqlite::Connection, name: &str) -> i64 {
        connection
            .pragma_query_value(None, name, |row| row.get(0))
            .expect("pragma integer value must be readable")
    }

    fn quick_check(connection: &rusqlite::Connection) -> String {
        connection
            .query_row("PRAGMA quick_check(1)", [], |row| row.get(0))
            .expect("quick_check must return one result")
    }

    fn foreign_key_violation_count(connection: &rusqlite::Connection) -> usize {
        let mut statement = connection
            .prepare("PRAGMA foreign_key_check")
            .expect("foreign key check must prepare");
        let mut rows = statement.query([]).expect("foreign key check must execute");
        let mut count = 0;
        while rows.next().expect("foreign key row must decode").is_some() {
            count += 1;
        }
        count
    }
}
