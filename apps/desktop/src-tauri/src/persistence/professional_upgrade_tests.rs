use std::{path::Path, process::Command};

use serde_json::{Value, json};
use tempfile::TempDir;

use super::{
    Database, LoadSaveQueryV1, MutationOutcome, PersistenceError, PersistenceHandle,
    RecoveryStatusV1Value, UpgradeProfessionalSaveCommandV1,
    hash::sha256_hex, january_flow_fixture::load_january_persistence_flow_fixture,
    professional_upgrade_contract::UpgradeProfessionalSaveCommandV1 as UpgradeCommand,
};

const TARGET: &str = "ed6792b4a434c3be7c70adeb6fb8cbf429bfa6d5f9d1444a782bc5a7472759f0";

fn committed_database() -> (TempDir, Database) {
    let temp = TempDir::new().expect("tempdir");
    let mut database =
        Database::open_or_create(&temp.path().join("save.sqlite3")).expect("database");
    let fixture = load_january_persistence_flow_fixture();
    database
        .create_save(fixture.create_save)
        .expect("create save");
    database
        .begin_month_run(fixture.begin)
        .expect("begin month");
    for boundary in fixture.boundaries {
        database
            .store_month_run_boundary(boundary)
            .expect("store boundary");
    }
    database
        .commit_month_run(fixture.commit)
        .expect("commit January");
    (temp, database)
}

fn command(database: &Database) -> UpgradeCommand {
    let fixture = load_january_persistence_flow_fixture();
    let save = database
        .load_save(LoadSaveQueryV1 {
            schema_version: "load-save-query-v1".to_owned(),
            save_id: fixture.create_save.save_id,
        })
        .expect("load save")
        .expect("committed save");
    let january: Value = serde_json::from_str(&save.snapshot.json).expect("january");
    let month = january["completedMonth"].as_object().expect("completed");
    let source = json!({
        "domain": "runtime-human:fingerprint:v1",
        "namespace": "january-professional-committed-source-v1",
        "value": {
            "saveId": save.save_id,
            "runId": month["runId"],
            "checkpointHash": month["completedCheckpointHash"],
            "result": month["terminalResult"],
        }
    });
    let source_sha = sha256_hex(serde_json::to_string(&source).unwrap().as_bytes());
    let candidate = json!({
        "schemaVersion": "professional-save-candidate-v2",
        "january": january,
        "professional": {
            "schemaVersion": "professional-lab-state-v1",
            "aptitudes": {"reasoning": 500, "learning": 500},
            "skills": [],
            "technology": null,
            "recentContexts": [],
            "lastEpisode": null,
        },
        "legacyImport": {
            "schemaVersion": "professional-legacy-january-receipt-v1",
            "originalSaveId": save.save_id,
            "originalSaveRevision": save.revision,
            "originalSnapshotSha256": save.snapshot.sha256,
            "originalRunId": save.last_committed_run_id,
            "sourceFingerprint": source_sha,
            "assessmentStatus": "unassessed",
        }
    });
    let json = serde_json::to_string(&candidate).expect("serialize candidate");
    UpgradeCommand {
        schema_version: "upgrade-professional-save-command-v1".to_owned(),
        request_id: "upgrade-save-request-v1".to_owned(),
        save_id: save.save_id,
        expected_save_revision: save.revision,
        expected_updated_sequence: save.updated_sequence,
        expected_snapshot_sha256: save.snapshot.sha256,
        expected_source_save_schema_fingerprint: save.save_schema_fingerprint,
        target_save_schema_fingerprint: TARGET.to_owned(),
        snapshot: super::CanonicalPayloadV1 {
            schema_version: "canonical-payload-v1".to_owned(),
            sha256: sha256_hex(json.as_bytes()),
            json,
        },
    }
}

