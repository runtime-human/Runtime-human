use std::{
    path::Path,
    process::{Command, ExitStatus},
};

use tempfile::TempDir;

use super::{Database, RecoveryStatus};

const DATABASE_ENV: &str = "RUNTIME_HUMAN_SHUTDOWN_TEST_DATABASE";
const FAILPOINT_ENV: &str = "RUNTIME_HUMAN_PERSISTENCE_FAILPOINT";
const FAILPOINT: &str = "after_shutdown_checkpoint_before_clean_marker";
const CRASH_EXIT_CODE: i32 = 86;

#[test]
fn interrupted_shutdown_remains_unclean_until_checkpoint_finishes() {
    if std::env::var_os(DATABASE_ENV).is_some() {
        return;
    }

    let temp = TempDir::new().expect("temporary directory");
    let database_path = temp.path().join("runtime-human.sqlite3");
    Database::open_or_create(&database_path)
        .expect("create database")
        .close()
        .expect("close initial database");

    let status = run_shutdown_crash_child(&database_path);
    assert_eq!(status.code(), Some(CRASH_EXIT_CODE));

    let reopened = Database::open_or_create(&database_path).expect("reopen interrupted shutdown");
    assert_eq!(reopened.recovery_status(), RecoveryStatus::UncleanButValid);
    reopened.close().expect("close recovered database");
}

#[test]
fn child_exits_after_shutdown_checkpoint_before_clean_marker() {
    let Some(database_path) = std::env::var_os(DATABASE_ENV) else {
        return;
    };

    let database = Database::open_or_create(Path::new(&database_path)).expect("child open");
    database.close().expect("failpoint must terminate before close returns");
    panic!("shutdown failpoint did not terminate the child process");
}

fn run_shutdown_crash_child(database_path: &Path) -> ExitStatus {
    Command::new(std::env::current_exe().expect("current test executable"))
        .arg("--exact")
        .arg(
            "persistence::shutdown_tests::child_exits_after_shutdown_checkpoint_before_clean_marker",
        )
        .arg("--nocapture")
        .env(DATABASE_ENV, database_path)
        .env(FAILPOINT_ENV, FAILPOINT)
        .status()
        .expect("run shutdown crash child")
}
