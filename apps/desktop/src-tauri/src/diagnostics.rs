use std::{path::PathBuf, sync::Mutex};

use serde::Serialize;
use tauri::{AppHandle, Manager, Runtime, State};
use tracing_appender::{
    non_blocking::{ErrorCounter, NonBlockingBuilder, WorkerGuard},
    rolling::{RollingFileAppender, Rotation},
};
use tracing_subscriber::{EnvFilter, layer::SubscriberExt};

use crate::desktop_performance::DesktopPerformanceOperationCategory;

const LOGGING_STATUS_SCHEMA_VERSION: &str = "runtime-human-logging-status-v1";
const LOG_TARGET: &str = "runtime_human_desktop";
const DEFAULT_LOG_LEVEL: &str = "info";
const DEFAULT_FILTER_DIRECTIVE: &str = "runtime_human_desktop=info";
const LOG_BUFFERED_LINES_LIMIT: usize = 1_024;
const LOG_FILE_RETENTION_LIMIT: usize = 8;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum LoggingInitializationState {
    Active,
    LogDirectoryUnavailable,
    AppenderUnavailable,
    SubscriberUnavailable,
}

pub(crate) struct RuntimeDiagnostics {
    initialization: LoggingInitializationState,
    dropped_lines: Option<ErrorCounter>,
    _guard: Mutex<Option<WorkerGuard>>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RuntimeLoggingStatusV1 {
    schema_version: &'static str,
    active: bool,
    dropped_lines: u64,
}

impl RuntimeDiagnostics {
    pub(crate) fn initialize<R: Runtime>(
        app: &AppHandle<R>,
        log_directory_override: Option<PathBuf>,
    ) -> Self {
        let log_directory = match log_directory_override {
            Some(path) => path,
            None => match app.path().app_log_dir() {
                Ok(path) => path,
                Err(_) => {
                    return Self::inactive(LoggingInitializationState::LogDirectoryUnavailable);
                }
            },
        };

        if std::fs::create_dir_all(&log_directory).is_err() {
            return Self::inactive(LoggingInitializationState::LogDirectoryUnavailable);
        }

        let file_appender = match RollingFileAppender::builder()
            .rotation(Rotation::DAILY)
            .filename_prefix("runtime-human")
            .filename_suffix("jsonl")
            .max_log_files(LOG_FILE_RETENTION_LIMIT)
            .build(log_directory)
        {
            Ok(appender) => appender,
            Err(_) => return Self::inactive(LoggingInitializationState::AppenderUnavailable),
        };

        let (writer, guard) = NonBlockingBuilder::default()
            .buffered_lines_limit(LOG_BUFFERED_LINES_LIMIT)
            .lossy(true)
            .thread_name("runtime-human-logging")
            .finish(file_appender);
        let dropped_lines = writer.error_counter();
        let subscriber = tracing_subscriber::registry()
            .with(build_filter(
                cfg!(debug_assertions),
                std::env::var("RUST_LOG").ok().as_deref(),
            ))
            .with(
                tracing_subscriber::fmt::layer()
                    .json()
                    .flatten_event(true)
                    .with_ansi(false)
                    .with_writer(writer),
            );

        if tracing::subscriber::set_global_default(subscriber).is_err() {
            return Self::inactive(LoggingInitializationState::SubscriberUnavailable);
        }

        let diagnostics = Self {
            initialization: LoggingInitializationState::Active,
            dropped_lines: Some(dropped_lines),
            _guard: Mutex::new(Some(guard)),
        };
        log_logging_initialized();
        diagnostics
    }

    pub(crate) fn status(&self) -> RuntimeLoggingStatusV1 {
        logging_status(
            self.initialization == LoggingInitializationState::Active,
            self.dropped_line_count(),
        )
    }

    pub(crate) fn dropped_line_count(&self) -> u64 {
        self.dropped_lines
            .as_ref()
            .map(|counter| counter.dropped_lines().min(u64::MAX as usize) as u64)
            .unwrap_or(0)
    }

    fn inactive(initialization: LoggingInitializationState) -> Self {
        Self {
            initialization,
            dropped_lines: None,
            _guard: Mutex::new(None),
        }
    }
}

#[tauri::command]
pub(crate) fn desktop_get_logging_status_v1(
    diagnostics: State<'_, RuntimeDiagnostics>,
) -> RuntimeLoggingStatusV1 {
    diagnostics.status()
}

pub(crate) fn log_tauri_setup_logging_ready() {
    tracing::info!(
        event_name = "tauri_setup_logging_ready",
        "runtime lifecycle"
    );
}

pub(crate) fn log_tauri_setup_complete() {
    tracing::info!(event_name = "tauri_setup_complete", "runtime lifecycle");
}

pub(crate) fn log_persistence_worker_ready() {
    tracing::info!(event_name = "persistence_worker_ready", "runtime lifecycle");
}

pub(crate) fn log_persistence_start_failed(error_code: &'static str) {
    tracing::error!(
        event_name = "persistence_start_failed",
        error_code,
        "runtime lifecycle"
    );
}

pub(crate) fn log_persistence_operation_failed(
    category: DesktopPerformanceOperationCategory,
    error_code: &'static str,
) {
    tracing::warn!(
        event_name = "persistence_operation_failed",
        operation_category = operation_category_name(category),
        error_code,
        "runtime lifecycle"
    );
}

pub(crate) fn log_main_window_available() {
    tracing::info!(event_name = "main_window_available", "runtime lifecycle");
}

pub(crate) fn log_persistence_shutdown_failed(error_code: &'static str) {
    tracing::error!(
        event_name = "persistence_shutdown_failed",
        error_code,
        "runtime lifecycle"
    );
}

pub(crate) fn log_process_exit(dropped_lines: u64) {
    tracing::info!(
        event_name = "process_exit",
        dropped_log_lines = dropped_lines,
        "runtime lifecycle"
    );
}

fn log_logging_initialized() {
    tracing::info!(
        event_name = "logging_initialized",
        buffered_lines_limit = LOG_BUFFERED_LINES_LIMIT,
        retained_log_files = LOG_FILE_RETENTION_LIMIT,
        "runtime lifecycle"
    );
}

fn build_filter(debug_build: bool, rust_log: Option<&str>) -> EnvFilter {
    let directive = filter_directive(debug_build, rust_log);
    EnvFilter::try_new(directive).unwrap_or_else(|_| EnvFilter::new(DEFAULT_FILTER_DIRECTIVE))
}

fn filter_directive(debug_build: bool, rust_log: Option<&str>) -> String {
    let level = if debug_build {
        rust_log
            .and_then(debug_log_level)
            .unwrap_or(DEFAULT_LOG_LEVEL)
    } else {
        DEFAULT_LOG_LEVEL
    };
    format!("{LOG_TARGET}={level}")
}

fn debug_log_level(value: &str) -> Option<&'static str> {
    let candidate = value
        .strip_prefix("runtime_human_desktop=")
        .unwrap_or(value);
    match candidate {
        "error" => Some("error"),
        "warn" => Some("warn"),
        "info" => Some("info"),
        "debug" => Some("debug"),
        "trace" => Some("trace"),
        _ => None,
    }
}

