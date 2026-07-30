use std::{
    path::{Path, PathBuf},
    sync::{
        Arc, Mutex,
        atomic::{AtomicU32, Ordering},
        mpsc::{self, Receiver, SyncSender, TrySendError},
    },
    thread::{self, JoinHandle},
    time::{Duration, Instant},
};

use crate::desktop_performance::{
    DesktopPerformanceEventName, DesktopPerformanceOperationCategory, DesktopPerformanceRecorder,
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
        CreateSaveAcceptedV1, MonthRunRecordV1, MutationOutcome, RecoveryStatusV1,
        RecoveryStatusV1Value, SaveRecordV1, StoreMonthRunBoundaryAcceptedV1,
    },
};

const COMMAND_QUEUE_CAPACITY: usize = 64;

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
    #[cfg(test)]
    TestBarrier {
        entered: SyncSender<()>,
        release: Receiver<()>,
        response: ResponseSender<()>,
    },
}

impl DatabaseCommand {
    fn category(&self) -> DesktopPerformanceOperationCategory {
        match self {
            Self::LoadSave { .. } | Self::LoadMonthRun { .. } | Self::LoadActiveMonthRun { .. } => {
                DesktopPerformanceOperationCategory::Query
            }
            Self::CreateBackup { .. } => DesktopPerformanceOperationCategory::Backup,
            Self::RecoveryStatus { .. } => DesktopPerformanceOperationCategory::Recovery,
            #[cfg(test)]
            Self::TestBarrier { .. } => DesktopPerformanceOperationCategory::Recovery,
            Self::CreateSave { .. }
            | Self::BeginMonthRun { .. }
            | Self::StoreBoundary { .. }
            | Self::CommitMonthRun { .. } => DesktopPerformanceOperationCategory::Mutation,
        }
    }
}

struct QueuedDatabaseCommand {
    command: DatabaseCommand,
    operation_id: u64,
    category: DesktopPerformanceOperationCategory,
    enqueued_at: Instant,
    depth_at_enqueue: u32,
}

