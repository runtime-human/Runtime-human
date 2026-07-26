---
title: "Runtime Human — profiling runbook"
type: engine
status: draft
canon: true
updated: 2026-07-26
---

# Runtime Human — profiling runbook

## Цель

Runbook описывает воспроизводимый сбор performance evidence для Runtime Human. Он отделяет:

- быстрый TypeScript January harness;
- redacted Windows machine profile;
- будущие Tauri/WebView2 startup captures;
- будущие file-backed SQLite measurements.

Результаты не влияют на authoritative game state и не отправляются во внешние сервисы.

## Подготовка рабочего дерева

Использовать clean checkout точного commit:

```powershell
git status --short
git rev-parse HEAD
corepack enable
corepack prepare pnpm@11.11.0 --activate
pnpm install --frozen-lockfile
```

До измерения записать:

- plugged-in или battery power mode;
- наличие Windows Update, indexer, backup, game launcher и browser downloads;
- режим Microsoft Defender или другого антивируса;
- были ли недавно очищены pnpm/Cargo/WebView caches;
- cold или warm scenario.

Не отключать security software только ради получения красивого результата. Изменение его режима должно быть явно записано рядом с artifact.

## Команда January baseline

```powershell
pnpm perf:january:baseline
```

Выход:

```text
artifacts/performance/january-1990-performance-baseline-v1.json
```

Стандартный batch:

- 5 warmup runs;
- 30 measured runs;
- seed `42`;
- choices `home-pc → edit-and-debug → inspect-listing`;
- published compiled content;
- свежий in-memory persistence harness на каждый run.

Artifact содержит только scenario metadata и агрегированные integer-microsecond timings. Save IDs, run IDs, snapshots, checkpoints и payloads не записываются.

## Команда Windows profile

```powershell
pnpm perf:windows:profile
```

Выходы:

```text
artifacts/performance/windows-profile-v1.json
artifacts/performance/january-1990-performance-baseline-v1.json
```

Windows profile включает:

- UTC timestamp;
- repository commit;
- Windows caption/version/build;
- CPU model и logical processor count;
- total physical RAM;
- Node, pnpm, rustc и cargo versions.

Он намеренно не включает:

- username;
- hostname;
- абсолютные repository paths;
- disk, motherboard или device serial numbers;
- IP/MAC/network adapters;
- environment variables;
- process command lines;
- save data.

## Cold и warm сценарии

### January harness

Harness не моделирует process cold start. Для него различаются:

- **first batch after checkout/install** — возможен filesystem/antivirus cache noise;
- **warm batch** — повтор после успешного первого запуска;
- **comparison batch** — три последовательных запуска на одном commit и три на сравниваемом commit.

### Будущий Tauri/WebView2 startup

Cold startup:

1. завершить Runtime Human;
2. убедиться, что процесса и WebView child processes нет;
3. не очищать WebView cache, если измеряется обычный пользовательский запуск;
4. подождать 15 секунд без активной установки/компиляции;
5. запустить profiling build;
6. измерить process start → first meaningful January screen.

Warm startup повторяет запуск без reboot/cache deletion после одного успешного открытия приложения.

Отдельно маркировать:

- OS-reboot cold;
- process cold;
- warm WebView cache;
- development build;
- profiling/release build.

## Batch protocol

Для сравнения commit A и B:

1. собрать Windows profile для A;
2. выполнить baseline три раза;
3. сохранить artifacts как `A-1`, `A-2`, `A-3` вне рабочего дерева;
4. перейти на B и повторить install/build тем же способом;
5. собрать Windows profile для B;
6. выполнить baseline три раза;
7. сравнить одноимённые `count/min/p50/p95/p99/max`;
8. проверить, что scenario metadata совпадает;
9. записать медиану трёх batch p95, а не выбирать лучший запуск.

## Интерпретация percentiles

Baseline использует nearest-rank percentiles над integer microseconds:

- p50 — типичный measured operation;
- p95 — редкий, но ожидаемый slow path;
- p99 — tail indicator, особенно чувствительный к background load;
- max — диагностический сигнал, но не самостоятельный budget.

Для двух chunk loads на каждый run `count = measuredRuns × 2`. Для двух non-final resume operations применяется то же правило.

## Проверка результата

После запуска убедиться:

```powershell
Get-Content artifacts/performance/january-1990-performance-baseline-v1.json
Get-Content artifacts/performance/windows-profile-v1.json
```

Проверить:

- schema version ожидаемая;
- measured run count не нулевой;
- присутствуют все timing names;
- durations — неотрицательные safe integers;
- нет `checkpoint`, `snapshot`, `saveId`, `runId`;
- commit в Windows profile соответствует `git rev-parse HEAD`;
- JSON-файлы не попали в `git status --short` благодаря локальному ignore.

## Ограничения текущего OPT-00A

Текущий baseline измеряет application/desktop orchestration и published-content processing в Node/Vitest. Он не доказывает скорость:

- WebView2 initialization;
- React first meaningful paint;
- Tauri IPC;
- SQLite queue wait;
- WAL/fsync boundary;
- clean/unclean DB open;
- backup;
- idle CPU/wakeups;
- process working set, handles и threads.

Следующий measurement slice должен добавить file-backed Rust timings и Tauri startup evidence без изменения persistence protocol.

## Когда разрешено оптимизировать

Перед изменением hot path требуется:

1. воспроизводимое превышение budget или подтверждённая регрессия;
2. профиль, локализующий затрату;
3. минимальная гипотеза изменения;
4. отдельный correctness/durability regression test;
5. before/after artifacts на одинаковом machine profile;
6. отсутствие изменений deterministic golden artifacts;
7. rollback, если выигрыш не подтверждён.

## Хранение evidence

`artifacts/performance/` локально ignored. В PR допускаются:

- краткая агрегированная таблица в описании;
- GitHub Actions artifact с коротким retention;
- redacted machine profile;
- ссылка на exact commit и команды.

Не коммитить machine-specific duration JSON как golden: wall-clock timings не детерминированы и зависят от окружения.
