use std::{
    sync::{Arc, Barrier, mpsc},
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

    let query_response = handle
        .enqueue_test_recovery_status()
        .expect("enqueue recovery query before shutdown");
    let shutdown_handle = handle.clone();
    let shutdown = thread::spawn(move || shutdown_handle.shutdown());

    barrier_release_sender.send(()).expect("release worker barrier");
    barrier_response
        .recv_timeout(Duration::from_secs(5))
        .expect("receive barrier response")
        .expect("barrier completed");

    let query_result = query_response
        .recv_timeout(Duration::from_secs(5))
        .expect("receive queued query response");
    assert!(query_result.is_ok(), "accepted query was lost during shutdown: {query_result:?}");
    shutdown
        .join()
        .expect("join shutdown caller")
        .expect("shutdown worker");

    assert!(matches!(handle.recovery_status(), Err(PersistenceError::Unavailable)));
    handle.shutdown().expect("idempotent shutdown");
}

#[test]
fn shutdown_marker_waits_behind_a_full_accepted_queue() {
    const QUEUE_CAPACITY: usize = 64;

    let temp = TempDir::new().expect("temporary directory");
    let database_path = temp.path().join("runtime-human.sqlite3");
    let handle = PersistenceHandle::start(database_path).expect("start persistence worker");

    let (worker_entered_sender, worker_entered_receiver) = mpsc::sync_channel(1);
    let (worker_release_sender, worker_release_receiver) = mpsc::sync_channel(1);
    let worker_response = handle
        .enqueue_test_barrier(worker_entered_sender, worker_release_receiver)
        .expect("enqueue worker barrier");
    worker_entered_receiver
        .recv_timeout(Duration::from_secs(5))
        .expect("worker entered barrier");

    let queued_responses = (0..QUEUE_CAPACITY)
        .map(|_| {
            handle
                .enqueue_test_recovery_status()
                .expect("fill every bounded queue slot")
        })
        .collect::<Vec<_>>();
    let shutdown_handle = handle.clone();
    let (shutdown_result_sender, shutdown_result_receiver) = mpsc::sync_channel(1);
    let shutdown = thread::spawn(move || {
        let result = shutdown_handle.shutdown();
        shutdown_result_sender
            .send(result)
            .expect("publish shutdown result");
    });

    assert!(
        shutdown_result_receiver
            .recv_timeout(Duration::from_millis(100))
            .is_err(),
        "shutdown completed while the worker and every queue slot were still blocked",
    );

    worker_release_sender.send(()).expect("release worker barrier");
    worker_response
        .recv_timeout(Duration::from_secs(5))
        .expect("receive worker barrier response")
        .expect("worker barrier completed");

    for response in queued_responses {
        response
            .recv_timeout(Duration::from_secs(5))
            .expect("receive accepted full-queue command")
            .expect("accepted full-queue command completed before close");
    }
    shutdown_result_receiver
        .recv_timeout(Duration::from_secs(5))
        .expect("receive shutdown result after queue drain")
        .expect("shutdown after full queue drain");
    shutdown.join().expect("join full-queue shutdown caller");

    assert!(matches!(handle.recovery_status(), Err(PersistenceError::Unavailable)));
}

#[test]
fn concurrent_shutdown_callers_share_one_ordered_worker_close() {
    const CALLERS: usize = 8;

    let temp = TempDir::new().expect("temporary directory");
    let database_path = temp.path().join("runtime-human.sqlite3");
    let handle = PersistenceHandle::start(database_path).expect("start persistence worker");

    let (worker_entered_sender, worker_entered_receiver) = mpsc::sync_channel(1);
    let (worker_release_sender, worker_release_receiver) = mpsc::sync_channel(1);
    let worker_response = handle
        .enqueue_test_barrier(worker_entered_sender, worker_release_receiver)
        .expect("enqueue worker barrier");
    worker_entered_receiver
        .recv_timeout(Duration::from_secs(5))
        .expect("worker entered barrier");

    let caller_barrier = Arc::new(Barrier::new(CALLERS + 1));
    let shutdown_callers = (0..CALLERS)
        .map(|_| {
            let caller = handle.clone();
            let caller_barrier = Arc::clone(&caller_barrier);
            thread::spawn(move || {
                caller_barrier.wait();
                caller.shutdown()
            })
        })
        .collect::<Vec<_>>();

    caller_barrier.wait();
    worker_release_sender.send(()).expect("release worker barrier");
    worker_response
        .recv_timeout(Duration::from_secs(5))
        .expect("receive worker barrier response")
        .expect("worker barrier completed");

    for caller in shutdown_callers {
        caller
            .join()
            .expect("join shutdown caller")
            .expect("concurrent shutdown is idempotent");
    }

    assert!(matches!(handle.recovery_status(), Err(PersistenceError::Unavailable)));
    handle.shutdown().expect("shutdown remains idempotent after all callers complete");
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
