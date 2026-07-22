#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{io, sync::Arc};

use tauri::Manager;

#[cfg(test)]
mod determinism;
mod persistence;

fn main() {
    let app = tauri::Builder::default()
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .map_err(|error| io::Error::other(error.to_string()))?;
            let database_path = data_dir.join("runtime-human.sqlite3");
            let persistence = persistence::PersistenceHandle::start(database_path)
                .map_err(|error| io::Error::other(error.to_string()))?;
            app.manage::<persistence::ManagedPersistence>(Arc::new(persistence));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            persistence::persistence_create_save_v1,
            persistence::persistence_load_save_v1,
            persistence::persistence_begin_month_run_v1,
            persistence::persistence_load_month_run_v1,
            persistence::persistence_load_active_month_run_v1,
            persistence::persistence_store_month_run_boundary_v1,
            persistence::persistence_commit_month_run_v1,
            persistence::persistence_create_backup_v1,
            persistence::persistence_get_recovery_status_v1,
        ])
        .build(tauri::generate_context!())
        .expect("failed to build Runtime Human desktop shell");

    app.run(|app_handle, event| {
        if matches!(event, tauri::RunEvent::Exit) {
            let state = app_handle.state::<persistence::ManagedPersistence>();
            if let Err(error) = state.shutdown() {
                tracing::error!(error = %error, "failed to shut down persistence cleanly");
            }
        }
    });
}
