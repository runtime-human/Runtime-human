#[cfg(test)]
mod tests {
    use std::collections::BTreeSet;

    use rusqlite::version_number;
    use tempfile::tempdir;

    use super::open_database;

    const REQUIRED_TABLES: [&str; 4] = [
        "committed_month_runs",
        "pending_month_runs",
        "request_receipts",
        "save_games",
    ];

    #[test]
    fn opens_bundled_sqlite_with_required_runtime_gates() {
        let directory = tempdir().expect("temporary directory must be created");
        let path = directory.path().join("runtime-human.sqlite3");
        let connection = open_database(&path).expect("database must open");

        assert!(version_number() >= 3_051_003);
        assert_eq!(pragma_text(&connection, "journal_mode"), "wal");
        assert_eq!(pragma_i64(&connection, "synchronous"), 1);
        assert_eq!(pragma_i64(&connection, "foreign_keys"), 1);
        assert_eq!(pragma_i64(&connection, "busy_timeout"), 5_000);
        assert_eq!(pragma_i64(&connection, "user_version"), 1);
        assert_eq!(quick_check(&connection), "ok");
        assert_eq!(foreign_key_violation_count(&connection), 0);
    }

    #[test]
    fn migration_is_idempotent_and_preserves_the_exact_schema() {
        let directory = tempdir().expect("temporary directory must be created");
        let path = directory.path().join("runtime-human.sqlite3");

        drop(open_database(&path).expect("first open must migrate"));
        let connection = open_database(&path).expect("second open must be idempotent");

        let tables = connection
            .prepare(
                "SELECT name FROM sqlite_schema \
                 WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
            )
            .expect("schema query must prepare")
            .query_map([], |row| row.get::<_, String>(0))
            .expect("schema query must execute")
            .collect::<Result<BTreeSet<_>, _>>()
            .expect("table names must decode");

        assert_eq!(
            tables,
            REQUIRED_TABLES
                .into_iter()
                .map(str::to_owned)
                .collect::<BTreeSet<_>>()
        );
        assert_eq!(pragma_i64(&connection, "user_version"), 1);
        assert_eq!(quick_check(&connection), "ok");
    }

    #[test]
    fn strict_schema_rejects_invalid_revision_storage() {
        let directory = tempdir().expect("temporary directory must be created");
        let path = directory.path().join("runtime-human.sqlite3");
        let connection = open_database(&path).expect("database must open");

        let error = connection
            .execute(
                "INSERT INTO save_games (save_id, revision, snapshot_json, snapshot_sha256) \
                 VALUES ('save-strict', 'not-an-integer', '{}', ?1)",
                ["0".repeat(64)],
            )
            .expect_err("STRICT table must reject a text revision");

        assert!(error.to_string().contains("cannot store TEXT value"));
    }

    fn pragma_text(connection: &rusqlite::Connection, name: &str) -> String {
        connection
            .pragma_query_value(None, name, |row| row.get(0))
            .expect("pragma text value must be readable")
    }

    fn pragma_i64(connection: &rusqlite::Connection, name: &str) -> i64 {
        connection
            .pragma_query_value(None, name, |row| row.get(0))
            .expect("pragma integer value must be readable")
    }

    fn quick_check(connection: &rusqlite::Connection) -> String {
        connection
            .query_row("PRAGMA quick_check(1)", [], |row| row.get(0))
            .expect("quick_check must return one result")
    }

    fn foreign_key_violation_count(connection: &rusqlite::Connection) -> usize {
        let mut statement = connection
            .prepare("PRAGMA foreign_key_check")
            .expect("foreign key check must prepare");
        let mut rows = statement.query([]).expect("foreign key check must execute");
        let mut count = 0;
        while rows.next().expect("foreign key row must decode").is_some() {
            count += 1;
        }
        count
    }
}