fn operation_category_name(category: DesktopPerformanceOperationCategory) -> &'static str {
    match category {
        DesktopPerformanceOperationCategory::Query => "query",
        DesktopPerformanceOperationCategory::Mutation => "mutation",
        DesktopPerformanceOperationCategory::Backup => "backup",
        DesktopPerformanceOperationCategory::Recovery => "recovery",
        DesktopPerformanceOperationCategory::Shutdown => "shutdown",
    }
}

fn logging_status(active: bool, dropped_lines: u64) -> RuntimeLoggingStatusV1 {
    RuntimeLoggingStatusV1 {
        schema_version: LOGGING_STATUS_SCHEMA_VERSION,
        active,
        dropped_lines,
    }
}

#[cfg(test)]
mod tests {
    use crate::desktop_performance::DesktopPerformanceOperationCategory;

    use super::{
        DEFAULT_FILTER_DIRECTIVE, LoggingInitializationState, RuntimeDiagnostics, filter_directive,
        logging_status, operation_category_name,
    };

    #[test]
    fn release_filter_ignores_rust_log() {
        assert_eq!(
            filter_directive(false, Some("runtime_human_desktop=trace")),
            DEFAULT_FILTER_DIRECTIVE,
        );
    }

    #[test]
    fn debug_filter_accepts_only_closed_crate_levels() {
        assert_eq!(
            filter_directive(true, Some("runtime_human_desktop=debug")),
            "runtime_human_desktop=debug",
        );
        assert_eq!(
            filter_directive(true, Some("trace")),
            "runtime_human_desktop=trace",
        );
        assert_eq!(
            filter_directive(true, Some("runtime_human_desktop=trace,tauri=trace")),
            DEFAULT_FILTER_DIRECTIVE,
        );
        assert_eq!(
            filter_directive(true, Some("tauri=trace")),
            DEFAULT_FILTER_DIRECTIVE,
        );
        assert_eq!(filter_directive(true, None), DEFAULT_FILTER_DIRECTIVE);
    }

    #[test]
    fn every_initialization_failure_is_inactive_and_empty() {
        for initialization in [
            LoggingInitializationState::LogDirectoryUnavailable,
            LoggingInitializationState::AppenderUnavailable,
            LoggingInitializationState::SubscriberUnavailable,
        ] {
            let diagnostics = RuntimeDiagnostics::inactive(initialization);
            assert_eq!(
                serde_json::to_value(diagnostics.status())
                    .expect("serialize inactive diagnostics status"),
                serde_json::json!({
                    "schemaVersion": "runtime-human-logging-status-v1",
                    "active": false,
                    "droppedLines": 0,
                }),
            );
        }
    }

    #[test]
    fn operation_categories_are_closed_redacted_values() {
        assert_eq!(
            operation_category_name(DesktopPerformanceOperationCategory::Query),
            "query"
        );
        assert_eq!(
            operation_category_name(DesktopPerformanceOperationCategory::Mutation),
            "mutation"
        );
        assert_eq!(
            operation_category_name(DesktopPerformanceOperationCategory::Backup),
            "backup"
        );
        assert_eq!(
            operation_category_name(DesktopPerformanceOperationCategory::Recovery),
            "recovery"
        );
        assert_eq!(
            operation_category_name(DesktopPerformanceOperationCategory::Shutdown),
            "shutdown"
        );
    }

    #[test]
    fn logging_status_is_closed_and_numeric() {
        let active = logging_status(true, 17);
        assert_eq!(
            serde_json::to_value(active).expect("serialize active logging status"),
            serde_json::json!({
                "schemaVersion": "runtime-human-logging-status-v1",
                "active": true,
                "droppedLines": 17,
            }),
        );

        let inactive = logging_status(false, 0);
        assert_eq!(
            serde_json::to_value(inactive).expect("serialize inactive logging status"),
            serde_json::json!({
                "schemaVersion": "runtime-human-logging-status-v1",
                "active": false,
                "droppedLines": 0,
            }),
        );
    }
}
