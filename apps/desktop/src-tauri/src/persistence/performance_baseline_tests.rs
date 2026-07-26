use super::sqlite_performance::{
    MicrosecondSummary, run_january_sqlite_performance_baseline, summarize_microseconds,
};

#[test]
fn sqlite_performance_summary_uses_nearest_rank_integer_microseconds() {
    assert_eq!(
        summarize_microseconds(&[4, 1, 3, 2]).expect("valid performance samples"),
        MicrosecondSummary {
            sample_count: 4,
            min_microseconds: 1,
            mean_microseconds: 3,
            p50_microseconds: 2,
            p95_microseconds: 4,
            p99_microseconds: 4,
            max_microseconds: 4,
        }
    );
}

#[test]
fn sqlite_performance_summary_rejects_empty_samples() {
    assert!(summarize_microseconds(&[]).is_err());
}

#[test]
fn january_sqlite_performance_baseline() {
    if std::env::var("RUNTIME_HUMAN_SQLITE_PERF_BASELINE").as_deref() != Ok("1") {
        eprintln!("January SQLite performance baseline skipped; enable it explicitly");
        return;
    }

    run_january_sqlite_performance_baseline()
        .expect("January file-backed SQLite baseline completes and writes its report");
}
