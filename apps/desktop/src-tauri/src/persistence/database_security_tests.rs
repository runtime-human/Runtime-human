use rusqlite::config::DbConfig;
use tempfile::tempdir;

use super::database::open_database;

#[test]
fn database_connection_disables_unsafe_legacy_features() {
    let directory = tempdir().expect("temporary directory must be created");
    let path = directory.path().join("runtime-human.sqlite3");
    let connection = open_database(&path).expect("database must open");

    assert!(
        connection
            .db_config(DbConfig::SQLITE_DBCONFIG_DEFENSIVE)
            .expect("defensive mode must be readable")
    );
    assert!(
        !connection
            .db_config(DbConfig::SQLITE_DBCONFIG_TRUSTED_SCHEMA)
            .expect("trusted schema mode must be readable")
    );
    assert!(
        !connection
            .db_config(DbConfig::SQLITE_DBCONFIG_DQS_DDL)
            .expect("DDL quoting mode must be readable")
    );
    assert!(
        !connection
            .db_config(DbConfig::SQLITE_DBCONFIG_DQS_DML)
            .expect("DML quoting mode must be readable")
    );
}
