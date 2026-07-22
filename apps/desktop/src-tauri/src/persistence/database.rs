use std::{
    fs,
    path::{Path, PathBuf},
    time::Duration,
};

use rusqlite::{
    Connection, OpenFlags, OptionalExtension, TransactionBehavior, config::DbConfig, limits::Limit,
    version_number,
};

use super::{
    error::PersistenceError,
    failpoint,
    migrations::{
        CURRENT_SCHEMA_VERSION, apply_migrations, migration_manifest_sha256, migration_set,
    },
};

const MINIMUM_SQLITE_VERSION: i32 = 3_051_003;
const BUSY_TIMEOUT: Duration = Duration::from_secs(5);
const MAX_SQLITE_VALUE_BYTES: i32 = 8 * 1024 * 1024;
const MAX_SQL_BYTES: i32 = 1024 * 1024;
const MAX_SQL_VARIABLES: i32 = 256;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum RecoveryStatus {
    Healthy,
    UncleanButValid,
    NewerSchemaReadOnly,
}

pub(crate) struct Database {
    path: PathBuf,
    connection: Option<Connection>,
    writable: bool,
    recovery_status: RecoveryStatus,
}

impl Database {
    pub(crate) fn open_or_create(path: &Path) -> Result<Self, PersistenceError> {
        prepare_writable_path(path)?;
        ensure_supported_sqlite_version()?;

        let mut connection = Connection::open(path)
            .map_err(|source| PersistenceError::storage("opening the database", source))?;
        ensure_writable_schema_compatibility(&connection)?;
        configure_writable_connection(&connection)?;
        migrate_if_required(&mut connection)?;
        verify_migration_manifest(&connection)?;
        verify_integrity(&connection)?;

        let previous_clean_shutdown = metadata_value(&connection, "clean_shutdown")?;
        set_clean_shutdown(&mut connection, false)?;

        Ok(Self {
            path: path.to_path_buf(),
            connection: Some(connection),
            writable: true,
            recovery_status: if previous_clean_shutdown.as_deref() == Some("true") {
                RecoveryStatus::Healthy
            } else {
                RecoveryStatus::UncleanButValid
            },
        })
    }

    pub(crate) fn open_existing_read_only(path: &Path) -> Result<Self, PersistenceError> {
        if !path.is_file() {
            return Err(PersistenceError::InvalidCommand(
                "read-only database path must reference an existing regular file".to_owned(),
            ));
        }
        ensure_supported_sqlite_version()?;

        let connection = Connection::open_with_flags(
            path,
            OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
        )
        .map_err(|source| PersistenceError::storage("opening the database read-only", source))?;
        connection.busy_timeout(BUSY_TIMEOUT).map_err(|source| {
            PersistenceError::storage("configuring read-only busy timeout", source)
        })?;
        connection
            .pragma_update(None, "query_only", true)
            .map_err(|source| PersistenceError::storage("enabling query-only mode", source))?;

        let version = schema_version(&connection)?;
        let recovery_status = if version > CURRENT_SCHEMA_VERSION {
            RecoveryStatus::NewerSchemaReadOnly
        } else {
            if version != CURRENT_SCHEMA_VERSION {
                return Err(PersistenceError::IncompatibleSchema {
                    found: version,
                    supported: CURRENT_SCHEMA_VERSION,
                });
            }
            verify_migration_manifest(&connection)?;
            RecoveryStatus::Healthy
        };
        verify_integrity(&connection)?;

        Ok(Self {
            path: path.to_path_buf(),
            connection: Some(connection),
            writable: false,
            recovery_status,
        })
    }

    pub(crate) fn path(&self) -> &Path {
        &self.path
    }

    pub(crate) fn connection(&self) -> Result<&Connection, PersistenceError> {
        self.connection
            .as_ref()
            .ok_or(PersistenceError::Unavailable)
    }

    pub(crate) fn connection_mut(&mut self) -> Result<&mut Connection, PersistenceError> {
        if !self.writable {
            return Err(PersistenceError::IncompatibleSchema {
                found: schema_version(self.connection()?)?,
                supported: CURRENT_SCHEMA_VERSION,
            });
        }
        self.connection
            .as_mut()
            .ok_or(PersistenceError::Unavailable)
    }

    pub(crate) const fn recovery_status(&self) -> RecoveryStatus {
        self.recovery_status
    }

    pub(crate) const fn is_writable(&self) -> bool {
        self.writable
    }