#[test]
fn atomic_upgrade_preserves_history_and_replays_receipt_after_reopen() {
    let (temp, mut database) = committed_database();
    let request = command(&database);
    let initial = database
        .load_save(LoadSaveQueryV1 {
            schema_version: "load-save-query-v1".to_owned(),
            save_id: request.save_id.clone(),
        })
        .unwrap()
        .unwrap();

    let accepted = database
        .upgrade_professional_save(request.clone())
        .expect("upgrade");
    let upgraded = match accepted {
        MutationOutcome::Accepted(value) => value.save,
        MutationOutcome::Duplicate(_) => panic!("first upgrade cannot be a replay"),
    };
    assert_eq!(upgraded.revision, initial.revision + 1);
    assert_eq!(upgraded.save_schema_fingerprint, TARGET);
    assert_eq!(
        upgraded.last_committed_run_id,
        initial.last_committed_run_id
    );
    assert_eq!(upgraded.created_sequence, initial.created_sequence);
    assert_ne!(upgraded.snapshot.sha256, initial.snapshot.sha256);
    let json: Value = serde_json::from_str(&upgraded.snapshot.json).unwrap();
    let old: Value = serde_json::from_str(&initial.snapshot.json).unwrap();
    assert_eq!(json["january"], old);
    assert_eq!(json["legacyImport"]["assessmentStatus"], "unassessed");
    assert!(
        json["professional"]["skills"]
            .as_array()
            .unwrap()
            .is_empty()
    );

    database.close().expect("close");
    let mut reopened = Database::open_or_create(&temp.path().join("save.sqlite3")).expect("reopen");
    let replay = reopened
        .upgrade_professional_save(request.clone())
        .expect("duplicate");
    assert!(matches!(replay, MutationOutcome::Duplicate(value) if value.save == upgraded));
    let mut different = request;
    different.request_id = "upgrade-save-request-other".to_owned();
    assert!(matches!(
        reopened.upgrade_professional_save(different),
        Err(PersistenceError::SaveRevisionConflict)
    ));
    reopened.close().expect("close");
}

#[test]
fn active_month_and_invalid_history_cannot_be_upgraded() {
    let temp = TempDir::new().unwrap();
    let mut database = Database::open_or_create(&temp.path().join("active.sqlite3")).unwrap();
    let fixture = load_january_persistence_flow_fixture();
    database.create_save(fixture.create_save).unwrap();
    let request = UpgradeProfessionalSaveCommandV1 {
        schema_version: "upgrade-professional-save-command-v1".to_owned(),
        request_id: "upgrade-active".to_owned(),
        save_id: fixture.begin.save_id.clone(),
        expected_save_revision: 0,
        expected_updated_sequence: 1,
        expected_snapshot_sha256: fixture.begin.checkpoint.sha256.clone(),
        expected_source_save_schema_fingerprint: fixture.begin.compatibility.sha256.clone(),
        target_save_schema_fingerprint: TARGET.to_owned(),
        snapshot: fixture.begin.checkpoint.clone(),
    };
    database.begin_month_run(fixture.begin).unwrap();
    // Make CAS reflect the current source before checking active-run guard.
    let save = database
        .load_save(LoadSaveQueryV1 {
            schema_version: "load-save-query-v1".to_owned(),
            save_id: request.save_id.clone(),
        })
        .unwrap()
        .unwrap();
    let request = UpgradeProfessionalSaveCommandV1 {
        expected_snapshot_sha256: save.snapshot.sha256,
        expected_source_save_schema_fingerprint: save.save_schema_fingerprint,
        expected_updated_sequence: save.updated_sequence,
        ..request
    };
    assert!(matches!(
        database.upgrade_professional_save(request),
        Err(PersistenceError::ActiveRunExists)
    ));
}

#[test]
fn rejecting_forged_progress_does_not_modify_original_committed_save() {
    let (_temp, mut database) = committed_database();
    let valid = command(&database);
    let before = database
        .load_save(LoadSaveQueryV1 {
            schema_version: "load-save-query-v1".to_owned(),
            save_id: valid.save_id.clone(),
        })
        .unwrap()
        .unwrap();
    let mut invalid = valid;
    let mut value: Value = serde_json::from_str(&invalid.snapshot.json).unwrap();
    value["professional"]["skills"] = json!([{"skillId":"programming", "mastery":10000}]);
    invalid.snapshot.json = serde_json::to_string(&value).unwrap();
    invalid.snapshot.sha256 = sha256_hex(invalid.snapshot.json.as_bytes());
    assert!(matches!(
        database.upgrade_professional_save(invalid),
        Err(PersistenceError::InvalidCommand(_))
    ));
    let after = database
        .load_save(LoadSaveQueryV1 {
            schema_version: "load-save-query-v1".to_owned(),
            save_id: before.save_id.clone(),
        })
        .unwrap()
        .unwrap();
    assert_eq!(before, after);
}

