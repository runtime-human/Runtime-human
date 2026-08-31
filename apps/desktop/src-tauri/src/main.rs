#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{io, path::PathBuf, sync::Arc};

use desktop_performance::{DesktopPerformanceEventName, DesktopPerformanceRecorder};
use tauri::{Manager, Runtime};

mod desktop_performance;
#[cfg(test)]
mod desktop_performance_tests;
#[cfg(test)]
mod determinism;
mod diagnostics;
#[cfg(feature = "performance-evidence")]
mod evidence;
mod persistence;

fn main() {
    let performance = DesktopPerformanceRecorder::default();
    performance.record_once(DesktopPerformanceEventName::ProcessEntry);

    #[cfg(feature = "performance-evidence")]
    evidence::configure_webview_data_directory()
        .expect("failed to configure isolated evidence WebView2 data");

    let builder = tauri::Builder::default();
    #[cfg(feature = "performance-evidence")]
    let builder = builder.plugin(tauri_plugin_wdio_webdriver::init());

    let setup_performance = performance.clone();
    let app = builder
        .setup(move |app| {
            setup_performance.record_once(DesktopPerformanceEventName::TauriSetupStart);
            let data_dir = resolve_desktop_data_directory(app)?;
            let diagnostics = diagnostics::RuntimeDiagnostics::initialize(
                app.handle(),
                diagnostics_log_directory(&data_dir),
            );
            app.manage(diagnostics);
            diagnostics::log_tauri_setup_logging_ready();

            let database_path = data_dir.join("runtime-human.sqlite3");
            let persistence = match persistence::PersistenceHandle::start_with_performance(
                database_path,
                setup_performance.clone(),
            ) {
                Ok(persistence) => persistence,
                Err(error) => {
                    diagnostics::log_persistence_start_failed(error.diagnostic_code());
                    return Err(io::Error::other(error.to_string()).into());
                }
            };

            diagnostics::log_persistence_worker_ready();
            setup_performance.record_once(DesktopPerformanceEventName::PersistenceWorkerReady);
            app.manage::<persistence::ManagedPersistence>(Arc::new(persistence));
            app.manage(setup_performance.clone());
            setup_performance.record_once(DesktopPerformanceEventName::TauriSetupComplete);
            diagnostics::log_tauri_setup_complete();
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

fn resolve_desktop_data_directory<R: Runtime>(_app: &tauri::App<R>) -> Result<PathBuf, io::Error> {
    #[cfg(feature = "performance-evidence")]
    {
        let directory = evidence::required_app_data_directory_override()?;
        std::fs::create_dir_all(&directory)?;
        return Ok(directory);
    }

    #[cfg(not(feature = "performance-evidence"))]
    {
        _app.path()
            .app_data_dir()
            .map_err(|error| io::Error::other(error.to_string()))
    }
}

fn diagnostics_log_directory(_data_dir: &std::path::Path) -> Option<PathBuf> {
    #[cfg(feature = "performance-evidence")]
    {
        return Some(_data_dir.join("logs"));
    }

    #[cfg(not(feature = "performance-evidence"))]
    {
        None
    }
}
