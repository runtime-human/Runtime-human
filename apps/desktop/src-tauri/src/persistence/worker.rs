use std::{
    path::{Path, PathBuf},
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, Ordering},
        mpsc::{self, Receiver, RecvTimeoutError, SyncSender, TrySendError},
    },
    thread::{self, JoinHandle},
    time::Duration,
};

use super::{
    commit_contract::CommitPersistedMonthRunCommandV1,
    contracts::{
        BeginPersistedMonthRunCommandV1, CreateBackupCommandV1, CreateSaveCommandV1,
        LoadActiveMonthRunQueryV1, LoadMonthRunQueryV1, LoadSaveQueryV1,
        StoreMonthRunBoundaryCommandV1,
    },
    database::{Database, RecoveryStatus},
    error::PersistenceError,
    records::{
        BackupMetadataV1, BeginPersistedMonthRunAcceptedV1, CommitPersistedMonthRunAcceptedV1,
        CreateSaveAcceptedV1, MonthRunRecordV1, MutationOutcome, RecoveryStatusV1, SaveRecordV1,
        StoreMonthRunBoundaryAcceptedV1,
    },
};

const COMMAND_QUEUE_CAPACITY: usize = 64;
const SHUTDOWN_POLL_INTERVAL: Duration = Duration::from_millis(100);

type ResponseSender<T> = SyncSender<Result<T, PersistenceError>>;
type WorkerResult = Result<(), PersistenceError>;

enum DatabaseCommand {
    CreateSave {
        command: CreateSaveCommandV1,
        response: ResponseSender<MutationOutcome<CreateSaveAcceptedV1>>,
    },
    LoadSave {
        query: LoadSaveQueryV1,
        response: ResponseSender<Option<SaveRecordV1>>,
    },
    BeginMonthRun {
        command: BeginPersistedMonthRunCommandV1,
        response: ResponseSender<MutationOutcome<BeginPersistedMonthRunAcceptedV1>>,
    },
    LoadMonthRun {
        query: LoadMonthRunQueryV1,
        response: ResponseSender<Option<MonthRunRecordV1>>,
    },
    LoadActiveMonthRun {
        query: LoadActiveMonthRunQueryV1,
        response: ResponseSender<Option<MonthRunRecordV1>>,
    },
    StoreBoundary {
        command: StoreMonthRunBoundaryCommandV1,
        response: ResponseSender<MutationOutcome<StoreMonthRunBoundaryAcceptedV1>>,
    },
    CommitMonthRun {
        command: CommitPersistedMonthRunCommandV1,
        response: ResponseSender<MutationOutcome<CommitPersistedMonthRunAcceptedV1>>,
    },
    CreateBackup {
        command: CreateBackupCommandV1,
        response: ResponseSender<MutationOutcome<BackupMetadataV1>>,
    },
    RecoveryStatus {
        response: ResponseSender<RecoveryStatusV1>,
    },
}

struct PersistenceInner {
    sender: SyncSender<DatabaseCommand>,
    shutdown_requested: Arc<AtomicBool>,
    worker: Mutex<Option<JoinHandle<WorkerResult>>>,
}

#[derive(Clone)]
pub(crate) struct PersistenceHandle {
    inner: Arc<PersistenceInner>,
}