enum WorkerMessage {
    Operation(QueuedDatabaseCommand),
    Shutdown { closed: SyncSender<()> },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum AdmissionState {
    Open,
    Closed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct PersistenceOperationContext {
    operation_id: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum WorkerMode {
    Normal,
    RecoveryReadOnly,
    NewerSchemaReadOnly { found: i64, supported: i64 },
}

struct PersistenceInner {
    sender: SyncSender<WorkerMessage>,
    queue_depth: Arc<AtomicU32>,
    performance: DesktopPerformanceRecorder,
    admission: Mutex<AdmissionState>,
    shutdown_gate: Mutex<()>,
    worker: Mutex<Option<JoinHandle<WorkerResult>>>,
}

#[derive(Clone)]
pub(crate) struct PersistenceHandle {
    inner: Arc<PersistenceInner>,
}

impl PersistenceHandle {
    pub(crate) fn start(path: PathBuf) -> Result<Self, PersistenceError> {
        Self::start_with_performance(path, DesktopPerformanceRecorder::default())
    }

    pub(crate) fn start_with_performance(
        path: PathBuf,
        performance: DesktopPerformanceRecorder,
    ) -> Result<Self, PersistenceError> {
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
        let queue_depth = Arc::new(AtomicU32::new(0));
        let worker_queue_depth = Arc::clone(&queue_depth);
        let worker_performance = performance.clone();
        let worker = thread::Builder::new()
            .name("runtime-human-sqlite".to_owned())
            .spawn(move || match Database::open_or_create(&path) {
                Ok(database) => {
                    if database.recovery_status() == RecoveryStatus::UncleanButValid
                        && database.verify_application_integrity().is_err()
                    {
                        drop(database);
                        match Database::open_existing_read_only(&path) {
                            Ok(read_only) => {
                                if startup_sender.send(Ok(())).is_err() {
                                    return read_only.close();
                                }
                                return worker_loop(
                                    read_only,
                                    receiver,
                                    &worker_queue_depth,
                                    &worker_performance,
                                    &backup_directory,
                                    WorkerMode::RecoveryReadOnly,
                                );
                            }
                            Err(error) => {
                                let _startup_receiver_closed =
                                    startup_sender.send(Err(error)).is_err();
                                return Ok(());
                            }
                        }
                    }
                    if startup_sender.send(Ok(())).is_err() {
                        return database.close();
                    }
                    worker_loop(
                        database,
                        receiver,
                        &worker_queue_depth,
                        &worker_performance,
                        &backup_directory,
                        WorkerMode::Normal,
                    )
                }
                Err(PersistenceError::IncompatibleSchema { found, supported }) => {
                    match Database::open_existing_read_only(&path) {
                        Ok(database) => {
                            if startup_sender.send(Ok(())).is_err() {
                                return database.close();
                            }
                            worker_loop(
                                database,
                                receiver,
                                &worker_queue_depth,
                                &worker_performance,
                                &backup_directory,
                                WorkerMode::NewerSchemaReadOnly { found, supported },
                            )
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
                    queue_depth,
                    performance,
                    admission: Mutex::new(AdmissionState::Open),
                    shutdown_gate: Mutex::new(()),
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

    pub(crate) fn begin_operation(&self) -> PersistenceOperationContext {
        PersistenceOperationContext {
            operation_id: self.inner.performance.next_operation_id(),
        }
    }

    pub(crate) fn record_tauri_command_dispatch(
        &self,
        operation: PersistenceOperationContext,
        category: DesktopPerformanceOperationCategory,
        duration: Duration,
    ) {
        let _recorded = self.inner.performance.record_duration(
            DesktopPerformanceEventName::TauriCommandDispatch,
            duration,
            Some(category),
            Some(operation.operation_id),
            None,
        );
    }

    pub(crate) fn create_save(
        &self,
        command: CreateSaveCommandV1,
    ) -> Result<MutationOutcome<CreateSaveAcceptedV1>, PersistenceError> {
        self.create_save_with_operation(command, self.begin_operation())
    }

    pub(crate) fn create_save_with_operation(
        &self,
        command: CreateSaveCommandV1,
        operation: PersistenceOperationContext,
    ) -> Result<MutationOutcome<CreateSaveAcceptedV1>, PersistenceError> {
        let (response, receiver) = response_channel();
        self.send(DatabaseCommand::CreateSave { command, response }, operation)?;
        receive(receiver)
    }

    pub(crate) fn load_save(
        &self,
        query: LoadSaveQueryV1,
    ) -> Result<Option<SaveRecordV1>, PersistenceError> {
        self.load_save_with_operation(query, self.begin_operation())
    }

    pub(crate) fn load_save_with_operation(
        &self,
        query: LoadSaveQueryV1,
        operation: PersistenceOperationContext,
    ) -> Result<Option<SaveRecordV1>, PersistenceError> {
        let (response, receiver) = response_channel();
        self.send(DatabaseCommand::LoadSave { query, response }, operation)?;
        receive(receiver)
    }

    pub(crate) fn begin_month_run(
        &self,
        command: BeginPersistedMonthRunCommandV1,
    ) -> Result<MutationOutcome<BeginPersistedMonthRunAcceptedV1>, PersistenceError> {
        self.begin_month_run_with_operation(command, self.begin_operation())
    }

    pub(crate) fn begin_month_run_with_operation(
        &self,
        command: BeginPersistedMonthRunCommandV1,
        operation: PersistenceOperationContext,
    ) -> Result<MutationOutcome<BeginPersistedMonthRunAcceptedV1>, PersistenceError> {
        let (response, receiver) = response_channel();
        self.send(
            DatabaseCommand::BeginMonthRun { command, response },
            operation,
        )?;
        receive(receiver)
    }

    pub(crate) fn load_month_run(
        &self,
        query: LoadMonthRunQueryV1,
    ) -> Result<Option<MonthRunRecordV1>, PersistenceError> {
        self.load_month_run_with_operation(query, self.begin_operation())
    }

    pub(crate) fn load_month_run_with_operation(
        &self,
        query: LoadMonthRunQueryV1,
        operation: PersistenceOperationContext,
    ) -> Result<Option<MonthRunRecordV1>, PersistenceError> {
        let (response, receiver) = response_channel();
        self.send(DatabaseCommand::LoadMonthRun { query, response }, operation)?;
        receive(receiver)
    }

    pub(crate) fn load_active_month_run(
        &self,
        query: LoadActiveMonthRunQueryV1,
    ) -> Result<Option<MonthRunRecordV1>, PersistenceError> {
        self.load_active_month_run_with_operation(query, self.begin_operation())
    }

    pub(crate) fn load_active_month_run_with_operation(
        &self,
        query: LoadActiveMonthRunQueryV1,
        operation: PersistenceOperationContext,
    ) -> Result<Option<MonthRunRecordV1>, PersistenceError> {
        let (response, receiver) = response_channel();
        self.send(
            DatabaseCommand::LoadActiveMonthRun { query, response },
            operation,
        )?;
        receive(receiver)
    }

    pub(crate) fn store_boundary(
        &self,
        command: StoreMonthRunBoundaryCommandV1,
    ) -> Result<MutationOutcome<StoreMonthRunBoundaryAcceptedV1>, PersistenceError> {
        self.store_boundary_with_operation(command, self.begin_operation())
    }

    pub(crate) fn store_boundary_with_operation(
        &self,
        command: StoreMonthRunBoundaryCommandV1,
        operation: PersistenceOperationContext,
    ) -> Result<MutationOutcome<StoreMonthRunBoundaryAcceptedV1>, PersistenceError> {
        let (response, receiver) = response_channel();
        self.send(
            DatabaseCommand::StoreBoundary { command, response },
            operation,
        )?;
        receive(receiver)
    }

    pub(crate) fn commit_month_run(
        &self,
        command: CommitPersistedMonthRunCommandV1,
    ) -> Result<MutationOutcome<CommitPersistedMonthRunAcceptedV1>, PersistenceError> {
        self.commit_month_run_with_operation(command, self.begin_operation())
    }

    pub(crate) fn commit_month_run_with_operation(
        &self,
        command: CommitPersistedMonthRunCommandV1,
        operation: PersistenceOperationContext,
    ) -> Result<MutationOutcome<CommitPersistedMonthRunAcceptedV1>, PersistenceError> {
        let (response, receiver) = response_channel();
        self.send(
            DatabaseCommand::CommitMonthRun { command, response },
            operation,
        )?;
        receive(receiver)
    }

    pub(crate) fn create_backup(
        &self,
        command: CreateBackupCommandV1,
    ) -> Result<MutationOutcome<BackupMetadataV1>, PersistenceError> {
        self.create_backup_with_operation(command, self.begin_operation())
    }

    pub(crate) fn create_backup_with_operation(
        &self,
        command: CreateBackupCommandV1,
        operation: PersistenceOperationContext,
    ) -> Result<MutationOutcome<BackupMetadataV1>, PersistenceError> {
        let (response, receiver) = response_channel();
        self.send(
            DatabaseCommand::CreateBackup { command, response },
            operation,
        )?;
        receive(receiver)
    }

    pub(crate) fn recovery_status(&self) -> Result<RecoveryStatusV1, PersistenceError> {
        self.recovery_status_with_operation(self.begin_operation())
    }

    pub(crate) fn recovery_status_with_operation(
        &self,
        operation: PersistenceOperationContext,
    ) -> Result<RecoveryStatusV1, PersistenceError> {
        let (response, receiver) = response_channel();
        self.send(DatabaseCommand::RecoveryStatus { response }, operation)?;
        receive(receiver)
    }

    #[cfg(test)]
    pub(crate) fn enqueue_test_barrier(
        &self,
        entered: SyncSender<()>,
        release: Receiver<()>,
    ) -> Result<mpsc::Receiver<Result<(), PersistenceError>>, PersistenceError> {
        let (response, receiver) = response_channel();
        self.send(
            DatabaseCommand::TestBarrier {
                entered,
                release,
                response,
            },
            self.begin_operation(),
        )?;
        Ok(receiver)
    }

    #[cfg(test)]
    pub(crate) fn enqueue_test_recovery_status(
        &self,
    ) -> Result<mpsc::Receiver<Result<RecoveryStatusV1, PersistenceError>>, PersistenceError> {
        let (response, receiver) = response_channel();
        self.send(
            DatabaseCommand::RecoveryStatus { response },
            self.begin_operation(),
        )?;
        Ok(receiver)
    }

    pub(crate) fn shutdown(&self) -> Result<(), PersistenceError> {
        let _shutdown_guard = self
            .inner
            .shutdown_gate
            .lock()
            .map_err(|_| PersistenceError::Unavailable)?;
        if self
            .inner
            .worker
            .lock()
            .map_err(|_| PersistenceError::Unavailable)?
            .is_none()
        {
            return Ok(());
        }

        let (closed_sender, closed_receiver) = mpsc::sync_channel(1);
        {
            let mut admission = self
                .inner
                .admission
                .lock()
                .map_err(|_| PersistenceError::Unavailable)?;
            if *admission == AdmissionState::Open {
                *admission = AdmissionState::Closed;
                if self
                    .inner
                    .sender
                    .send(WorkerMessage::Shutdown {
                        closed: closed_sender,
                    })
                    .is_err()
                {
                    return join_worker(&self.inner.worker);
                }
            }
        }

        let acknowledgement = closed_receiver
            .recv()
            .map_err(|_| PersistenceError::Unavailable);
        let worker_result = join_worker(&self.inner.worker);
        acknowledgement?;
        worker_result
    }

    fn send(
        &self,
        command: DatabaseCommand,
        operation: PersistenceOperationContext,
    ) -> Result<(), PersistenceError> {
        let admission = self
            .inner
            .admission
            .lock()
            .map_err(|_| PersistenceError::Unavailable)?;
        if *admission == AdmissionState::Closed {
            return Err(PersistenceError::Unavailable);
        }

        let category = command.category();
        let enqueued_at = Instant::now();
        let depth_at_enqueue =
            reserve_queue_depth(&self.inner.queue_depth).min(COMMAND_QUEUE_CAPACITY as u32);
        let queued = QueuedDatabaseCommand {
            command,
            operation_id: operation.operation_id,
            category,
            enqueued_at,
            depth_at_enqueue,
        };

        match self.inner.sender.try_send(WorkerMessage::Operation(queued)) {
            Ok(()) => Ok(()),
            Err(TrySendError::Full(_)) => {
                release_queue_depth(&self.inner.queue_depth);
                Err(PersistenceError::Overloaded)
            }
            Err(TrySendError::Disconnected(_)) => {
                release_queue_depth(&self.inner.queue_depth);
                Err(PersistenceError::Unavailable)
            }
        }
    }
}

impl Drop for PersistenceInner {
    fn drop(&mut self) {
        let worker_exists = match self.worker.get_mut() {
            Ok(worker) => worker.is_some(),
            Err(poisoned) => poisoned.into_inner().is_some(),
        };
        if !worker_exists {
            return;
        }

        match self.admission.get_mut() {
            Ok(admission) => *admission = AdmissionState::Closed,
            Err(poisoned) => *poisoned.into_inner() = AdmissionState::Closed,
        }
        let (closed_sender, closed_receiver) = mpsc::sync_channel(1);
        if self
            .sender
            .send(WorkerMessage::Shutdown {
                closed: closed_sender,
            })
            .is_ok()
        {
            let _closed = closed_receiver.recv();
        }

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
    receiver: Receiver<WorkerMessage>,
    queue_depth: &AtomicU32,
    performance: &DesktopPerformanceRecorder,
    backup_directory: &Path,
    mode: WorkerMode,
) -> WorkerResult {
    loop {
        match receiver.recv() {
            Ok(WorkerMessage::Operation(queued)) => dispatch_observed(
                &mut database,
                queued,
                queue_depth,
                performance,
                backup_directory,
                mode,
            ),
            Ok(WorkerMessage::Shutdown { closed }) => {
                let result = database.close();
                let _closed = closed.send(());
                return result;
            }
            Err(_) => return database.close(),
        }
    }
}

fn dispatch_observed(
    database: &mut Database,
    queued: QueuedDatabaseCommand,
    queue_depth: &AtomicU32,
    performance: &DesktopPerformanceRecorder,
    backup_directory: &Path,
    mode: WorkerMode,
) {
    let QueuedDatabaseCommand {
        command,
        operation_id,
        category,
        enqueued_at,
        depth_at_enqueue,
    } = queued;
    release_queue_depth(queue_depth);

    performance.record_duration(
        DesktopPerformanceEventName::PersistenceQueueWait,
        enqueued_at.elapsed(),
        Some(category),
        Some(operation_id),
        Some(depth_at_enqueue),
    );
    performance.measure(
        DesktopPerformanceEventName::PersistenceDatabaseOperation,
        Some(category),
        Some(operation_id),
        None,
        || dispatch(database, command, backup_directory, mode),
    );
}

fn dispatch(
    database: &mut Database,
    command: DatabaseCommand,
    backup_directory: &Path,
    mode: WorkerMode,
) {
    match command {
        DatabaseCommand::CreateSave { command, response } => {
            send_mutation(response, mode, || database.create_save(command))
        }
        DatabaseCommand::LoadSave { query, response } => {
            send_response(response, database.load_save(query));
        }
        DatabaseCommand::BeginMonthRun { command, response } => {
            send_mutation(response, mode, || database.begin_month_run(command))
        }
        DatabaseCommand::LoadMonthRun { query, response } => {
            send_response(response, database.load_month_run(query));
        }
        DatabaseCommand::LoadActiveMonthRun { query, response } => {
            send_response(response, database.load_active_month_run(query));
        }
        DatabaseCommand::StoreBoundary { command, response } => {
            send_mutation(response, mode, || {
                database.store_month_run_boundary(command)
            })
        }
        DatabaseCommand::CommitMonthRun { command, response } => {
            send_mutation(response, mode, || database.commit_month_run(command))
        }
        DatabaseCommand::CreateBackup { command, response } => {
            send_mutation(response, mode, || {
                database.create_backup(command, backup_directory)
            })
        }
        DatabaseCommand::RecoveryStatus { response } => {
            let mut status = match mode {
                WorkerMode::Normal | WorkerMode::NewerSchemaReadOnly { .. } => {
                    database.recovery_status_record()
                }
                WorkerMode::RecoveryReadOnly => RecoveryStatusV1 {
                    schema_version: "recovery-status-v1".to_owned(),
                    status: RecoveryStatusV1Value::Corrupted,
                    writable: false,
                    backup_available: false,
                },
            };
            status.backup_available = backup_available(backup_directory);
            send_response(response, Ok(status));
        }
        #[cfg(test)]
        DatabaseCommand::TestBarrier {
            entered,
            release,
            response,
        } => {
            let result = entered
                .send(())
                .map_err(|_| PersistenceError::Unavailable)
                .and_then(|()| release.recv().map_err(|_| PersistenceError::Unavailable));
            send_response(response, result);
        }
    }
}

fn send_mutation<T>(
    sender: ResponseSender<T>,
    mode: WorkerMode,
    operation: impl FnOnce() -> Result<T, PersistenceError>,
) {
    let result = match mode {
        WorkerMode::Normal => operation(),
        WorkerMode::RecoveryReadOnly => Err(PersistenceError::RecoveryRequired),
        WorkerMode::NewerSchemaReadOnly { found, supported } => {
            Err(PersistenceError::IncompatibleSchema { found, supported })
        }
    };
    send_response(sender, result);
}

fn reserve_queue_depth(queue_depth: &AtomicU32) -> u32 {
    queue_depth
        .fetch_update(Ordering::AcqRel, Ordering::Acquire, |current| {
            Some(current.saturating_add(1))
        })
        .map(|previous| previous.saturating_add(1))
        .unwrap_or(u32::MAX)
}

fn release_queue_depth(queue_depth: &AtomicU32) -> u32 {
    queue_depth
        .fetch_update(Ordering::AcqRel, Ordering::Acquire, |current| {
            current.checked_sub(1)
        })
        .map(|previous| previous - 1)
        .unwrap_or(0)
}

fn backup_available(backup_directory: &Path) -> bool {
    backup_directory
        .read_dir()
        .map(|entries| {
            entries.flatten().any(|entry| {
                entry
                    .path()
                    .extension()
                    .is_some_and(|extension| extension == "sqlite3")
            })
        })
        .unwrap_or(false)
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
