use std::{
    sync::mpsc,
    thread,
    time::Duration,
};

use tempfile::TempDir;

use super::{PersistenceError, PersistenceHandle};

#[test]
fn command_accepted_before_shutdown_marker_completes_before_close() {
    let temp = TempDir::new().expect("temporary directory");
    let database_path = temp.path().join("runtime-human.sqlite3");
    let handle = PersistenceHandle::start(database_path).expect("start persistence worker");

    let (barrier_entered_sender, barrier_entered_receiver) = mpsc::sync_channel(1);
    let (barrier_release_sender, barrier_release_receiver) = mpsc::sync_channel(1);
    let barrier_response = handle
        .enqueue_test_barrier(barrier_entered_sender, barrier_release_receiver)
        .expect("enqueue blocking barrier");
    barrier_entered_receiver
        .recv_timeout(Duration::from_secs(5))
        .expect("worker entered barrier");

    let query_handle = handle.clone();
    let query = thread::spawn(move || query_handle.recovery_status());

    thread::sleep(Duration::from_millis(20));
    let shutdown_handle = handle.clone();
    let shutdown = thread::spawn(move || shutdown_handle.shutdown());

    barrier_release_sender.send(()).expect("release worker barrier");
    barrier_response
        .recv_timeout(Duration::from_secs(5))
        .expect("receive barrier response")
        .expect("barrier completed");

    let query_result = query.join().expect("join queued query");
    assert!(query_result.is_ok(), "accepted query was lost during shutdown: {query_result:?}");
    shutdown
        .join()
        .expect("join shutdown caller")
        .expect("shutdown worker");

    assert!(matches!(handle.recovery_status(), Err(PersistenceError::Unavailable)));
    handle.shutdown().expect("idempotent shutdown");
}

#[test]
fn dropping_last_handle_performs_controlled_close() {
    let temp = TempDir::new().expect("temporary directory");
    let database_path = temp.path().join("runtime-human.sqlite3");

    let handle = PersistenceHandle::start(database_path.clone()).expect("start persistence worker");
    drop(handle);

    let reopened = PersistenceHandle::start(database_path).expect("reopen after implicit shutdown");
    let status = reopened.recovery_status().expect("load recovery status");
    assert_eq!(status.status, super::RecoveryStatusV1Value::Healthy);
    reopened.shutdown().expect("shutdown reopened worker");
}
