#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(test)]
mod determinism;
mod persistence;

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("failed to run Runtime Human desktop shell");
}