impl PersistenceHandle {
    pub(crate) fn start(path: PathBuf) -> Result<Self, PersistenceError> {
        let backup_directory = path
            .parent()
            .ok_or_else(|| {
                PersistenceError::InvalidCommand(
                    "database path must have an application-owned parent directory".to_owned(),
                )
            })?
            .join("backups");
        let (sender, receiver) = mpsc::sync_channel(COMMAND_QUEUE_CAPACITY);
        let (startup_sender, startup_receiver) = mpsc::sync_channel(1);
        let shutdown_requested = Arc::new(AtomicBool::new(false));
        let worker_shutdown = Arc::clone(&shutdown_requested);
        let worker = thread::Builder::new()
            .name("runtime-human-sqlite".to_owned())
            .spawn(move || match Database::open_or_create(&path) {
                Ok(database) => {
                    if database.recovery_status() == RecoveryStatus::UncleanButValid
                        && database.verify_application_integrity().is_err()
                    {
                        let _startup_receiver_closed = startup_sender
                            .send(Err(PersistenceError::RecoveryRequired))
                            .is_err();
                        return Ok(());
                    }
                    if startup_sender.send(Ok(())).is_err() {
                        return database.close();
                    }
                    worker_loop(database, receiver, &worker_shutdown, &backup_directory)
                }
                Err(PersistenceError::IncompatibleSchema { .. }) => {
                    match Database::open_existing_read_only(&path) {
                        Ok(database) => {
                            if startup_sender.send(Ok(())).is_err() {
                                return database.close();
                            }
                            worker_loop(database, receiver, &worker_shutdown, &backup_directory)
                        }
                        Err(error) => {
                            let _startup_receiver_closed = startup_sender.send(Err(error)).is_err();
                            Ok(())
                        }
                    }
                }
                Err(error) => {
                    let _startup_receiver_closed = startup_sender.send(Err(error)).is_err();
                    Ok(())
                }
            })
            .map_err(|source| PersistenceError::io("starting the SQLite worker", source))?;

        match startup_receiver.recv() {
            Ok(Ok(())) => Ok(Self {
                inner: Arc::new(PersistenceInner {
                    sender,
                    shutdown_requested,
                    worker: Mutex::new(Some(worker)),
                }),
            }),
            Ok(Err(error)) => {
                let _worker_result = worker.join();
                Err(error)
            }
            Err(_) => {
                let _worker_result = worker.join();
                Err(PersistenceError::Unavailable)
            }
        }
    }

    pub(crate) fn create_save(
        &self,
        command: CreateSaveCommandV1,
    ) -> Result<MutationOutcome<CreateSaveAcceptedV1>, PersistenceError> {
        let (response, receiver) = response_channel();
        self.send(DatabaseCommand::CreateSave { command, response })?;
        receive(receiver)
    }

    pub(crate) fn load_save(
        &self,
        query: LoadSaveQueryV1,
    ) -> Result<Option<SaveRecordV1>, PersistenceError> {
        let (response, receiver) = response_channel();
        self.send(DatabaseCommand::LoadSave { query, response })?;
        receive(receiver)
    }

    pub(crate) fn begin_month_run(
        &self,
        command: BeginPersistedMonthRunCommandV1,
    ) -> Result<MutationOutcome<BeginPersistedMonthRunAcceptedV1>, PersistenceError> {
        let (response, receiver) = response_channel();
        self.send(DatabaseCommand::BeginMonthRun { command, response })?;
        receive(receiver)
    }

    pub(crate) fn load_month_run(
        &self,
        query: LoadMonthRunQueryV1,
    ) -> Result<Option<MonthRunRecordV1>, PersistenceError> {
        let (response, receiver) = response_channel();
        self.send(DatabaseCommand::LoadMonthRun { query, response })?;
        receive(receiver)
    }

    pub(crate) fn load_active_month_run(
        &self,
        query: LoadActiveMonthRunQueryV1,
    ) -> Result<Option<MonthRunRecordV1>, PersistenceError> {
        let (response, receiver) = response_channel();
        self.send(DatabaseCommand::LoadActiveMonthRun { query, response })?;
        receive(receiver)
    }

    pub(crate) fn store_boundary(
        &self,
        command: StoreMonthRunBoundaryCommandV1,
    ) -> Result<MutationOutcome<StoreMonthRunBoundaryAcceptedV1>, PersistenceError> {
        let (response, receiver) = response_channel();
        self.send(DatabaseCommand::StoreBoundary { command, response })?;
        receive(receiver)
    }

    pub(crate) fn commit_month_run(
        &self,
        command: CommitPersistedMonthRunCommandV1,
    ) -> Result<MutationOutcome<CommitPersistedMonthRunAcceptedV1>, PersistenceError> {
        let (response, receiver) = response_channel();
        self.send(DatabaseCommand::CommitMonthRun { command, response })?;
        receive(receiver)
    }

    pub(crate) fn create_backup(
        &self,
        command: CreateBackupCommandV1,
    ) -> Result<MutationOutcome<BackupMetadataV1>, PersistenceError> {
        let (response, receiver) = response_channel();
        self.send(DatabaseCommand::CreateBackup { command, response })?;
        receive(receiver)
    }

    pub(crate) fn recovery_status(&self) -> Result<RecoveryStatusV1, PersistenceError> {
        let (response, receiver) = response_channel();
        self.send(DatabaseCommand::RecoveryStatus { response })?;
        receive(receiver)
    }

