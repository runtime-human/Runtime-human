use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub(crate) enum PersistenceError {
    #[error("invalid persistence command: {0}")]
    InvalidCommand(String),
    #[error("canonical payload exceeds {limit} bytes")]
    PayloadTooLarge { limit: usize },
    #[error("canonical payload SHA-256 does not match its exact UTF-8 bytes")]
    PayloadHashMismatch,
    #[error("persistence command queue is full")]
    Overloaded,
    #[error("persistence worker is unavailable")]
    Unavailable,
    #[error("SQLite {actual} is older than required {minimum}")]
    UnsupportedSqliteVersion { actual: i32, minimum: i32 },
    #[error("database schema {found} is newer than supported {supported}")]
    IncompatibleSchema { found: i64, supported: i64 },
    #[error("migration history fingerprint does not match this application")]
    MigrationHistoryMismatch,
    #[error("database integrity verification failed: {0}")]
    IntegrityCheckFailed(String),
    #[error("request ID was already used with another operation or payload")]
    RequestPayloadConflict,
    #[error("save already exists")]
    SaveAlreadyExists,
    #[error("save was not found")]
    SaveNotFound,
    #[error("save revision does not match")]
    SaveRevisionConflict,
    #[error("another active MonthRun already exists for this save")]
    ActiveRunExists,
    #[error("MonthRun was not found")]
    RunNotFound,
    #[error("MonthRun revision does not match")]
    RunRevisionConflict,
    #[error("stored MonthRun checkpoint hash does not match")]
    CheckpointHashConflict,
    #[error("MonthRun is already committed")]
    RunAlreadyCommitted,
    #[error("checkpoint is not a durable MonthRun boundary")]
    InvalidRunBoundary,
    #[error("stored authoritative payload failed integrity validation")]
    CorruptedStoredPayload,
    #[error("database requires recovery before writes can continue")]
    RecoveryRequired,
    #[error("SQLite operation failed while {context}")]
    Storage {
        context: &'static str,
        #[source]
        source: rusqlite::Error,
    },
    #[error("filesystem operation failed while {context}")]
    Io {
        context: &'static str,
        #[source]
        source: std::io::Error,
    },
    #[error("backup operation failed: {0}")]
    BackupFailed(String),
    #[error("persistence invariant failed: {0}")]
    Invariant(String),
}

impl PersistenceError {
    pub(crate) fn storage(context: &'static str, source: rusqlite::Error) -> Self {
        Self::Storage { context, source }
    }

    pub(crate) fn io(context: &'static str, source: std::io::Error) -> Self {
        Self::Io { context, source }
    }

