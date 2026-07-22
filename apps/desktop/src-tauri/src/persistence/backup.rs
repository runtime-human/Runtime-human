use std::path::Path;

use super::{
    contracts::CreateBackupCommandV1,
    database::Database,
    error::PersistenceError,
    records::{BackupMetadataV1, MutationOutcome},
};

impl Database {
    pub(crate) fn create_backup(
        &mut self,
        _command: CreateBackupCommandV1,
        _backup_directory: &Path,
    ) -> Result<MutationOutcome<BackupMetadataV1>, PersistenceError> {
        Err(PersistenceError::BackupFailed(
            "backup implementation is not connected".to_owned(),
        ))
    }
}
