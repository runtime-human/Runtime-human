use std::{
    fs,
    path::{Path, PathBuf},
    time::Duration,
};

use rusqlite::{Connection, backup::Backup};

use super::{
    backup_receipt::{insert_backup_receipt, load_backup_receipt},
    contracts::{
        CreateBackupCommandV1, LoadActiveMonthRunQueryV1, LoadSaveQueryV1,
        normalized_command_sha256,
    },
    database::Database,
    error::PersistenceError,
    hash::sha256_hex,
    records::{BackupMetadataV1, MutationOutcome},
};

const BACKUP_STEP_PAGES: i32 = 128;
const BACKUP_STEP_PAUSE: Duration = Duration::from_millis(5);

impl Database {
    pub(crate) fn create_backup(
        &mut self,
        command: CreateBackupCommandV1,
        backup_directory: &Path,
    ) -> Result<MutationOutcome<BackupMetadataV1>, PersistenceError> {
        command.validate()?;
        let payload_hash = normalized_command_sha256(&command)?;
        if let Some(receipt) =
            load_backup_receipt(self.connection()?, &command.request_id, &payload_hash)?
        {
            verify_backup_file(backup_directory, &receipt)?;
            return Ok(MutationOutcome::Duplicate(receipt));
        }

        fs::create_dir_all(backup_directory)
            .map_err(|source| PersistenceError::io("creating the backup directory", source))?;
        let request_key = sha256_hex(command.request_id.as_bytes());
        reject_conflicting_backup(backup_directory, &request_key, &payload_hash)?;

        let source_save = self
            .load_save(LoadSaveQueryV1 {
                schema_version: "load-save-query-v1".to_owned(),
                save_id: command.save_id.clone(),
            })?
            .ok_or(PersistenceError::SaveNotFound)?;
        let source_has_active_run = self
            .load_active_month_run(LoadActiveMonthRunQueryV1 {
                schema_version: "load-active-month-run-query-v1".to_owned(),
                save_id: command.save_id.clone(),
            })?
            .is_some();

        let backup_id = format!("backup-v1-{request_key}{payload_hash}");
        let final_path = backup_path(backup_directory, &backup_id);
        if !final_path.exists() {
            create_verified_backup(
                self.connection()?,
                backup_directory,
                &backup_id,
                &command.save_id,
                source_save.revision,
                source_has_active_run,
            )?;
        }

        let metadata = BackupMetadataV1 {
            schema_version: "backup-metadata-v1".to_owned(),
            backup_id,
            save_id: command.save_id,
            save_revision: source_save.revision,
            has_active_month_run: source_has_active_run,
            quick_check: "ok".to_owned(),
            foreign_key_violations: 0,
        };
        verify_backup_file(backup_directory, &metadata)?;
        insert_backup_receipt(
            self.connection_mut()?,
            &command.request_id,
            &payload_hash,
            &metadata,
        )?;
        Ok(MutationOutcome::Accepted(metadata))
    }
}

fn create_verified_backup(
    source: &Connection,
    backup_directory: &Path,
    backup_id: &str,
    save_id: &str,
    expected_revision: u64,
    expected_active_run: bool,
) -> Result<(), PersistenceError> {
    let final_path = backup_path(backup_directory, backup_id);
    let partial_path = partial_backup_path(backup_directory, backup_id);
    remove_partial_if_present(&partial_path)?;

    let mut destination = Connection::open(&partial_path)
        .map_err(|source| PersistenceError::storage("opening the backup destination", source))?;
    {
        let backup = Backup::new(source, &mut destination)
            .map_err(|source| PersistenceError::storage("starting the SQLite backup", source))?;
        backup
            .run_to_completion(BACKUP_STEP_PAGES, BACKUP_STEP_PAUSE, None)
            .map_err(|source| PersistenceError::storage("copying the SQLite backup", source))?;
    }
    destination.close().map_err(|(_, source)| {
        PersistenceError::storage("closing the backup destination", source)
    })?;

    verify_backup_contents(
        &partial_path,
        save_id,
        expected_revision,
        expected_active_run,
    )?;
    fs::rename(&partial_path, &final_path)
        .map_err(|source| PersistenceError::io("publishing the verified backup", source))?;
    Ok(())
}

fn verify_backup_file(
    backup_directory: &Path,
    metadata: &BackupMetadataV1,
) -> Result<(), PersistenceError> {
    verify_backup_contents(
        &backup_path(backup_directory, &metadata.backup_id),
        &metadata.save_id,
        metadata.save_revision,
        metadata.has_active_month_run,
    )
}

fn verify_backup_contents(
    path: &Path,
    save_id: &str,
    expected_revision: u64,
    expected_active_run: bool,
) -> Result<(), PersistenceError> {
    let backup = Database::open_existing_read_only(path).map_err(|error| {
        PersistenceError::BackupFailed(format!("backup verification failed: {error}"))
    })?;
    let save = backup
        .load_save(LoadSaveQueryV1 {
            schema_version: "load-save-query-v1".to_owned(),
            save_id: save_id.to_owned(),
        })?
        .ok_or_else(|| {
            PersistenceError::BackupFailed("backup does not contain the save".to_owned())
        })?;
    if save.revision != expected_revision {
        return Err(PersistenceError::BackupFailed(
            "backup save revision does not match the source".to_owned(),
        ));
    }
    let has_active_run = backup
        .load_active_month_run(LoadActiveMonthRunQueryV1 {
            schema_version: "load-active-month-run-query-v1".to_owned(),
            save_id: save_id.to_owned(),
        })?
        .is_some();
    if has_active_run != expected_active_run {
        return Err(PersistenceError::BackupFailed(
            "backup active MonthRun state does not match the source".to_owned(),
        ));
    }
    backup.close()
}

fn reject_conflicting_backup(
    backup_directory: &Path,
    request_key: &str,
    payload_hash: &str,
) -> Result<(), PersistenceError> {
    let prefix = format!("backup-v1-{request_key}");
    let expected_name = format!("{prefix}{payload_hash}.sqlite3");
    for entry in fs::read_dir(backup_directory)
        .map_err(|source| PersistenceError::io("scanning the backup directory", source))?
    {
        let entry = entry
            .map_err(|source| PersistenceError::io("reading a backup directory entry", source))?;
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if name.starts_with(&prefix) && name.ends_with(".sqlite3") && name != expected_name {
            return Err(PersistenceError::RequestPayloadConflict);
        }
    }
    Ok(())
}

fn backup_path(directory: &Path, backup_id: &str) -> PathBuf {
    directory.join(format!("{backup_id}.sqlite3"))
}

fn partial_backup_path(directory: &Path, backup_id: &str) -> PathBuf {
    directory.join(format!("{backup_id}.sqlite3.partial"))
}

fn remove_partial_if_present(path: &Path) -> Result<(), PersistenceError> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(source) => Err(PersistenceError::io(
            "removing an incomplete backup",
            source,
        )),
    }
}
