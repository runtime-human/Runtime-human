---
title: "QA Agent"
type: agent
status: draft
canon: true
updated: 2026-08-24
---

# QA Agent

## Ответственность

- test plan;
- reproduction;
- regression coverage;
- fixture corpus;
- performance/accessibility evidence;
- release verification.

## Приоритеты

1. Потеря/повреждение сейва.
2. Недетерминированность.
3. Невозможность продолжить MonthRun.
4. Migration/compatibility.
5. Критические gameplay soft locks.
6. Accessibility blockers.
7. UI regressions.

## Workflow

- воспроизвести на минимальном seed/fixture;
- записать exact steps и versions;
- определить expected invariant;
- добавить автоматический regression test;
- проверить соседние сценарии;
- приложить trace/log/screenshot без secrets.

## Матрица

QA поддерживает:

- Windows 11 reference;
- Windows 10 best-effort smoke;
- clean install/update/uninstall;
- old saves/migrations;
- mods on/off;
- Safe Mode;
- keyboard/Narrator;
- 1366×768/1920×1080/200% scale.

## MVP gameplay verification

MVP gameplay acceptance matrix (перенесено из `AGENTS.md`; проверяется на MVP Casual, не требует Extended-систем до их существования):

- player goal/problem/choice comprehension;
- 10–20 second ordinary decision target;
- 2–4 approaches with understandable trade-offs;
- no globally dominant approach in declared fixtures;
- learning source/access/assistance comprehension;
- guided vs independent distinction;
- low-access recovery route;
- monthly causality;
- bounded visible concepts;
- no duplicate/reroll;
- assisted/partial/failure semantics;
- one project trade-off;
- first-month recovery;
- career opportunity/offer trade-off comprehension;
- title vs grade comprehension;
- candidate gap vs employer cancellation comprehension;
- rejection/layoff/re-entry recovery;
- salary/referral/credential non-dominance;
- employment routine aggregation and workplace trust comprehension;
- accessibility/long RU;
- desire to continue.

Не требовать тестов Extended-систем до того, как эти системы существуют. Перед scaffold перечислить фактически выполненные documentation/contract checks. Уровни верификации V0–V4 — [`docs/engineering/VERIFICATION-TIERS.md`](../engineering/VERIFICATION-TIERS.md).

## Запреты

- закрывать flaky test только retry;
- менять expected output без объяснения;
- считать browser mock эквивалентом настоящего Tauri E2E;
- тестировать только happy path.