    pub(crate) fn close(mut self) -> Result<(), PersistenceError> {
        if self.writable {
            let connection = self.connection_mut()?;
            let _: (i64, i64, i64) = connection
                .query_row("PRAGMA wal_checkpoint(PASSIVE)", [], |row| {
                    Ok((row.get(0)?, row.get(1)?, row.get(2)?))
                })
                .map_err(|source| {
                    PersistenceError::storage("requesting the shutdown WAL checkpoint", source)
                })?;
            failpoint::hit("after_shutdown_checkpoint_before_clean_marker");
            set_clean_shutdown(connection, true)?;
        }

        let connection = self
            .connection
            .take()
            .ok_or(PersistenceError::Unavailable)?;
        connection.close().map_err(|(_, source)| {
            PersistenceError::storage("closing the database connection", source)
        })
    }
}

fn prepare_writable_path(path: &Path) -> Result<(), PersistenceError> {
    if path.as_os_str().is_empty() || path.file_name().is_none() {
        return Err(PersistenceError::InvalidCommand(
            "database path must include a file name".to_owned(),
        ));
    }
    if path.exists() && !path.is_file() {
        return Err(PersistenceError::InvalidCommand(
            "database path must reference a regular file".to_owned(),
        ));
    }
    let parent = path.parent().ok_or_else(|| {
        PersistenceError::InvalidCommand("database path must have a parent directory".to_owned())
    })?;
    fs::create_dir_all(parent)
        .map_err(|source| PersistenceError::io("creating the database directory", source))?;
    Ok(())
}

fn ensure_supported_sqlite_version() -> Result<(), PersistenceError> {
    let actual = version_number();
    if actual < MINIMUM_SQLITE_VERSION {
        return Err(PersistenceError::UnsupportedSqliteVersion {
            actual,
            minimum: MINIMUM_SQLITE_VERSION,
        });
    }
    Ok(())
}

fn ensure_writable_schema_compatibility(
    connection: &Connection,
) -> Result<(), PersistenceError> {
    let version = schema_version(connection)?;
    if version > CURRENT_SCHEMA_VERSION {
        return Err(PersistenceError::IncompatibleSchema {
            found: version,
            supported: CURRENT_SCHEMA_VERSION,
        });
    }
    Ok(())
}

fn configure_writable_connection(connection: &Connection) -> Result<(), PersistenceError> {
    connection
        .busy_timeout(BUSY_TIMEOUT)
        .map_err(|source| PersistenceError::storage("configuring the busy timeout", source))?;

    connection
        .set_db_config(DbConfig::SQLITE_DBCONFIG_DEFENSIVE, true)
        .map_err(|source| PersistenceError::storage("enabling defensive mode", source))?;
    connection
        .set_db_config(DbConfig::SQLITE_DBCONFIG_TRUSTED_SCHEMA, false)
        .map_err(|source| PersistenceError::storage("disabling trusted schema", source))?;
    connection
        .set_db_config(DbConfig::SQLITE_DBCONFIG_DQS_DDL, false)
        .map_err(|source| {
            PersistenceError::storage("disabling DDL double-quoted strings", source)
        })?;
    connection
        .set_db_config(DbConfig::SQLITE_DBCONFIG_DQS_DML, false)
        .map_err(|source| {
            PersistenceError::storage("disabling DML double-quoted strings", source)
        })?;

    connection
        .set_limit(Limit::SQLITE_LIMIT_ATTACHED, 0)
        .map_err(|source| PersistenceError::storage("disabling attached databases", source))?;
    connection
        .set_limit(Limit::SQLITE_LIMIT_LENGTH, MAX_SQLITE_VALUE_BYTES)
        .map_err(|source| PersistenceError::storage("limiting SQLite values", source))?;
    connection
        .set_limit(Limit::SQLITE_LIMIT_SQL_LENGTH, MAX_SQL_BYTES)
        .map_err(|source| PersistenceError::storage("limiting SQL length", source))?;
    connection
        .set_limit(Limit::SQLITE_LIMIT_VARIABLE_NUMBER, MAX_SQL_VARIABLES)
        .map_err(|source| PersistenceError::storage("limiting SQL variables", source))?;

    let journal_mode: String = connection
        .pragma_update_and_check(None, "journal_mode", "WAL", |row| row.get(0))
        .map_err(|source| PersistenceError::storage("enabling WAL", source))?;
    if !journal_mode.eq_ignore_ascii_case("wal") {
        return Err(PersistenceError::Invariant(format!(
            "SQLite refused WAL mode and returned {journal_mode}"
        )));
    }

    connection
        .pragma_update(None, "synchronous", "FULL")
        .map_err(|source| PersistenceError::storage("enabling FULL synchronous mode", source))?;
    connection
        .pragma_update(None, "foreign_keys", true)
        .map_err(|source| PersistenceError::storage("enabling foreign keys", source))?;

    verify_pragma_i64(connection, "synchronous", 2)?;
    verify_pragma_i64(connection, "foreign_keys", 1)?;
    verify_pragma_i64(connection, "busy_timeout", BUSY_TIMEOUT.as_millis() as i64)?;
    Ok(())
}

