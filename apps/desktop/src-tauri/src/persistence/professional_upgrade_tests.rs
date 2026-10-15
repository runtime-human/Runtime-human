use serde_json::{Value, json};
use tempfile::TempDir;

use super::{
    Database, LoadSaveQueryV1, MutationOutcome, PersistenceError,
    UpgradeProfessionalSaveCommandV1, hash::sha256_hex,
    january_flow_fixture::load_january_persistence_flow_fixture,
    professional_upgrade_contract::UpgradeProfessionalSaveCommandV1 as UpgradeCommand,
};

const TARGET: &str = "58a22b3f61be510c7e0dd0c81ebbefeaa5f97f46863dcc0b10485baa6bcaeded";

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
