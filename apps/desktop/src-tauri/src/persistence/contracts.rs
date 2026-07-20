#[cfg(test)]
mod tests {
    use super::{PersistenceFixtureV1, ValidatePersistenceContract};

    const FIXTURE: &str = include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../../fixtures/persistence/month-run-persistence-v1.json"
    ));

    #[test]
    fn shared_fixture_deserializes_and_validates() {
        let fixture: PersistenceFixtureV1 =
            serde_json::from_str(FIXTURE).expect("fixture must deserialize");

        fixture
            .validate_contract()
            .expect("fixture must satisfy persistence contract invariants");
    }

    #[test]
    fn unknown_fields_are_rejected() {
        let invalid = FIXTURE.replacen(
            "\"schemaVersion\": \"create-save-command-v1\"",
            "\"schemaVersion\": \"create-save-command-v1\", \"futureField\": true",
            1,
        );

        let error = serde_json::from_str::<PersistenceFixtureV1>(&invalid)
            .expect_err("unknown command fields must fail");

        assert!(error.to_string().contains("unknown field"));
    }

    #[test]
    fn payload_hash_mismatch_is_rejected() {
        let invalid = FIXTURE.replacen(
            "613057a590ecb0a2edbe99152d746dcb23f6542b28f2a71122b8a2016ae2aa82",
            "0000000000000000000000000000000000000000000000000000000000000000",
            1,
        );
        let fixture: PersistenceFixtureV1 =
            serde_json::from_str(&invalid).expect("shape must still deserialize");

        let error = fixture
            .validate_contract()
            .expect_err("hash mismatch must fail validation");

        assert_eq!(error.code(), "PayloadHashMismatch");
    }
}
