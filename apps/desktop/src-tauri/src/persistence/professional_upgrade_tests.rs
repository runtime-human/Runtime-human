use std::{path::Path, process::Command, sync::Arc};

use serde_json::{Value, json};
use tempfile::TempDir;

use super::{
    Database, LoadSaveQueryV1, MutationOutcome, PersistenceError, PersistenceHandle,
    RecoveryStatusV1Value, UpgradeProfessionalSaveCommandV1, hash::sha256_hex,
    january_flow_fixture::load_january_persistence_flow_fixture,
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
fn receipt_provenance_tamper_matrix_fails_closed() {
    for case in [
        "missing-receipt-sequence",
        "changed-snapshot-hash",
        "wrong-operation",
        "unauthorized-revision-drift",
    ] {
        let (_temp, mut database) = committed_database();
        let request = command(&database);
        let accepted = database
            .upgrade_professional_save(request.clone())
            .expect("commit a valid professional upgrade");
        assert!(matches!(accepted, MutationOutcome::Accepted(_)));
        database
            .verify_application_integrity()
            .expect("unchanged upgraded save is valid");

        match case {
            "missing-receipt-sequence" | "changed-snapshot-hash" => {
                let original_json: String = database
                    .connection()
                    .expect("read receipt")
                    .query_row(
                        "SELECT result_json FROM request_receipts WHERE request_id = ?1",
                        [&request.request_id],
                        |row| row.get(0),
                    )
                    .expect("load original receipt");
                let mut receipt: Value =
                    serde_json::from_str(&original_json).expect("decode valid receipt");
                let save = receipt["save"]
                    .as_object_mut()
                    .expect("accepted receipt must embed save");
                if case == "missing-receipt-sequence" {
                    assert!(save.remove("updatedSequence").is_some());
                } else {
                    save.get_mut("snapshot")
                        .and_then(Value::as_object_mut)
                        .expect("embedded snapshot")
                        .insert("sha256".to_owned(), Value::String("0".repeat(64)));
                }
                // Recalculate the receipt hash to isolate the provenance check.
                // Otherwise verify_receipts would catch only a trivial hash mismatch.
                let altered_json =
                    serde_json::to_string(&receipt).expect("serialize altered receipt");
                let altered_sha = sha256_hex(altered_json.as_bytes());
                let changed = database
                    .connection_mut()
                    .expect("write tamper fixture")
                    .execute(
                        "UPDATE request_receipts
                         SET result_json = ?1, result_sha256 = ?2
                         WHERE request_id = ?3",
                        rusqlite::params![altered_json, altered_sha, request.request_id],
                    )
                    .expect("update receipt fixture");
                assert_eq!(changed, 1);
            }
            "wrong-operation" => {
                let changed = database
                    .connection_mut()
                    .expect("write tamper fixture")
                    .execute(
                        "UPDATE request_receipts SET operation = 'create-save-v1'
                         WHERE request_id = ?1",
                        [&request.request_id],
                    )
                    .expect("alter receipt operation");
                assert_eq!(changed, 1);
            }
            "unauthorized-revision-drift" => {
                let changed = database
                    .connection_mut()
                    .expect("write tamper fixture")
                    .execute(
                        "UPDATE save_games SET revision = revision + 1 WHERE save_id = ?1",
                        [&request.save_id],
                    )
                    .expect("alter save revision");
                assert_eq!(changed, 1);
            }
            _ => unreachable!("the tamper matrix is closed"),
        }

        assert!(
            matches!(
                database.verify_application_integrity(),
                Err(PersistenceError::CorruptedStoredPayload)
            ),
            "recovery accepted corrupted professional provenance: {case}"
        );
        database.close().expect("close tampered test database");
    }
}

fn upgraded_database() -> (TempDir, Database, UpgradeCommand) {
    let (temp, mut database) = committed_database();
    let request = command(&database);
    let accepted = database
        .upgrade_professional_save(request.clone())
        .expect("commit a valid professional upgrade");
    assert!(matches!(accepted, MutationOutcome::Accepted(_)));
    database
        .verify_application_integrity()
        .expect("unchanged upgraded save is valid");
    (temp, database, request)
}

fn assert_corrupted(database: &Database, case: &str) {
    assert!(
        matches!(
            database.verify_application_integrity(),
            Err(PersistenceError::CorruptedStoredPayload)
        ),
        "recovery accepted corrupted professional state: {case}"
    );
}

/// Rewrites the stored receipt JSON and recomputes its hash so only the
/// provenance predicate under test (not the receipt hash) can reject it.
fn rewrite_receipt(database: &mut Database, request_id: &str, edit: impl FnOnce(&mut Value)) {
    let original: String = database
        .connection()
        .expect("read receipt")
        .query_row(
            "SELECT result_json FROM request_receipts WHERE request_id = ?1",
            [request_id],
            |row| row.get(0),
        )
        .expect("load receipt");
    let mut receipt: Value = serde_json::from_str(&original).expect("decode receipt");
    edit(&mut receipt);
    let altered = serde_json::to_string(&receipt).expect("serialize receipt");
    let changed = database
        .connection_mut()
        .expect("write receipt fixture")
        .execute(
            "UPDATE request_receipts SET result_json = ?1, result_sha256 = ?2
             WHERE request_id = ?3",
            rusqlite::params![altered, sha256_hex(altered.as_bytes()), request_id],
        )
        .expect("update receipt");
    assert_eq!(changed, 1);
}

/// Forges a *hash-consistent* v2 snapshot: the save row, its snapshot hash and
/// the matching receipt copy are all rewritten together, so every SQL provenance
/// predicate still holds and only the Rust structural validation can reject it.
fn forge_hash_consistent_snapshot(
    database: &mut Database,
    request: &UpgradeCommand,
    edit: impl FnOnce(&mut Value),
) {
    let stored: String = database
        .connection()
        .expect("read save")
        .query_row(
            "SELECT snapshot_json FROM save_games WHERE save_id = ?1",
            [&request.save_id],
            |row| row.get(0),
        )
        .expect("load upgraded snapshot");
    let mut snapshot: Value = serde_json::from_str(&stored).expect("decode snapshot");
    edit(&mut snapshot);
    let forged = serde_json::to_string(&snapshot).expect("serialize forged snapshot");
    let forged_sha = sha256_hex(forged.as_bytes());
    let changed = database
        .connection_mut()
        .expect("write save fixture")
        .execute(
            "UPDATE save_games SET snapshot_json = ?1, snapshot_sha256 = ?2 WHERE save_id = ?3",
            rusqlite::params![forged, forged_sha, request.save_id],
        )
        .expect("forge save snapshot");
    assert_eq!(changed, 1);
    rewrite_receipt(database, &request.request_id, |receipt| {
        let embedded = receipt["save"]["snapshot"]
            .as_object_mut()
            .expect("embedded snapshot");
        embedded.insert("json".to_owned(), Value::String(forged));
        embedded.insert("sha256".to_owned(), Value::String(forged_sha));
    });
}

#[test]
fn plain_v1_save_with_revision_drift_is_still_rejected() {
    let (_temp, mut database) = committed_database();
    database
        .verify_application_integrity()
        .expect("untouched legacy v1 save is valid");
    let changed = database
        .connection_mut()
        .expect("writable database")
        .execute("UPDATE save_games SET revision = revision + 1", [])
        .expect("drift legacy revision");
    assert_eq!(changed, 1);
    // No upgrade happened: no v2 fingerprint, no receipt. The +1 allowance is
    // only for the receipt-proven upgrade, never for general revision drift.
    assert_corrupted(&database, "plain v1 revision +1");
    database.close().expect("close tampered test database");
}

#[test]
fn every_single_receipt_predicate_mismatch_fails_closed() {
    enum Edit {
        Receipt(fn(&mut Value)),
        Sql(&'static str),
    }
    let cases = [
        (
            "receipt result schemaVersion",
            Edit::Receipt(|r| r["schemaVersion"] = json!("upgrade-other-v1")),
        ),
        (
            "receipt save.saveId",
            Edit::Receipt(|r| r["save"]["saveId"] = json!("another-save")),
        ),
        (
            "receipt save.lastCommittedRunId",
            Edit::Receipt(|r| {
                r["save"]["lastCommittedRunId"] = json!("another-run");
            }),
        ),
        (
            "receipt save.revision",
            Edit::Receipt(|r| {
                let next = r["save"]["revision"].as_u64().expect("revision") + 1;
                r["save"]["revision"] = json!(next);
            }),
        ),
        (
            "receipt save.createdSequence",
            Edit::Receipt(|r| {
                let next = r["save"]["createdSequence"].as_u64().expect("created") + 1;
                r["save"]["createdSequence"] = json!(next);
            }),
        ),
        (
            "receipt save.updatedSequence",
            Edit::Receipt(|r| {
                let next = r["save"]["updatedSequence"].as_u64().expect("updated") + 1;
                r["save"]["updatedSequence"] = json!(next);
            }),
        ),
        (
            "receipt save.saveSchemaFingerprint",
            Edit::Receipt(|r| {
                r["save"]["saveSchemaFingerprint"] = json!("0".repeat(64));
            }),
        ),
        (
            "receipt embedded snapshot json text",
            Edit::Receipt(|r| {
                r["save"]["snapshot"]["json"] = json!("{}");
            }),
        ),
        (
            "receipt row belongs to another save",
            Edit::Sql("UPDATE request_receipts SET save_id = 'another-save' WHERE request_id = ?1"),
        ),
        (
            "receipt row belongs to another run",
            Edit::Sql("UPDATE request_receipts SET run_id = 'another-run' WHERE request_id = ?1"),
        ),
        (
            "receipt row has no save id",
            Edit::Sql("UPDATE request_receipts SET save_id = NULL WHERE request_id = ?1"),
        ),
    ];
    for (case, edit) in cases {
        let (_temp, mut database, request) = upgraded_database();
        match edit {
            Edit::Receipt(apply) => {
                rewrite_receipt(&mut database, &request.request_id, apply);
            }
            Edit::Sql(statement) => {
                let changed = database
                    .connection_mut()
                    .expect("write receipt fixture")
                    .execute(statement, [&request.request_id])
                    .expect("alter receipt row");
                assert_eq!(changed, 1);
            }
        }
        assert_corrupted(&database, case);
        database.close().expect("close tampered test database");
    }
}

#[test]
fn upgraded_save_at_equal_revision_requires_receipt_provenance() {
    // F2: an equal revision must not bypass the v2 provenance requirement.
    for case in [
        "equal-revision-with-receipt",
        "equal-revision-without-receipt",
    ] {
        let (_temp, mut database, request) = upgraded_database();
        let connection = database.connection_mut().expect("write fixture");
        connection
            .execute(
                "UPDATE month_runs SET committed_save_revision = committed_save_revision + 1",
                [],
            )
            .expect("equalize committed revision with the upgraded save");
        if case == "equal-revision-without-receipt" {
            let deleted = connection
                .execute(
                    "DELETE FROM request_receipts WHERE request_id = ?1",
                    [&request.request_id],
                )
                .expect("delete receipt");
            assert_eq!(deleted, 1);
        }
        assert_corrupted(&database, case);
        database.close().expect("close tampered test database");
    }
}

#[test]
fn forged_hash_consistent_professional_block_fails_closed() {
    // Positive control: the forging helper itself preserves a valid save, so a
    // rejection below is attributable to the edit, not to the rewrite mechanics.
    let (_temp, mut database, request) = upgraded_database();
    forge_hash_consistent_snapshot(&mut database, &request, |_| {});
    database
        .verify_application_integrity()
        .expect("no-op forge must remain valid");
    database.close().expect("close control database");

    type Forge = fn(&mut Value);
    let cases: [(&str, Forge); 10] = [
        ("professional block removed", |s| {
            s.as_object_mut().expect("object").remove("professional");
        }),
        ("professional is null", |s| s["professional"] = Value::Null),
        ("partial professional (technology key missing)", |s| {
            s["professional"]
                .as_object_mut()
                .expect("professional")
                .remove("technology");
        }),
        ("granted skill experience", |s| {
            s["professional"]["skills"] = json!([{"id": "skill-algorithms", "level": 3}]);
        }),
        ("recent contexts not empty", |s| {
            s["professional"]["recentContexts"] = json!(["ctx"]);
        }),
        ("last episode present", |s| {
            s["professional"]["lastEpisode"] = json!({"id": "episode"});
        }),
        ("aptitude out of range", |s| {
            s["professional"]["aptitudes"]["reasoning"] = json!(1001);
        }),
        ("unknown extra professional field", |s| {
            s["professional"]["grade"] = json!("senior");
        }),
        ("legacy import marked assessed", |s| {
            s["legacyImport"]["assessmentStatus"] = json!("assessed");
        }),
        ("source fingerprint not derived from january history", |s| {
            s["legacyImport"]["sourceFingerprint"] = json!("1".repeat(64));
        }),
    ];
    for (case, forge) in cases {
        let (_temp, mut database, request) = upgraded_database();
        forge_hash_consistent_snapshot(&mut database, &request, forge);
        assert_corrupted(&database, case);
        database.close().expect("close tampered test database");
    }
}

#[test]
fn forged_january_history_not_matching_the_committed_run_fails_closed() {
    // A consistent rewrite of the January checkpoint hash inside the v2 snapshot
    // (with a recomputed source fingerprint) must still disagree with month_runs.
    let (_temp, mut database, request) = upgraded_database();
    forge_hash_consistent_snapshot(&mut database, &request, |s| {
        let forged_hash = "2".repeat(64);
        s["january"]["completedMonth"]["completedCheckpointHash"] = json!(forged_hash);
        let month = &s["january"]["completedMonth"];
        let source = json!({
            "domain": "runtime-human:fingerprint:v1",
            "namespace": "january-professional-committed-source-v1",
            "value": {
                "saveId": s["legacyImport"]["originalSaveId"],
                "runId": month["runId"],
                "checkpointHash": month["completedCheckpointHash"],
                "result": month["terminalResult"],
            }
        });
        let sha = sha256_hex(serde_json::to_string(&source).expect("source").as_bytes());
        s["legacyImport"]["sourceFingerprint"] = json!(sha);
    });
    assert_corrupted(&database, "january history disagrees with MonthRun row");
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
    // Read-only recovery permits diagnostics but rejects every mutation.
    let query = worker
        .load_save(LoadSaveQueryV1 {
            schema_version: "load-save-query-v1".to_owned(),
            save_id: request.save_id.clone(),
        })
        .expect("read-only recovery should still permit loading the save");
    assert!(query.is_some());
    let operation = worker.begin_operation();
    let mutation = worker.upgrade_professional_save_with_operation(request, operation);
    assert!(matches!(mutation, Err(PersistenceError::RecoveryRequired)));
    worker.shutdown().expect("close recovery worker");
}

#[test]
fn registered_professional_upgrade_ipc_is_dormant_before_backup_and_v2_runtime() {
    let (temp, database) = committed_database();
    let request = command(&database);
    let before = database
        .load_save(LoadSaveQueryV1 {
            schema_version: "load-save-query-v1".to_owned(),
            save_id: request.save_id.clone(),
        })
        .expect("load completed legacy save")
        .expect("legacy save exists");
    database.close().expect("close before Tauri worker startup");

    let worker = Arc::new(
        PersistenceHandle::start(temp.path().join("save.sqlite3"))
            .expect("start production persistence worker"),
    );
    let operation = worker.begin_operation();
    let denied = super::commands::dispatch_professional_upgrade_v1(
        Arc::clone(&worker),
        operation,
        request.clone(),
    );
    assert!(
        matches!(denied, Err(PersistenceError::InvalidCommand(_))),
        "registered Tauri upgrade must fail closed until activation gate is implemented"
    );
    let after = worker
        .load_save(LoadSaveQueryV1 {
            schema_version: "load-save-query-v1".to_owned(),
            save_id: request.save_id,
        })
        .expect("load save after rejected migration")
        .expect("save must still exist");
    assert_eq!(after, before, "rejected IPC must never update the save");
    worker.shutdown().expect("shutdown worker");
}