fn migrate_if_required(connection: &mut Connection) -> Result<(), PersistenceError> {
    let version = schema_version(connection)?;
    if version > CURRENT_SCHEMA_VERSION {
        return Err(PersistenceError::IncompatibleSchema {
            found: version,
            supported: CURRENT_SCHEMA_VERSION,
        });
    }

    let pending = migration_set()
        .pending_migrations(connection)
        .map_err(|error| {
            PersistenceError::Invariant(format!("migration inspection failed: {error}"))
        })?;
    if pending < 0 {
        return Err(PersistenceError::IncompatibleSchema {
            found: version,
            supported: CURRENT_SCHEMA_VERSION,
        });
    }
    if pending == 0 {
        return Ok(());
    }

    if version == 0 && has_application_objects(connection)? {
        return Err(PersistenceError::RecoveryRequired);
    }
    apply_migrations(connection)
}

fn has_application_objects(connection: &Connection) -> Result<bool, PersistenceError> {
    connection
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%')",
            [],
            |row| row.get(0),
        )
        .map_err(|source| PersistenceError::storage("inspecting the pre-migration schema", source))
}

fn verify_migration_manifest(connection: &Connection) -> Result<(), PersistenceError> {
    let actual = metadata_value(connection, "migration_manifest_sha256")?;
    if actual.as_deref() != Some(migration_manifest_sha256().as_str()) {
        return Err(PersistenceError::MigrationHistoryMismatch);
    }
    Ok(())
}

fn metadata_value(connection: &Connection, key: &str) -> Result<Option<String>, PersistenceError> {
    connection
        .query_row(
            "SELECT value FROM app_metadata WHERE key = ?1",
            [key],
            |row| row.get(0),
        )
        .optional()
        .map_err(|source| PersistenceError::storage("reading application metadata", source))
}

fn set_clean_shutdown(connection: &mut Connection, clean: bool) -> Result<(), PersistenceError> {
    let transaction = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|source| PersistenceError::storage("starting metadata transaction", source))?;
    let changed = transaction
        .execute(
            "UPDATE app_metadata SET value = ?1 WHERE key = 'clean_shutdown'",
            [if clean { "true" } else { "false" }],
        )
        .map_err(|source| PersistenceError::storage("updating clean-shutdown metadata", source))?;
    if changed != 1 {
        return Err(PersistenceError::Invariant(
            "clean-shutdown metadata row is missing".to_owned(),
        ));
    }
    transaction
        .commit()
        .map_err(|source| PersistenceError::storage("committing metadata transaction", source))
}

fn schema_version(connection: &Connection) -> Result<i64, PersistenceError> {
    connection
        .pragma_query_value(None, "user_version", |row| row.get(0))
        .map_err(|source| PersistenceError::storage("reading schema version", source))
}

fn verify_pragma_i64(
    connection: &Connection,
    name: &'static str,
    expected: i64,
) -> Result<(), PersistenceError> {
    let actual: i64 = connection
        .pragma_query_value(None, name, |row| row.get(0))
        .map_err(|source| PersistenceError::storage("reading back SQLite configuration", source))?;
    if actual != expected {
        return Err(PersistenceError::Invariant(format!(
            "PRAGMA {name} expected {expected}, received {actual}"
        )));
    }
    Ok(())
}

pub(crate) fn verify_integrity(connection: &Connection) -> Result<(), PersistenceError> {
    let quick_check: String = connection
        .query_row("PRAGMA quick_check(1)", [], |row| row.get(0))
        .map_err(|source| PersistenceError::storage("running SQLite quick_check", source))?;
    if quick_check != "ok" {
        return Err(PersistenceError::IntegrityCheckFailed(quick_check));
    }

    let mut statement = connection
        .prepare("PRAGMA foreign_key_check")
        .map_err(|source| PersistenceError::storage("preparing foreign_key_check", source))?;
    let mut rows = statement
        .query([])
        .map_err(|source| PersistenceError::storage("running foreign_key_check", source))?;
    if rows
        .next()
        .map_err(|source| PersistenceError::storage("reading foreign_key_check", source))?
        .is_some()
    {
        return Err(PersistenceError::IntegrityCheckFailed(
            "foreign_key_check reported a violation".to_owned(),
        ));
    }
    Ok(())
}
