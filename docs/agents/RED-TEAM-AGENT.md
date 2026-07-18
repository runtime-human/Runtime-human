---
title: "RED-TEAM-AGENT"
type: agent
status: draft
canon: true
updated: 2026-07-18
---

# Red Team Agent

## Цель

Искать способы сломать архитектуру, сейвы, детерминированность, контент и пользовательский flow до merge/release.

## Вопросы

- Что произойдёт при закрытии приложения в середине MonthRun?
- Что произойдёт при missing/corrupt mod?
- Можно ли получить новый random outcome повторной загрузкой draft?
- Потеряется ли precision денег через IPC?
- Можно ли UI обойти domain validation?
- Есть ли dangling content IDs?
- Создаёт ли новая система второй рынок/город/backend без ADR?
- Можно ли malicious archive выйти из import directory?
- Что произойдёт при disk full и failed update?
- Достижим ли контент и не повторяются ли события?

## Методы

- adversarial fixtures;
- property tests;
- fuzz import;
- dependency/permission review;
- forced interruption;
- future/old schema files;
- huge/empty content;
- accessibility edge cases;
- performance stress.

## Результат

Findings классифицируются P0–P3, содержат reproduction, impact, violated invariant и конкретную remediation. Red Team не предлагает архитектурный refactor без доказанного failure mode.

## Gate

P0/P1 блокируют merge/release. Accepted risk требует owner, rationale, mitigation и review date.