const CRASH_TEST_DATABASE_ENV: &str = "RUNTIME_HUMAN_PROFESSIONAL_UPGRADE_CRASH_DATABASE";
const CRASH_EXIT_CODE: i32 = 86;

/// Exercise real process termination, not a Rust panic that would drop the
/// transaction and mask a partial durable commit.
#[test]
fn professional_upgrade_crash_boundaries_are_atomic_and_replayable() {
    if std::env::var_os(CRASH_TEST_DATABASE_ENV).is_some() {
        return;
    }

    for (failpoint, committed) in [
        ("professional_upgrade_before_save_cas", false),
        ("professional_upgrade_after_save_cas", false),
        ("professional_upgrade_after_receipt_insert", false),
        ("professional_upgrade_after_commit_before_reply", true),
    ] {
        let (temp, database) = committed_database();
        let request = command(&database);
        let initial = database
            .load_save(LoadSaveQueryV1 {
                schema_version: "load-save-query-v1".to_owned(),
                save_id: request.save_id.clone(),
            })
            .expect("load original committed save")
            .expect("committed save exists");
        database.close().expect("close original database");

        let database_path = temp.path().join("save.sqlite3");
        let status = Command::new(std::env::current_exe().expect("test executable"))
            .arg("--exact")
            .arg("persistence::professional_upgrade_tests::child_professional_upgrade_crash")
            .arg("--nocapture")
            .env(CRASH_TEST_DATABASE_ENV, &database_path)
            .env("RUNTIME_HUMAN_PERSISTENCE_FAILPOINT", failpoint)
            .status()
            .expect("spawn independent crash-test process");
        assert_eq!(
            status.code(),
            Some(CRASH_EXIT_CODE),
            "process did not terminate at {failpoint}"
        );

        let mut reopened = Database::open_or_create(&database_path)
            .expect("reopen database after forced process exit");
        reopened
            .verify_application_integrity()
            .expect("application-level integrity after crash");
        let integrity: String = reopened
            .connection()
            .expect("read recovered database")
            .query_row("PRAGMA quick_check", [], |row| row.get(0))
            .expect("SQLite quick check");
        assert_eq!(integrity, "ok", "SQLite corruption after {failpoint}");

        let recovered = reopened
            .load_save(LoadSaveQueryV1 {
                schema_version: "load-save-query-v1".to_owned(),
                save_id: request.save_id.clone(),
            })
            .expect("load recovered save")
            .expect("recovered save exists");
        let receipt_count: i64 = reopened
            .connection()
            .expect("read recovered receipts")
            .query_row(
                "SELECT COUNT(*) FROM request_receipts WHERE request_id = ?1",
                [&request.request_id],
                |row| row.get(0),
            )
            .expect("count persisted upgrade receipts");

        if committed {
            assert_eq!(recovered.revision, initial.revision + 1);
            assert_eq!(recovered.save_schema_fingerprint, TARGET);
            assert_eq!(receipt_count, 1, "committed upgrade lost its receipt");
            let retry = reopened
                .upgrade_professional_save(request.clone())
                .expect("replay upgrade after lost response");
            assert!(
                matches!(retry, MutationOutcome::Duplicate(value) if value.save == recovered),
                "committed upgrade was not an exactly-once replay"
            );
        } else {
            assert_eq!(recovered, initial, "partial save update at {failpoint}");
            assert_eq!(receipt_count, 0, "orphan receipt at {failpoint}");
            let retry = reopened
                .upgrade_professional_save(request.clone())
                .expect("retry upgrade after rolled-back crash");
            assert!(
                matches!(retry, MutationOutcome::Accepted(_)),
                "rolled-back upgrade should be accepted once"
            );
        }

        let final_save = reopened
            .load_save(LoadSaveQueryV1 {
                schema_version: "load-save-query-v1".to_owned(),
                save_id: request.save_id.clone(),
            })
            .expect("reload final save")
            .expect("final save exists");
        assert_eq!(final_save.revision, initial.revision + 1);
        assert_eq!(final_save.save_schema_fingerprint, TARGET);
        let replay = reopened
            .upgrade_professional_save(request)
            .expect("replay final upgrade");
        assert!(
            matches!(replay, MutationOutcome::Duplicate(value) if value.save == final_save),
            "replay must not increment the save revision"
        );
        reopened.close().expect("close recovered database");
    }
}

