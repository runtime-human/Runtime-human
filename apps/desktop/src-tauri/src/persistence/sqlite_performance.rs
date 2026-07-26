use std::{
    env,
    error::Error,
    fs,
    io,
    path::{Path, PathBuf},
    time::{Instant, SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use tempfile::TempDir;

use super::{
    BeginPersistedMonthRunCommandV1, CommitPersistedMonthRunCommandV1, CreateSaveCommandV1,
    LoadActiveMonthRunQueryV1, LoadSaveQueryV1, MutationOutcome, PersistenceHandle,
    StoreMonthRunBoundaryCommandV1,
};

const FIXTURE_JSON: &str =
    include_str!("../../../../../fixtures/persistence/january-1990-persistence-flow-v1.json");
const DEFAULT_OUTPUT: &str = "artifacts/performance/january-sqlite-baseline.json";
const DEFAULT_WARMUPS: usize = 2;
const DEFAULT_SAMPLES: usize = 20;
const DURABLE_BOUNDARY_P95_BUDGET_MICROSECONDS: u64 = 30_000;
const WARM_LOAD_P95_BUDGET_MICROSECONDS: u64 = 25_000;

type BaselineResult<T> = Result<T, Box<dyn Error + Send + Sync>>;
type SampleOperation = fn(&JanuaryPersistenceFlowFixture) -> BaselineResult<u64>;

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(super) struct MicrosecondSummary {
    pub(super) sample_count: usize,
    pub(super) min_microseconds: u64,
    pub(super) mean_microseconds: u64,
    pub(super) p50_microseconds: u64,
    pub(super) p95_microseconds: u64,
    pub(super) p99_microseconds: u64,
    pub(super) max_microseconds: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct JanuaryPersistenceFlowFixture {
    schema_version: String,
    create_save: CreateSaveCommandV1,
    begin: BeginPersistedMonthRunCommandV1,
    boundaries: Vec<StoreMonthRunBoundaryCommandV1>,
    commit: CommitPersistedMonthRunCommandV1,
    expectations: JanuaryPersistenceExpectations,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct JanuaryPersistenceExpectations {
    boundary_program_counters: Vec<u64>,
    boundary_statuses: Vec<super::DurableMonthRunStatus>,
    committed_program_counter: u64,
    final_save_revision: u64,
    final_run_status: super::DurableMonthRunStatus,
    completed_checkpoint_hash: String,
    committed_checkpoint_hash: String,
}

#[derive(Clone, Copy)]
struct ScenarioDefinition {
    id: &'static str,
    p95_budget_microseconds: Option<u64>,
    sample: SampleOperation,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SqlitePerformanceReport {
    schema_version: &'static str,
    generated_at_unix_ms: u64,
    source_revision: String,
    host: HostProfile,
    configuration: BaselineConfiguration,
    durability: DurabilityProfile,
    scope_notes: Vec<&'static str>,
    scenarios: Vec<ScenarioResult>,
    warnings: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HostProfile {
    platform: &'static str,
    architecture: &'static str,
    os_release: Option<String>,
    cpu_model: Option<String>,
    logical_cores: Option<u64>,
    total_memory_mib: Option<u64>,
    node_version: Option<String>,
    runner_name: Option<String>,
    continuous_integration: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BaselineConfiguration {
    warmups: usize,
    samples: usize,
    unit: &'static str,
    budget_enforcement: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DurabilityProfile {
    engine: &'static str,
    journal_mode: &'static str,
    synchronous: &'static str,
    write_transaction: &'static str,
    worker_model: &'static str,
    queue_capacity: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ScenarioResult {
    id: &'static str,
    scope: &'static str,
    unit: &'static str,
    summary: MicrosecondSummary,
    budget: WarningOnlyBudget,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WarningOnlyBudget {
    status: &'static str,
    p95_budget_microseconds: Option<u64>,
    exceeds_budget: bool,
    enforcement: &'static str,
}

struct PreparedDatabase {
    handle: PersistenceHandle,
    path: PathBuf,
    _directory: TempDir,
}

const SCENARIOS: [ScenarioDefinition; 13] = [
    ScenarioDefinition {
        id: "db.start.new_file",
        p95_budget_microseconds: None,
        sample: sample_start_new_file,
    },
    ScenarioDefinition {
        id: "db.start.clean_existing",
        p95_budget_microseconds: None,
        sample: sample_start_clean_existing,
    },
    ScenarioDefinition {
        id: "save.create",
        p95_budget_microseconds: Some(DURABLE_BOUNDARY_P95_BUDGET_MICROSECONDS),
        sample: sample_create_save,
    },
    ScenarioDefinition {
        id: "save.load",
        p95_budget_microseconds: Some(WARM_LOAD_P95_BUDGET_MICROSECONDS),
        sample: sample_load_save,
    },
    ScenarioDefinition {
        id: "month.begin",
        p95_budget_microseconds: Some(DURABLE_BOUNDARY_P95_BUDGET_MICROSECONDS),
        sample: sample_begin_month,
    },
    ScenarioDefinition {
        id: "month.boundary.pc2",
        p95_budget_microseconds: Some(DURABLE_BOUNDARY_P95_BUDGET_MICROSECONDS),
        sample: sample_boundary_pc2,
    },
    ScenarioDefinition {
        id: "month.boundary.pc4",
        p95_budget_microseconds: Some(DURABLE_BOUNDARY_P95_BUDGET_MICROSECONDS),
        sample: sample_boundary_pc4,
    },
    ScenarioDefinition {
        id: "month.boundary.pc7",
        p95_budget_microseconds: Some(DURABLE_BOUNDARY_P95_BUDGET_MICROSECONDS),
        sample: sample_boundary_pc7,
    },
    ScenarioDefinition {
        id: "month.boundary.pc9",
        p95_budget_microseconds: Some(DURABLE_BOUNDARY_P95_BUDGET_MICROSECONDS),
        sample: sample_boundary_pc9,
    },
    ScenarioDefinition {
        id: "month.commit",
        p95_budget_microseconds: Some(DURABLE_BOUNDARY_P95_BUDGET_MICROSECONDS),
        sample: sample_commit_month,
    },
    ScenarioDefinition {
        id: "month.commit.duplicate_receipt",
        p95_budget_microseconds: Some(WARM_LOAD_P95_BUDGET_MICROSECONDS),
        sample: sample_duplicate_commit,
    },
    ScenarioDefinition {
        id: "month.load_active.after_clean_reopen",
        p95_budget_microseconds: Some(WARM_LOAD_P95_BUDGET_MICROSECONDS),
        sample: sample_load_active_after_reopen,
    },
    ScenarioDefinition {
        id: "db.shutdown.clean",
        p95_budget_microseconds: None,
        sample: sample_clean_shutdown,
    },
];

pub(super) fn summarize_microseconds(
    samples: &[u64],
) -> Result<MicrosecondSummary, &'static str> {
    if samples.is_empty() {
        return Err("performance samples must not be empty");
    }
    let mut sorted = samples.to_vec();
    sorted.sort_unstable();
    let sum = sorted.iter().try_fold(0_u128, |total, sample| {
        total.checked_add(u128::from(*sample))
    });
    let Some(sum) = sum else {
        return Err("performance sample sum overflowed");
    };
    let sample_count = sorted.len();
    let divisor = u128::try_from(sample_count).map_err(|_| "sample count does not fit u128")?;
    let rounded_mean = (sum + divisor / 2) / divisor;
    let mean_microseconds =
        u64::try_from(rounded_mean).map_err(|_| "mean does not fit u64 microseconds")?;

    Ok(MicrosecondSummary {
        sample_count,
        min_microseconds: require_sample(&sorted, 0)?,
        mean_microseconds,
        p50_microseconds: nearest_rank(&sorted, 50)?,
        p95_microseconds: nearest_rank(&sorted, 95)?,
        p99_microseconds: nearest_rank(&sorted, 99)?,
        max_microseconds: require_sample(&sorted, sample_count - 1)?,
    })
}

pub(super) fn run_january_sqlite_performance_baseline() -> BaselineResult<()> {
    let fixture: JanuaryPersistenceFlowFixture = serde_json::from_str(FIXTURE_JSON)?;
    validate_fixture(&fixture)?;
    let warmups = read_usize_environment(
        "RUNTIME_HUMAN_SQLITE_PERF_WARMUPS",
        DEFAULT_WARMUPS,
        0,
    )?;
    let samples = read_usize_environment(
        "RUNTIME_HUMAN_SQLITE_PERF_SAMPLES",
        DEFAULT_SAMPLES,
        1,
    )?;
    let output_path = PathBuf::from(
        env::var("RUNTIME_HUMAN_SQLITE_PERF_OUTPUT").unwrap_or_else(|_| DEFAULT_OUTPUT.to_owned()),
    );

    let mut results = Vec::with_capacity(SCENARIOS.len());
    for scenario in SCENARIOS {
        for _ in 0..warmups {
            (scenario.sample)(&fixture)?;
        }
        let mut durations = Vec::with_capacity(samples);
        for _ in 0..samples {
            durations.push((scenario.sample)(&fixture)?);
        }
        let summary = summarize_microseconds(&durations).map_err(io::Error::other)?;
        let budget = classify_warning_only_budget(summary, scenario.p95_budget_microseconds);
        results.push(ScenarioResult {
            id: scenario.id,
            scope: "rust-file-backed-sqlite",
            unit: "microseconds",
            summary,
            budget,
        });
    }

    let warnings = results
        .iter()
        .filter(|scenario| scenario.budget.status == "warning")
        .count();
    let report = SqlitePerformanceReport {
        schema_version: "runtime-human-sqlite-performance-baseline-v1",
        generated_at_unix_ms: unix_time_milliseconds()?,
        source_revision: environment_value("RUNTIME_HUMAN_PERF_COMMIT")
            .unwrap_or_else(|| "unrecorded".to_owned()),
        host: HostProfile {
            platform: env::consts::OS,
            architecture: env::consts::ARCH,
            os_release: environment_value("RUNTIME_HUMAN_PERF_OS_RELEASE"),
            cpu_model: environment_value("RUNTIME_HUMAN_PERF_CPU_MODEL"),
            logical_cores: parse_optional_u64_environment(
                "RUNTIME_HUMAN_PERF_LOGICAL_CORES",
            )?,
            total_memory_mib: parse_optional_u64_environment(
                "RUNTIME_HUMAN_PERF_TOTAL_MEMORY_MIB",
            )?,
            node_version: environment_value("RUNTIME_HUMAN_PERF_NODE_VERSION"),
            runner_name: environment_value("RUNNER_NAME"),
            continuous_integration: env::var("CI").as_deref() == Ok("true"),
        },
        configuration: BaselineConfiguration {
            warmups,
            samples,
            unit: "microseconds",
            budget_enforcement: "warning-only",
        },
        durability: DurabilityProfile {
            engine: "rusqlite-0.40.1",
            journal_mode: "WAL",
            synchronous: "FULL",
            write_transaction: "BEGIN IMMEDIATE",
            worker_model: "single-dedicated-thread",
            queue_capacity: 64,
        },
        scope_notes: vec![
            "Every sample uses a real temporary SQLite file and the production PersistenceHandle worker.",
            "Scenario preparation is excluded from the timed operation and uses the committed January production command fixture.",
            "Results do not include Tauri invoke/serde, WebView2, renderer work or first meaningful paint.",
            "Preliminary targets are warning-only and never change the command exit status.",
        ],
        scenarios: results,
        warnings,
    };

    write_report(&output_path, &report)?;
    print_report(&output_path, &report);
    Ok(())
}

fn validate_fixture(fixture: &JanuaryPersistenceFlowFixture) -> BaselineResult<()> {
    if fixture.schema_version != "january-1990-persistence-flow-v1" {
        return Err(io::Error::other("unexpected January persistence fixture schema").into());
    }
    if fixture.boundaries.len() != 4 {
        return Err(io::Error::other("January persistence fixture must contain four boundaries").into());
    }
    if fixture.expectations.boundary_program_counters != [2, 4, 7, 9] {
        return Err(io::Error::other("January persistence fixture program counters changed").into());
    }
    if fixture.expectations.boundary_statuses.len() != 4
        || fixture.expectations.committed_program_counter != 9
        || fixture.expectations.final_save_revision != 1
        || fixture.expectations.completed_checkpoint_hash.len() != 64
        || fixture.expectations.committed_checkpoint_hash.len() != 64
    {
        return Err(io::Error::other("January persistence fixture expectations changed").into());
    }
    let _final_status = fixture.expectations.final_run_status;
    Ok(())
}

fn nearest_rank(sorted: &[u64], percentile: usize) -> Result<u64, &'static str> {
    let numerator = percentile
        .checked_mul(sorted.len())
        .ok_or("percentile rank overflowed")?;
    let rank = numerator.div_ceil(100).max(1);
    require_sample(sorted, rank - 1)
}

fn require_sample(sorted: &[u64], index: usize) -> Result<u64, &'static str> {
    sorted
        .get(index)
        .copied()
        .ok_or("performance sample index is outside the collected range")
}

fn classify_warning_only_budget(
    summary: MicrosecondSummary,
    p95_budget_microseconds: Option<u64>,
) -> WarningOnlyBudget {
    match p95_budget_microseconds {
        Some(budget) => {
            let exceeds_budget = summary.p95_microseconds > budget;
            WarningOnlyBudget {
                status: if exceeds_budget {
                    "warning"
                } else {
                    "within-target"
                },
                p95_budget_microseconds: Some(budget),
                exceeds_budget,
                enforcement: "warning-only",
            }
        }
        None => WarningOnlyBudget {
            status: "unbudgeted",
            p95_budget_microseconds: None,
            exceeds_budget: false,
            enforcement: "warning-only",
        },
    }
}

fn sample_start_new_file(_fixture: &JanuaryPersistenceFlowFixture) -> BaselineResult<u64> {
    let directory = TempDir::new()?;
    let path = directory.path().join("runtime-human.sqlite3");
    let (handle, duration) = time_operation(|| Ok(PersistenceHandle::start(path)?))?;
    handle.shutdown()?;
    Ok(duration)
}

fn sample_start_clean_existing(_fixture: &JanuaryPersistenceFlowFixture) -> BaselineResult<u64> {
    let directory = TempDir::new()?;
    let path = directory.path().join("runtime-human.sqlite3");
    PersistenceHandle::start(path.clone())?.shutdown()?;
    let (handle, duration) = time_operation(|| Ok(PersistenceHandle::start(path)?))?;
    handle.shutdown()?;
    Ok(duration)
}

fn sample_create_save(fixture: &JanuaryPersistenceFlowFixture) -> BaselineResult<u64> {
    let database = start_database()?;
    let (outcome, duration) = time_operation(|| {
        Ok(database.handle.create_save(fixture.create_save.clone())?)
    })?;
    expect_accepted(outcome, "create save")?;
    database.handle.shutdown()?;
    Ok(duration)
}

fn sample_load_save(fixture: &JanuaryPersistenceFlowFixture) -> BaselineResult<u64> {
    let database = prepare_save(fixture)?;
    let query = LoadSaveQueryV1 {
        schema_version: "load-save-query-v1".to_owned(),
        save_id: fixture.create_save.save_id.clone(),
    };
    let (record, duration) = time_operation(|| Ok(database.handle.load_save(query)?))?;
    if record.is_none() {
        return Err(io::Error::other("prepared January save was not found").into());
    }
    database.handle.shutdown()?;
    Ok(duration)
}

fn sample_begin_month(fixture: &JanuaryPersistenceFlowFixture) -> BaselineResult<u64> {
    let database = prepare_save(fixture)?;
    let (outcome, duration) = time_operation(|| {
        Ok(database.handle.begin_month_run(fixture.begin.clone())?)
    })?;
    expect_accepted(outcome, "begin month")?;
    database.handle.shutdown()?;
    Ok(duration)
}

fn sample_boundary_pc2(fixture: &JanuaryPersistenceFlowFixture) -> BaselineResult<u64> {
    sample_boundary(fixture, 0)
}

fn sample_boundary_pc4(fixture: &JanuaryPersistenceFlowFixture) -> BaselineResult<u64> {
    sample_boundary(fixture, 1)
}

fn sample_boundary_pc7(fixture: &JanuaryPersistenceFlowFixture) -> BaselineResult<u64> {
    sample_boundary(fixture, 2)
}

fn sample_boundary_pc9(fixture: &JanuaryPersistenceFlowFixture) -> BaselineResult<u64> {
    sample_boundary(fixture, 3)
}

fn sample_boundary(
    fixture: &JanuaryPersistenceFlowFixture,
    boundary_index: usize,
) -> BaselineResult<u64> {
    let database = prepare_boundaries(fixture, boundary_index)?;
    let command = fixture
        .boundaries
        .get(boundary_index)
        .ok_or_else(|| io::Error::other("January boundary index is missing"))?
        .clone();
    let (outcome, duration) = time_operation(|| Ok(database.handle.store_boundary(command)?))?;
    expect_accepted(outcome, "store boundary")?;
    database.handle.shutdown()?;
    Ok(duration)
}

fn sample_commit_month(fixture: &JanuaryPersistenceFlowFixture) -> BaselineResult<u64> {
    let database = prepare_boundaries(fixture, fixture.boundaries.len())?;
    let (outcome, duration) = time_operation(|| {
        Ok(database.handle.commit_month_run(fixture.commit.clone())?)
    })?;
    expect_accepted(outcome, "commit month")?;
    database.handle.shutdown()?;
    Ok(duration)
}

fn sample_duplicate_commit(fixture: &JanuaryPersistenceFlowFixture) -> BaselineResult<u64> {
    let database = prepare_committed(fixture)?;
    let (outcome, duration) = time_operation(|| {
        Ok(database.handle.commit_month_run(fixture.commit.clone())?)
    })?;
    expect_duplicate(outcome, "duplicate commit")?;
    database.handle.shutdown()?;
    Ok(duration)
}

fn sample_load_active_after_reopen(
    fixture: &JanuaryPersistenceFlowFixture,
) -> BaselineResult<u64> {
    let mut database = prepare_boundaries(fixture, 3)?;
    database.handle.shutdown()?;
    database.handle = PersistenceHandle::start(database.path.clone())?;
    let query = LoadActiveMonthRunQueryV1 {
        schema_version: "load-active-month-run-query-v1".to_owned(),
        save_id: fixture.create_save.save_id.clone(),
    };
    let (record, duration) = time_operation(|| Ok(database.handle.load_active_month_run(query)?))?;
    if record.is_none() {
        return Err(io::Error::other("active January run was not found after reopen").into());
    }
    database.handle.shutdown()?;
    Ok(duration)
}

fn sample_clean_shutdown(fixture: &JanuaryPersistenceFlowFixture) -> BaselineResult<u64> {
    let database = prepare_save(fixture)?;
    let (_, duration) = time_operation(|| Ok(database.handle.shutdown()?))?;
    Ok(duration)
}

fn start_database() -> BaselineResult<PreparedDatabase> {
    let directory = TempDir::new()?;
    let path = directory.path().join("runtime-human.sqlite3");
    let handle = PersistenceHandle::start(path.clone())?;
    Ok(PreparedDatabase {
        handle,
        path,
        _directory: directory,
    })
}

fn prepare_save(fixture: &JanuaryPersistenceFlowFixture) -> BaselineResult<PreparedDatabase> {
    let database = start_database()?;
    expect_accepted(
        database.handle.create_save(fixture.create_save.clone())?,
        "prepare save",
    )?;
    Ok(database)
}

fn prepare_boundaries(
    fixture: &JanuaryPersistenceFlowFixture,
    boundary_count: usize,
) -> BaselineResult<PreparedDatabase> {
    let database = prepare_save(fixture)?;
    expect_accepted(
        database.handle.begin_month_run(fixture.begin.clone())?,
        "prepare begin",
    )?;
    for command in fixture.boundaries.iter().take(boundary_count).cloned() {
        expect_accepted(
            database.handle.store_boundary(command)?,
            "prepare boundary",
        )?;
    }
    Ok(database)
}

fn prepare_committed(
    fixture: &JanuaryPersistenceFlowFixture,
) -> BaselineResult<PreparedDatabase> {
    let database = prepare_boundaries(fixture, fixture.boundaries.len())?;
    expect_accepted(
        database.handle.commit_month_run(fixture.commit.clone())?,
        "prepare commit",
    )?;
    Ok(database)
}

fn expect_accepted<T>(outcome: MutationOutcome<T>, label: &str) -> BaselineResult<T> {
    match outcome {
        MutationOutcome::Accepted(value) => Ok(value),
        MutationOutcome::Duplicate(_) => Err(io::Error::other(format!(
            "{label} unexpectedly returned a duplicate receipt"
        ))
        .into()),
    }
}

fn expect_duplicate<T>(outcome: MutationOutcome<T>, label: &str) -> BaselineResult<T> {
    match outcome {
        MutationOutcome::Duplicate(value) => Ok(value),
        MutationOutcome::Accepted(_) => Err(io::Error::other(format!(
            "{label} unexpectedly returned an accepted mutation"
        ))
        .into()),
    }
}

fn time_operation<T>(operation: impl FnOnce() -> BaselineResult<T>) -> BaselineResult<(T, u64)> {
    let started_at = Instant::now();
    let value = operation()?;
    let duration = u64::try_from(started_at.elapsed().as_micros())?;
    Ok((value, duration))
}

fn read_usize_environment(name: &str, fallback: usize, minimum: usize) -> BaselineResult<usize> {
    let Ok(raw) = env::var(name) else {
        return Ok(fallback);
    };
    let parsed = raw.parse::<usize>()?;
    if parsed < minimum {
        return Err(io::Error::other(format!("{name} must be at least {minimum}")).into());
    }
    Ok(parsed)
}

fn parse_optional_u64_environment(name: &str) -> BaselineResult<Option<u64>> {
    environment_value(name)
        .map(|raw| raw.parse::<u64>().map_err(Into::into))
        .transpose()
}

fn environment_value(name: &str) -> Option<String> {
    env::var(name).ok().filter(|value| !value.is_empty())
}

fn unix_time_milliseconds() -> BaselineResult<u64> {
    let elapsed = SystemTime::now().duration_since(UNIX_EPOCH)?;
    Ok(u64::try_from(elapsed.as_millis())?)
}

fn write_report(path: &Path, report: &SqlitePerformanceReport) -> BaselineResult<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(path, format!("{}\n", serde_json::to_string_pretty(report)?))?;
    Ok(())
}

fn print_report(path: &Path, report: &SqlitePerformanceReport) {
    println!(
        "{:<42} {:>10} {:>10} {:>10} {:>12}",
        "scenario", "p50 us", "p95 us", "p99 us", "status"
    );
    for scenario in &report.scenarios {
        println!(
            "{:<42} {:>10} {:>10} {:>10} {:>12}",
            scenario.id,
            scenario.summary.p50_microseconds,
            scenario.summary.p95_microseconds,
            scenario.summary.p99_microseconds,
            scenario.budget.status
        );
    }
    println!("[perf] wrote {}", path.display());
    println!("[perf] warning-only target exceedances: {}", report.warnings);
}