    pub(crate) fn diagnostic_code(&self) -> &'static str {
        match self {
            Self::InvalidCommand(_) => "invalid_command",
            Self::PayloadTooLarge { .. } => "payload_too_large",
            Self::PayloadHashMismatch => "payload_hash_mismatch",
            Self::Overloaded => "persistence_overloaded",
            Self::Unavailable => "persistence_unavailable",
            Self::UnsupportedSqliteVersion { .. } => "unsupported_sqlite_version",
            Self::IncompatibleSchema { .. } => "incompatible_schema",
            Self::MigrationHistoryMismatch => "migration_history_mismatch",
            Self::IntegrityCheckFailed(_) => "integrity_check_failed",
            Self::RequestPayloadConflict => "request_payload_conflict",
            Self::SaveAlreadyExists => "save_already_exists",
            Self::SaveNotFound => "save_not_found",
            Self::SaveRevisionConflict => "save_revision_conflict",
            Self::ActiveRunExists => "active_run_exists",
            Self::RunNotFound => "run_not_found",
            Self::RunRevisionConflict => "run_revision_conflict",
            Self::CheckpointHashConflict => "checkpoint_hash_conflict",
            Self::RunAlreadyCommitted => "run_already_committed",
            Self::InvalidRunBoundary => "invalid_run_boundary",
            Self::CorruptedStoredPayload => "corrupted_stored_payload",
            Self::RecoveryRequired => "recovery_required",
            Self::Storage { .. } | Self::Io { .. } | Self::Invariant(_) => "storage_unavailable",
            Self::BackupFailed(_) => "backup_failed",
        }
    }

    pub(crate) fn public(&self) -> PersistenceErrorV1 {
        PersistenceErrorV1 {
            schema_version: "persistence-error-v1",
            code: self.public_code(),
            message: self.public_message(),
        }
    }

    fn public_code(&self) -> PersistenceErrorCode {
        match self {
            Self::InvalidCommand(_) => PersistenceErrorCode::InvalidCommand,
            Self::PayloadTooLarge { .. } => PersistenceErrorCode::PayloadTooLarge,
            Self::PayloadHashMismatch => PersistenceErrorCode::PayloadHashMismatch,
            Self::Overloaded => PersistenceErrorCode::PersistenceOverloaded,
            Self::Unavailable => PersistenceErrorCode::PersistenceUnavailable,
            Self::UnsupportedSqliteVersion { .. } => PersistenceErrorCode::UnsupportedSqliteVersion,
            Self::IncompatibleSchema { .. } => PersistenceErrorCode::IncompatibleSchema,
            Self::MigrationHistoryMismatch => PersistenceErrorCode::MigrationHistoryMismatch,
            Self::IntegrityCheckFailed(_) => PersistenceErrorCode::IntegrityCheckFailed,
            Self::RequestPayloadConflict => PersistenceErrorCode::RequestPayloadConflict,
            Self::SaveAlreadyExists => PersistenceErrorCode::SaveAlreadyExists,
            Self::SaveNotFound => PersistenceErrorCode::SaveNotFound,
            Self::SaveRevisionConflict => PersistenceErrorCode::SaveRevisionConflict,
            Self::ActiveRunExists => PersistenceErrorCode::ActiveRunExists,
            Self::RunNotFound => PersistenceErrorCode::RunNotFound,
            Self::RunRevisionConflict => PersistenceErrorCode::RunRevisionConflict,
            Self::CheckpointHashConflict => PersistenceErrorCode::CheckpointHashConflict,
            Self::RunAlreadyCommitted => PersistenceErrorCode::RunAlreadyCommitted,
            Self::InvalidRunBoundary => PersistenceErrorCode::InvalidRunBoundary,
            Self::CorruptedStoredPayload => PersistenceErrorCode::CorruptedStoredPayload,
            Self::RecoveryRequired => PersistenceErrorCode::RecoveryRequired,
            Self::Storage { .. } | Self::Io { .. } | Self::Invariant(_) => {
                PersistenceErrorCode::StorageUnavailable
            }
            Self::BackupFailed(_) => PersistenceErrorCode::BackupFailed,
        }
    }

    fn public_message(&self) -> String {
        match self {
            Self::InvalidCommand(message) => message.clone(),
            Self::PayloadTooLarge { limit } => {
                format!("Canonical payload exceeds the {limit}-byte limit")
            }
            Self::PayloadHashMismatch => "Canonical payload hash does not match".to_owned(),
            Self::Overloaded => "Persistence is temporarily overloaded".to_owned(),
            Self::Unavailable => "Persistence is unavailable".to_owned(),
            Self::UnsupportedSqliteVersion { .. } => {
                "The bundled SQLite engine is unsupported".to_owned()
            }
            Self::IncompatibleSchema { .. } => {
                "This database was created by a newer application version".to_owned()
            }
            Self::MigrationHistoryMismatch => {
                "Database migration history does not match this application".to_owned()
            }
            Self::IntegrityCheckFailed(_) => "Database integrity verification failed".to_owned(),
            Self::RequestPayloadConflict => {
                "This request ID was already used for another payload".to_owned()
            }
            Self::SaveAlreadyExists => "Save already exists".to_owned(),
            Self::SaveNotFound => "Save was not found".to_owned(),
            Self::SaveRevisionConflict => "Save revision changed".to_owned(),
            Self::ActiveRunExists => "An active month already exists for this save".to_owned(),
            Self::RunNotFound => "Month run was not found".to_owned(),
            Self::RunRevisionConflict => "Month run revision changed".to_owned(),
            Self::CheckpointHashConflict => "Month run checkpoint changed".to_owned(),
            Self::RunAlreadyCommitted => "Month run is already committed".to_owned(),
            Self::InvalidRunBoundary => "Checkpoint is not a durable boundary".to_owned(),
            Self::CorruptedStoredPayload => "Stored payload failed integrity validation".to_owned(),
            Self::RecoveryRequired => "Database recovery is required".to_owned(),
            Self::BackupFailed(_) => "Database backup failed".to_owned(),
            Self::Storage { .. } | Self::Io { .. } | Self::Invariant(_) => {
                "Persistence storage is unavailable".to_owned()
            }
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "PascalCase")]
pub(crate) enum PersistenceErrorCode {
    InvalidCommand,
    PayloadTooLarge,
    PayloadHashMismatch,
    PersistenceOverloaded,
    PersistenceUnavailable,
    StorageUnavailable,
    UnsupportedSqliteVersion,
    IncompatibleSchema,
    MigrationHistoryMismatch,
    IntegrityCheckFailed,
    RequestPayloadConflict,
    SaveAlreadyExists,
    SaveNotFound,
    SaveRevisionConflict,
    ActiveRunExists,
    RunNotFound,
    RunRevisionConflict,
    CheckpointHashConflict,
    RunAlreadyCommitted,
    InvalidRunBoundary,
    CorruptedStoredPayload,
    BackupFailed,
    RecoveryRequired,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PersistenceErrorV1 {
    schema_version: &'static str,
    code: PersistenceErrorCode,
    message: String,
}

#[cfg(test)]
mod tests {
    use super::PersistenceError;

    #[test]
    fn diagnostic_codes_never_expose_free_form_error_data() {
        let invalid = PersistenceError::InvalidCommand("save-id-secret".to_owned());
        assert_eq!(invalid.diagnostic_code(), "invalid_command");
        assert!(!invalid.diagnostic_code().contains("secret"));

        let io = PersistenceError::io(
            "opening the database",
            std::io::Error::other("sensitive-database-path/private-save.sqlite3"),
        );
        assert_eq!(io.diagnostic_code(), "storage_unavailable");
        assert!(!io.diagnostic_code().contains("private-save"));
        assert!(!io.diagnostic_code().contains("sqlite3"));
    }
}