#[test]
fn child_professional_upgrade_crash() {
    let Some(database_path) = std::env::var_os(CRASH_TEST_DATABASE_ENV) else {
        return;
    };
    let mut database = Database::open_or_create(Path::new(&database_path))
        .expect("open committed save in crash child");
    let request = command(&database);
    let _unexpected_return = database.upgrade_professional_save(request);
    panic!("professional upgrade failpoint did not terminate the child process");
}

#[test]
fn professional_upgrade_revision_gap_requires_a_matching_durable_receipt() {
    let (_temp, mut database) = committed_database();
    let request = command(&database);
    let upgraded = database
        .upgrade_professional_save(request.clone())
        .expect("apply professional save upgrade");
    assert!(matches!(upgraded, MutationOutcome::Accepted(_)));

    // A real January commit stays at its historical revision. The receipt
    // provides the only authorized proof for the subsequent schema upgrade.
    database
        .verify_application_integrity()
        .expect("valid revision gap with upgrade receipt");
    let deleted = database
        .connection_mut()
        .expect("writable database")
        .execute(
            "DELETE FROM request_receipts WHERE request_id = ?1",
            [&request.request_id],
        )
        .expect("remove upgrade provenance");
    assert_eq!(deleted, 1);
    assert!(matches!(
        database.verify_application_integrity(),
        Err(PersistenceError::CorruptedStoredPayload)
    ));
    database.close().expect("close tampered test database");
}

#[test]
fn unclean_valid_professional_upgrade_stays_writable_through_real_worker_startup() {
    let (temp, mut database) = committed_database();
    let request = command(&database);
    let outcome = database
        .upgrade_professional_save(request.clone())
        .expect("commit professional upgrade");
    assert!(matches!(outcome, MutationOutcome::Accepted(_)));

    // Do not call close(): an interrupted process leaves an unclean marker.
    drop(database);
    let worker = PersistenceHandle::start(temp.path().join("save.sqlite3"))
        .expect("start SQLite worker after unclean upgraded save");
    let status = worker.recovery_status().expect("load recovery status");
    assert_eq!(status.status, RecoveryStatusV1Value::UncleanButValid);
    assert!(status.writable, "valid upgraded save must not be blocked");
    let saved = worker
        .load_save(LoadSaveQueryV1 {
            schema_version: "load-save-query-v1".to_owned(),
            save_id: request.save_id,
        })
        .expect("load upgraded save through worker")
        .expect("upgraded save exists");
    assert_eq!(saved.save_schema_fingerprint, TARGET);
    worker.shutdown().expect("close upgraded worker");
}

#[test]
fn unclean_upgrade_without_receipt_enters_recovery_read_only_worker_mode() {
    let (temp, mut database) = committed_database();
    let request = command(&database);
    let outcome = database
        .upgrade_professional_save(request.clone())
        .expect("commit professional upgrade");
    assert!(matches!(outcome, MutationOutcome::Accepted(_)));

    // Remove the provenance as a corruption fixture. Leave the database unclean,
    // which forces the production worker's startup integrity scan.
    database
        .connection_mut()
        .expect("open database connection")
        .execute(
            "DELETE FROM request_receipts WHERE request_id = ?1",
            [&request.request_id],
        )
        .expect("delete authoritative receipt");
    drop(database);

    let worker = PersistenceHandle::start(temp.path().join("save.sqlite3"))
        .expect("start worker in recovery mode");
    let status = worker.recovery_status().expect("load recovery status");
    assert_eq!(status.status, RecoveryStatusV1Value::Corrupted);
    assert!(!status.writable);
    let query = worker.load_save(LoadSaveQueryV1 {
        schema_version: "load-save-query-v1".to_owned(),
        save_id: request.save_id,
    });
    assert!(matches!(query, Err(PersistenceError::RecoveryRequired)));
    worker.shutdown().expect("close recovery worker");
}
