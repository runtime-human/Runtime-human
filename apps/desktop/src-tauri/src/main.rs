#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{io, sync::Arc};

use desktop_performance::{DesktopPerformanceEventName, DesktopPerformanceRecorder};
use tauri::Manager;

mod desktop_performance;
#[cfg(test)]
mod desktop_performance_tests;
mod diagnostics;
#[cfg(test)]
mod determinism;
mod persistence;

fn main() {
    let performance = DesktopPerformanceRecorder::default();
    performance.record_once(DesktopPerformanceEventName::ProcessEntry);

    let setup_performance = performance.clone();
    let app = tauri::Builder::default()
        .setup(move |app| {
            let diagnostics = diagnostics::RuntimeDiagnostics::initialize(app.handle());
            app.manage(diagnostics);
            diagnostics::log_tauri_setup_started();
            setup_performance.record_once(DesktopPerformanceEventName::TauriSetupStart);

            let data_dir = app
                .path()
                .app_data_dir()
                .map_err(|error| io::Error::other(error.to_string()))?;
            let database_path = data_dir.join("runtime-human.sqlite3");
            let persistence = persistence::PersistenceHandle::start_with_performance(
                database_path,
                setup_performance.clone(),
            )
            .map_err(|error| io::Error::other(error.to_string()))?;

            diagnostics::log_persistence_worker_ready();
            setup_performance.record_once(DesktopPerformanceEventName::PersistenceWorkerReady);
            app.manage::<persistence::ManagedPersistence>(Arc::new(persistence));
            app.manage(setup_performance.clone());
            setup_performance.record_once(DesktopPerformanceEventName::TauriSetupComplete);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            desktop_performance::desktop_get_performance_snapshot_v1,
            diagnostics::desktop_get_logging_status_v1,
            persistence::commands::persistence_create_save_v1,
            persistence::commands::persistence_load_save_v1,
            persistence::commands::persistence_begin_month_run_v1,
            persistence::commands::persistence_load_month_run_v1,
            persistence::commands::persistence_load_active_month_run_v1,
            persistence::commands::persistence_store_month_run_boundary_v1,
            persistence::commands::persistence_commit_month_run_v1,
            persistence::commands::persistence_create_backup_v1,
            persistence::commands::persistence_get_recovery_status_v1,
        ])
        .build(tauri::generate_context!())
        .expect("failed to build Runtime Human desktop shell");

    app.run(move |app_handle, event| {
        if matches!(event, tauri::RunEvent::Ready) {
            performance.record_once(DesktopPerformanceEventName::MainWindowAvailable);
            diagnostics::log_main_window_available();
        }
        if matches!(event, tauri::RunEvent::Exit) {
            let persistence = app_handle.state::<persistence::ManagedPersistence>();
            if let Err(error) = persistence.shutdown() {
                diagnostics::log_persistence_shutdown_failed(error.diagnostic_code());
            }

            let diagnostics = app_handle.state::<diagnostics::RuntimeDiagnostics>();
            diagnostics::log_process_exit(diagnostics.dropped_line_count());
        }
    });
}
