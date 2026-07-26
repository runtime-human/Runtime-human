---
title: "Runtime Human — performance budgets"
type: engine
status: draft
canon: true
updated: 2026-07-26
---

# Runtime Human — performance budgets

## Назначение

Этот документ задаёт начальные **warning-only** бюджеты для playable January workload. Они нужны для обнаружения регрессий и выбора следующего измерения, а не для автоматического разрешения оптимизаций.

До накопления стабильной базы запрещено:

- менять SQLite durability или recovery ради сокращения времени;
- вводить cache, pool, batching или новый IPC только по одному измерению;
- сравнивать результаты разных машин как одну временную серию;
- считать синтетический Node/Vitest baseline заменой реального Tauri/WebView2 startup profile;
- делать вывод по среднему значению без p50/p95/p99 и описания условий запуска.

## Измерительные классы

### Класс A — воспроизводимый January harness

Команда:

```powershell
pnpm perf:january:baseline
```

Она выполняет опубликованный compiled content и полный January flow:

```text
session bootstrap
→ begin
→ access decision
→ learning decision
→ defect decision
→ atomic commit
```

Текущий harness использует реальную TypeScript application/runtime композицию и in-memory persistence contract harness. Он подходит для сравнения:

- manifest/chunk parse и registry publication;
- save bootstrap orchestration;
- MonthRun load/begin/resume/commit application path;
- относительной регрессии TypeScript-кода на одной машине.

Он **не измеряет**:

- WebView2 startup и first meaningful paint;
- Tauri IPC serialization;
- SQLite queue wait и fsync;
- file-backed boundary/commit latency;
- Windows idle CPU, handles, threads и working set.

### Класс B — Windows/Tauri профиль

Команда:

```powershell
pnpm perf:windows:profile
```

Она сохраняет redacted hardware/toolchain profile и запускает January baseline. Реальный Tauri/WebView2 startup, file-backed SQLite и WPR/WPA capture добавляются отдельными ограниченными срезами OPT-00B/OPT-00C.

## Начальные бюджеты

| Метрика | Warning budget | Gate status | Measurement class |
|---|---:|---|---|
| Cold process start → first meaningful paint, p50 | ≤ 1.2 s | warning-only | будущий Tauri profile |
| Cold process start → first meaningful paint, p95 | ≤ 2.5 s | warning-only | будущий Tauri profile |
| Warm process start → first meaningful paint, p50 | ≤ 0.7 s | warning-only | будущий Tauri profile |
| Warm process start → first meaningful paint, p95 | ≤ 1.5 s | warning-only | будущий Tauri profile |
| UI input feedback, p95 | ≤ 100 ms | warning-only | browser interaction |
| Обычная интерактивная операция, p95 | ≤ 200 ms | warning-only | browser + Tauri |
| Persistence queue wait, p95 | ≤ 5 ms | warning-only | будущий Rust telemetry |
| Persistence queue wait, p99 | ≤ 25 ms | warning-only | будущий Rust telemetry |
| Warm persisted month context load, p95 | ≤ 25 ms | warning-only | будущий file-backed baseline |
| Warm persisted month context load, p99 | ≤ 75 ms | warning-only | будущий file-backed baseline |
| Durable boundary на SSD, p95 | ≤ 30 ms | warning-only | будущий file-backed baseline |
| Durable boundary на SSD, p99 | ≤ 100 ms | warning-only | будущий file-backed baseline |
| Idle CPU | около 0%, без periodic polling | warning-only | будущий Windows profile |
| Persistence queue depth, p99 | < 4 | warning-only | будущий Rust telemetry |
| Initial renderer bundle growth per PR | ≤ 5% без waiver | warning-only | renderer build artifact |
| 100 MonthRun cycles working-set growth | ≤ 5 MiB после stabilization | warning-only | будущий process profile |
| Fast PR gate | ≤ 5 min | observation | GitHub Actions summary |
| Full merge gate | ≤ 10 min critical path | observation | GitHub Actions summary |
| Warm incremental content build, one source | ориентир ≤ 150 ms | warning-only | будущий compiler baseline |
| Full compiler fixture, 10k entries | ориентир ≤ 2 s | warning-only | будущий compiler baseline |

## Правила сравнения

Результат считается сопоставимым только когда совпадают:

- `windows-performance-profile-v1` по OS build, CPU model, logical processors и total RAM;
- Node, pnpm, Rust toolchain;
- repository base commit или явно указан сравниваемый PR;
- warmup/measured run counts;
- scenario seed и choices;
- питание, фоновые процессы и режим антивируса описаны в runbook.

## Правило обнаружения регрессии

Регрессия требует расследования, если одновременно выполняются условия:

1. одноимённый p95 или p99 ухудшился минимум на 15%;
2. абсолютное ухудшение больше измерительного шума сценария;
3. эффект повторяется минимум в трёх независимых batch runs;
4. median не противоречит изменению p95/p99;
5. commit diff затрагивает измеряемый hot path.

Одно превышение бюджета создаёт observation, но не разрешает архитектурное изменение.

## Переход warning → gate

Performance check может стать merge gate только после:

- не менее 20 стабильных baseline artifacts на одном runner profile;
- документированного коэффициента вариации;
- отдельного утверждения допустимой flaky-rate;
- доказательства, что check не измеряет installation/network noise;
- rollback-плана при ложных блокировках;
- сохранения durability, determinism и recovery инвариантов.

## Неприкосновенные инварианты

Performance work не может ослаблять:

- Xoshiro256** и versioned determinism manifest;
- canonical JSON и domain-separated SHA-256;
- revision + payload SHA + checkpoint hash CAS;
- durable request receipts и hash-linked journal;
- `BEGIN IMMEDIATE`, WAL и `synchronous=FULL`;
- Rust-owned persistence и отсутствие frontend SQL;
- compiled-content-only runtime;
- exactly-once January commit.
