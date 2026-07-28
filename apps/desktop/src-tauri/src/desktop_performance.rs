use std::{
    collections::HashSet,
    sync::{
        Arc, Mutex, MutexGuard, TryLockError,
        atomic::{AtomicU64, Ordering},
    },
    time::{Duration, Instant},
};

use serde::Serialize;

pub(crate) const DESKTOP_PERFORMANCE_SNAPSHOT_SCHEMA_VERSION: &str =
    "runtime-human-desktop-performance-snapshot-v1";
const DEFAULT_EVENT_CAPACITY: usize = 512;
const MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum DesktopPerformanceEventName {
    ProcessEntry,
    TauriSetupStart,
    PersistenceWorkerReady,
    TauriSetupComplete,
    MainWindowAvailable,
    TauriCommandDispatch,
    PersistenceQueueWait,
    PersistenceDatabaseOperation,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum DesktopPerformanceOperationCategory {
    Query,
    Mutation,
    Backup,
    Recovery,
    Shutdown,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DesktopPerformanceEventV1 {
    pub(crate) name: DesktopPerformanceEventName,
    pub(crate) at_micros: u64,
    pub(crate) duration_micros: Option<u64>,
    pub(crate) category: Option<DesktopPerformanceOperationCategory>,
    pub(crate) operation_id: Option<u64>,
    pub(crate) queue_depth: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DesktopPerformanceSnapshotV1 {
    pub(crate) schema_version: &'static str,
    pub(crate) events: Vec<DesktopPerformanceEventV1>,
    pub(crate) dropped_events: u64,
}

#[derive(Clone)]
pub(crate) struct DesktopPerformanceRecorder {
    inner: Arc<RecorderInner>,
}

struct RecorderInner {
    origin: Instant,
    capacity: usize,
    next_operation_id: AtomicU64,
    dropped_events: AtomicU64,
    state: Mutex<RecorderState>,
}

#[derive(Default)]
struct RecorderState {
    events: Vec<DesktopPerformanceEventV1>,
    once: HashSet<DesktopPerformanceEventName>,
}

impl Default for DesktopPerformanceRecorder {
    fn default() -> Self {
        Self::with_capacity(DEFAULT_EVENT_CAPACITY)
    }
}

impl DesktopPerformanceRecorder {
    pub(crate) fn with_capacity(capacity: usize) -> Self {
        Self {
            inner: Arc::new(RecorderInner {
                origin: Instant::now(),
                capacity,
                next_operation_id: AtomicU64::new(0),
                dropped_events: AtomicU64::new(0),
                state: Mutex::new(RecorderState::default()),
            }),
        }
    }

    pub(crate) fn record_once(&self, name: DesktopPerformanceEventName) -> bool {
        let at_micros = self.elapsed_micros();
        let Some(mut state) = self.try_lock_state() else {
            self.drop_event();
            return false;
        };
        if state.once.contains(&name) {
            return false;
        }
        if state.events.len() >= self.inner.capacity {
            self.drop_event();
            return false;
        }

        state.events.push(DesktopPerformanceEventV1 {
            name,
            at_micros,
            duration_micros: None,
            category: None,
            operation_id: None,
            queue_depth: None,
        });
        state.once.insert(name);
        true
    }

    pub(crate) fn next_operation_id(&self) -> u64 {
        self.inner
            .next_operation_id
            .fetch_update(Ordering::Relaxed, Ordering::Relaxed, |current| {
                Some(increment_bounded(current))
            })
            .map(increment_bounded)
            .unwrap_or(MAX_SAFE_INTEGER)
    }

    pub(crate) fn measure<T>(
        &self,
        name: DesktopPerformanceEventName,
        category: Option<DesktopPerformanceOperationCategory>,
        operation_id: Option<u64>,
        queue_depth: Option<u32>,
        operation: impl FnOnce() -> T,
    ) -> T {
        let at_micros = self.elapsed_micros();
        let started = Instant::now();
        let result = operation();
        self.record(DesktopPerformanceEventV1 {
            name,
            at_micros,
            duration_micros: Some(duration_micros(started.elapsed())),
            category,
            operation_id,
            queue_depth,
        });
        result
    }

    pub(crate) fn record_duration(
        &self,
        name: DesktopPerformanceEventName,
        duration: Duration,
        category: Option<DesktopPerformanceOperationCategory>,
        operation_id: Option<u64>,
        queue_depth: Option<u32>,
    ) -> bool {
        let duration_micros = duration_micros(duration);
        self.record(DesktopPerformanceEventV1 {
            name,
            at_micros: self.elapsed_micros().saturating_sub(duration_micros),
            duration_micros: Some(duration_micros),
            category,
            operation_id,
            queue_depth,
        })
    }

    pub(crate) fn snapshot(&self) -> DesktopPerformanceSnapshotV1 {
        let state = self.lock_state();
        DesktopPerformanceSnapshotV1 {
            schema_version: DESKTOP_PERFORMANCE_SNAPSHOT_SCHEMA_VERSION,
            events: state.events.clone(),
            dropped_events: self.inner.dropped_events.load(Ordering::Relaxed),
        }
    }

    #[cfg(test)]
    pub(crate) fn with_state_lock_for_test(&self, operation: impl FnOnce()) {
        let _state = self.lock_state();
        operation();
    }

    fn record(&self, event: DesktopPerformanceEventV1) -> bool {
        let Some(mut state) = self.try_lock_state() else {
            self.drop_event();
            return false;
        };
        if state.events.len() >= self.inner.capacity {
            self.drop_event();
            return false;
        }
        state.events.push(event);
        true
    }

    fn drop_event(&self) {
        let _ = self.inner.dropped_events.fetch_update(
            Ordering::Relaxed,
            Ordering::Relaxed,
            |current| Some(increment_bounded(current)),
        );
    }

    fn elapsed_micros(&self) -> u64 {
        duration_micros(self.inner.origin.elapsed())
    }

    fn lock_state(&self) -> MutexGuard<'_, RecorderState> {
        self.inner
            .state
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    fn try_lock_state(&self) -> Option<MutexGuard<'_, RecorderState>> {
        match self.inner.state.try_lock() {
            Ok(state) => Some(state),
            Err(TryLockError::Poisoned(poisoned)) => Some(poisoned.into_inner()),
            Err(TryLockError::WouldBlock) => None,
        }
    }
}

pub(crate) fn read_desktop_performance_snapshot(
    recorder: &DesktopPerformanceRecorder,
) -> DesktopPerformanceSnapshotV1 {
    recorder.snapshot()
}

#[tauri::command]
pub(crate) fn desktop_get_performance_snapshot_v1(
    recorder: tauri::State<'_, DesktopPerformanceRecorder>,
) -> DesktopPerformanceSnapshotV1 {
    read_desktop_performance_snapshot(recorder.inner())
}

fn duration_micros(duration: Duration) -> u64 {
    duration.as_micros().min(u128::from(MAX_SAFE_INTEGER)) as u64
}

const fn increment_bounded(value: u64) -> u64 {
    if value >= MAX_SAFE_INTEGER {
        MAX_SAFE_INTEGER
    } else {
        value + 1
    }
}