    pub(crate) fn shutdown(&self) -> Result<(), PersistenceError> {
        self.inner.shutdown_requested.store(true, Ordering::Release);
        join_worker(&self.inner.worker)
    }

    fn send(&self, command: DatabaseCommand) -> Result<(), PersistenceError> {
        if self.inner.shutdown_requested.load(Ordering::Acquire) {
            return Err(PersistenceError::Unavailable);
        }
        match self.inner.sender.try_send(command) {
            Ok(()) => Ok(()),
            Err(TrySendError::Full(_)) => Err(PersistenceError::Overloaded),
            Err(TrySendError::Disconnected(_)) => Err(PersistenceError::Unavailable),
        }
    }
}

impl Drop for PersistenceInner {
    fn drop(&mut self) {
        self.shutdown_requested.store(true, Ordering::Release);
        let worker = match self.worker.get_mut() {
            Ok(worker) => worker.take(),
            Err(poisoned) => poisoned.into_inner().take(),
        };
        if let Some(worker) = worker {
            let _worker_result = worker.join();
        }
    }
}

fn join_worker(worker: &Mutex<Option<JoinHandle<WorkerResult>>>) -> Result<(), PersistenceError> {
    let join_handle = worker
        .lock()
        .map_err(|_| PersistenceError::Unavailable)?
        .take();
    let Some(join_handle) = join_handle else {
        return Ok(());
    };
    join_handle
        .join()
        .map_err(|_| PersistenceError::Unavailable)?
}

fn worker_loop(
    mut database: Database,
    receiver: Receiver<DatabaseCommand>,
    shutdown_requested: &AtomicBool,
    backup_directory: &Path,
) -> WorkerResult {
    loop {
        if shutdown_requested.load(Ordering::Acquire) {
            break;
        }
        match receiver.recv_timeout(SHUTDOWN_POLL_INTERVAL) {
            Ok(command) => dispatch(&mut database, command, backup_directory),
            Err(RecvTimeoutError::Timeout) => {}
            Err(RecvTimeoutError::Disconnected) => break,
        }
    }
    database.close()
}

fn dispatch(database: &mut Database, command: DatabaseCommand, backup_directory: &Path) {
    match command {
        DatabaseCommand::CreateSave { command, response } => {
            send_response(response, database.create_save(command));
        }
        DatabaseCommand::LoadSave { query, response } => {
            send_response(response, database.load_save(query));
        }
        DatabaseCommand::BeginMonthRun { command, response } => {
            send_response(response, database.begin_month_run(command));
        }
        DatabaseCommand::LoadMonthRun { query, response } => {
            send_response(response, database.load_month_run(query));
        }
        DatabaseCommand::LoadActiveMonthRun { query, response } => {
            send_response(response, database.load_active_month_run(query));
        }
        DatabaseCommand::StoreBoundary { command, response } => {
            send_response(response, database.store_month_run_boundary(command));
        }
        DatabaseCommand::CommitMonthRun { command, response } => {
            send_response(response, database.commit_month_run(command));
        }
        DatabaseCommand::CreateBackup { command, response } => {
            send_response(response, database.create_backup(command, backup_directory));
        }
        DatabaseCommand::RecoveryStatus { response } => {
            let mut status = database.recovery_status_record();
            status.backup_available = backup_directory
                .read_dir()
                .map(|entries| {
                    entries.flatten().any(|entry| {
                        entry
                            .path()
                            .extension()
                            .is_some_and(|extension| extension == "sqlite3")
                    })
                })
                .unwrap_or(false);
            send_response(response, Ok(status));
        }
    }
}

fn send_response<T>(sender: ResponseSender<T>, result: Result<T, PersistenceError>) {
    if sender.send(result).is_err() {
        tracing::debug!("persistence caller dropped its response channel");
    }
}

fn response_channel<T>() -> (
    ResponseSender<T>,
    mpsc::Receiver<Result<T, PersistenceError>>,
) {
    mpsc::sync_channel(1)
}

fn receive<T>(
    receiver: mpsc::Receiver<Result<T, PersistenceError>>,
) -> Result<T, PersistenceError> {
    receiver.recv().map_err(|_| PersistenceError::Unavailable)?
}
