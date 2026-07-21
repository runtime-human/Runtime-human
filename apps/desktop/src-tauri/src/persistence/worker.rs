use std::{
    path::PathBuf,
    sync::{
        Mutex,
        mpsc::{self, Receiver, SyncSender, TrySendError},
    },
    thread::{self, JoinHandle},
};

use super::{
    commit_contract::CommitPersistedMonthRunCommandV1,
    contracts::{
        BeginPersistedMonthRunCommandV1, CreateSaveCommandV1, LoadActiveMonthRunQueryV1,
        LoadMonthRunQueryV1, LoadSaveQueryV1, StoreMonthRunBoundaryCommandV1,
    },
    database::Database,
    error::PersistenceError,
    records::{
        BeginPersistedMonthRunAcceptedV1, CommitPersistedMonthRunAcceptedV1, CreateSaveAcceptedV1,
        MonthRunRecordV1, MutationOutcome, RecoveryStatusV1, SaveRecordV1,
        StoreMonthRunBoundaryAcceptedV1,
    },
};

const COMMAND_QUEUE_CAPACITY: usize = 64;

type ResponseSender<T> = SyncSender<Result<T, PersistenceError>>;

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
    RecoveryStatus {
        response: ResponseSender<RecoveryStatusV1>,
    },
    Shutdown {
        response: ResponseSender<()>,
    },
}

pub(crate) struct PersistenceHandle {
    sender: SyncSender<DatabaseCommand>,
    worker: Mutex<Option<JoinHandle<()>>>,
}

impl PersistenceHandle {
    pub(crate) fn start(path: PathBuf) -> Result<Self, PersistenceError> {
        let (sender, receiver) = mpsc::sync_channel(COMMAND_QUEUE_CAPACITY);
        let (startup_sender, startup_receiver) = mpsc::sync_channel(1);
        let worker = thread::Builder::new()
            .name("runtime-human-sqlite".to_owned())
            .spawn(move || match Database::open_or_create(&path) {
                Ok(database) => {
                    let _ = startup_sender.send(Ok(()));
                    worker_loop(database, receiver);
                }
                Err(error) => {
                    let _ = startup_sender.send(Err(error));
                }
            })
            .map_err(|source| PersistenceError::io("starting the SQLite worker", source))?;

        match startup_receiver.recv() {
            Ok(Ok(())) => Ok(Self {
                sender,
                worker: Mutex::new(Some(worker)),
            }),
            Ok(Err(error)) => {
                let _ = worker.join();
                Err(error)
            }
            Err(_) => {
                let _ = worker.join();
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

    pub(crate) fn recovery_status(&self) -> Result<RecoveryStatusV1, PersistenceError> {
        let (response, receiver) = response_channel();
        self.send(DatabaseCommand::RecoveryStatus { response })?;
        receive(receiver)
    }

    pub(crate) fn shutdown(&self) -> Result<(), PersistenceError> {
        let mut worker = self
            .worker
            .lock()
            .map_err(|_| PersistenceError::Unavailable)?;
        let Some(join_handle) = worker.take() else {
            return Ok(());
        };
        let (response, receiver) = response_channel();
        self.send(DatabaseCommand::Shutdown { response })?;
        let close_result = receive(receiver);
        let join_result = join_handle.join();
        if join_result.is_err() {
            return Err(PersistenceError::Unavailable);
        }
        close_result
    }

    fn send(&self, command: DatabaseCommand) -> Result<(), PersistenceError> {
        match self.sender.try_send(command) {
            Ok(()) => Ok(()),
            Err(TrySendError::Full(_)) => Err(PersistenceError::Overloaded),
            Err(TrySendError::Disconnected(_)) => Err(PersistenceError::Unavailable),
        }
    }
}

impl Drop for PersistenceHandle {
    fn drop(&mut self) {
        let Ok(worker) = self.worker.get_mut() else {
            return;
        };
        let Some(join_handle) = worker.take() else {
            return;
        };
        let (response, receiver) = response_channel();
        if self
            .sender
            .send(DatabaseCommand::Shutdown { response })
            .is_ok()
        {
            let _ = receiver.recv();
        }
        let _ = join_handle.join();
    }
}

fn worker_loop(mut database: Database, receiver: Receiver<DatabaseCommand>) {
    while let Ok(command) = receiver.recv() {
        match command {
            DatabaseCommand::CreateSave { command, response } => {
                let _ = response.send(database.create_save(command));
            }
            DatabaseCommand::LoadSave { query, response } => {
                let _ = response.send(database.load_save(query));
            }
            DatabaseCommand::BeginMonthRun { command, response } => {
                let _ = response.send(database.begin_month_run(command));
            }
            DatabaseCommand::LoadMonthRun { query, response } => {
                let _ = response.send(database.load_month_run(query));
            }
            DatabaseCommand::LoadActiveMonthRun { query, response } => {
                let _ = response.send(database.load_active_month_run(query));
            }
            DatabaseCommand::StoreBoundary { command, response } => {
                let _ = response.send(database.store_month_run_boundary(command));
            }
            DatabaseCommand::CommitMonthRun { command, response } => {
                let _ = response.send(database.commit_month_run(command));
            }
            DatabaseCommand::RecoveryStatus { response } => {
                let _ = response.send(Ok(database.recovery_status_record()));
            }
            DatabaseCommand::Shutdown { response } => {
                let result = database.close();
                let _ = response.send(result);
                break;
            }
        }
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
