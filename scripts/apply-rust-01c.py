from pathlib import Path

path = Path("apps/desktop/src-tauri/src/persistence/worker.rs")
text = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"expected exactly one match, found {count}: {old[:120]!r}")
    text = text.replace(old, new, 1)


replace_once(
    '''use std::{
    path::{Path, PathBuf},
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, AtomicU32, Ordering},
        mpsc::{self, Receiver, RecvTimeoutError, SyncSender, TrySendError},
    },
    thread::{self, JoinHandle},
    time::{Duration, Instant},
};''',
    '''use std::{
    path::{Path, PathBuf},
    sync::{
        Arc, Mutex,
        atomic::{AtomicU32, Ordering},
        mpsc::{self, Receiver, SyncSender, TrySendError},
    },
    thread::{self, JoinHandle},
    time::{Duration, Instant},
};''',
)

replace_once(
    '''const COMMAND_QUEUE_CAPACITY: usize = 64;
const SHUTDOWN_POLL_INTERVAL: Duration = Duration::from_millis(100);''',
    '''const COMMAND_QUEUE_CAPACITY: usize = 64;''',
)

replace_once(
    '''    RecoveryStatus {
        response: ResponseSender<RecoveryStatusV1>,
    },
}''',
    '''    RecoveryStatus {
        response: ResponseSender<RecoveryStatusV1>,
    },
    #[cfg(test)]
    TestBarrier {
        entered: SyncSender<()>,
        release: Receiver<()>,
        response: ResponseSender<()>,
    },
}''',
)

replace_once(
    '''            Self::CreateBackup { .. } => DesktopPerformanceOperationCategory::Backup,
            Self::RecoveryStatus { .. } => DesktopPerformanceOperationCategory::Recovery,
            Self::CreateSave { .. }''',
    '''            Self::CreateBackup { .. } => DesktopPerformanceOperationCategory::Backup,
            Self::RecoveryStatus { .. } => DesktopPerformanceOperationCategory::Recovery,
            #[cfg(test)]
            Self::TestBarrier { .. } => DesktopPerformanceOperationCategory::Recovery,
            Self::CreateSave { .. }''',
)

replace_once(
    '''struct QueuedDatabaseCommand {
    command: DatabaseCommand,
    operation_id: u64,
    category: DesktopPerformanceOperationCategory,
    enqueued_at: Instant,
    depth_at_enqueue: u32,
}
''',
    '''struct QueuedDatabaseCommand {
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
''',
)

replace_once(
    '''struct PersistenceInner {
    sender: SyncSender<QueuedDatabaseCommand>,
    queue_depth: Arc<AtomicU32>,
    performance: DesktopPerformanceRecorder,
    shutdown_requested: Arc<AtomicBool>,
    worker: Mutex<Option<JoinHandle<WorkerResult>>>,
}''',
    '''struct PersistenceInner {
    sender: SyncSender<WorkerMessage>,
    queue_depth: Arc<AtomicU32>,
    performance: DesktopPerformanceRecorder,
    admission: Mutex<AdmissionState>,
    shutdown_gate: Mutex<()>,
    worker: Mutex<Option<JoinHandle<WorkerResult>>>,
}''',
)

replace_once(
    '''        let worker_queue_depth = Arc::clone(&queue_depth);
        let worker_performance = performance.clone();
        let shutdown_requested = Arc::new(AtomicBool::new(false));
        let worker_shutdown = Arc::clone(&shutdown_requested);''',
    '''        let worker_queue_depth = Arc::clone(&queue_depth);
        let worker_performance = performance.clone();''',
)

old_call = '''                                    receiver,
                                    &worker_shutdown,
                                    &worker_queue_depth,'''
new_call = '''                                    receiver,
                                    &worker_queue_depth,'''
if text.count(old_call) != 1:
    raise SystemExit(f"expected one recovery worker call, found {text.count(old_call)}")
text = text.replace(old_call, new_call, 1)

old_call = '''                        receiver,
                        &worker_shutdown,
                        &worker_queue_depth,'''
if text.count(old_call) != 2:
    raise SystemExit(f"expected two normal/read-only worker calls, found {text.count(old_call)}")
text = text.replace(old_call, '''                        receiver,
                        &worker_queue_depth,''')

replace_once(
    '''                    queue_depth,
                    performance,
                    shutdown_requested,
                    worker: Mutex::new(Some(worker)),''',
    '''                    queue_depth,
                    performance,
                    admission: Mutex::new(AdmissionState::Open),
                    shutdown_gate: Mutex::new(()),
                    worker: Mutex::new(Some(worker)),''',
)

replace_once(
    '''    pub(crate) fn shutdown(&self) -> Result<(), PersistenceError> {
        self.inner.shutdown_requested.store(true, Ordering::Release);
        join_worker(&self.inner.worker)
    }
''',
    '''    #[cfg(test)]
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

        closed_receiver
            .recv()
            .map_err(|_| PersistenceError::Unavailable)?;
        join_worker(&self.inner.worker)
    }
''',
)

replace_once(
    '''        if self.inner.shutdown_requested.load(Ordering::Acquire) {
            return Err(PersistenceError::Unavailable);
        }

        let category = command.category();''',
    '''        let admission = self
            .inner
            .admission
            .lock()
            .map_err(|_| PersistenceError::Unavailable)?;
        if *admission == AdmissionState::Closed {
            return Err(PersistenceError::Unavailable);
        }

        let category = command.category();''',
)

replace_once(
    '''        match self.inner.sender.try_send(queued) {
            Ok(()) => Ok(()),
            Err(TrySendError::Full(_)) => {
                release_queue_depth(&self.inner.queue_depth);
                Err(PersistenceError::Overloaded)
            }
            Err(TrySendError::Disconnected(_)) => {
                release_queue_depth(&self.inner.queue_depth);
                Err(PersistenceError::Unavailable)
            }
        }''',
    '''        match self
            .inner
            .sender
            .try_send(WorkerMessage::Operation(queued))
        {
            Ok(()) => Ok(()),
            Err(TrySendError::Full(_)) => {
                release_queue_depth(&self.inner.queue_depth);
                Err(PersistenceError::Overloaded)
            }
            Err(TrySendError::Disconnected(_)) => {
                release_queue_depth(&self.inner.queue_depth);
                Err(PersistenceError::Unavailable)
            }
        }''',
)

replace_once(
    '''impl Drop for PersistenceInner {
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
}''',
    '''impl Drop for PersistenceInner {
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
}''',
)

replace_once(
    '''fn worker_loop(
    mut database: Database,
    receiver: Receiver<QueuedDatabaseCommand>,
    shutdown_requested: &AtomicBool,
    queue_depth: &AtomicU32,
    performance: &DesktopPerformanceRecorder,
    backup_directory: &Path,
    mode: WorkerMode,
) -> WorkerResult {
    loop {
        if shutdown_requested.load(Ordering::Acquire) {
            break;
        }
        match receiver.recv_timeout(SHUTDOWN_POLL_INTERVAL) {
            Ok(queued) => dispatch_observed(
                &mut database,
                queued,
                queue_depth,
                performance,
                backup_directory,
                mode,
            ),
            Err(RecvTimeoutError::Timeout) => {}
            Err(RecvTimeoutError::Disconnected) => break,
        }
    }
    database.close()
}''',
    '''fn worker_loop(
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
}''',
)

replace_once(
    '''        DatabaseCommand::RecoveryStatus { response } => {
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
    }''',
    '''        DatabaseCommand::RecoveryStatus { response } => {
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
    }''',
)

path.write_text(text, encoding="utf-8", newline="\n")
