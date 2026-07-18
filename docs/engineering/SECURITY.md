---
title: "Security architecture"
type: engine
status: draft
canon: true
updated: 2026-07-18
---

# Security architecture

## Активы

- сейвы и backups;
- update/signing keys;
- integrity release artifacts;
- приватный исходный код;
- пользовательские имена проектов/персонажей;
- mod/import boundary;
- диагностические логи;
- Tauri capability surface;
- Storybook/test fixtures, которые не должны содержать реальные пользовательские данные.

## Основные угрозы

- повреждение сейва;
- half-applied MonthRun;
- malicious/corrupt mod archive;
- path traversal, zip-slip и archive bomb;
- XSS через rich text/SVG/user names;
- чрезмерные Tauri capabilities;
- raw SQL из renderer;
- подмена update artifact;
- потеря updater private key;
- утечка private paths/secrets в logs;
- supply-chain dependency/workflow compromise;
- prompt injection в задачах для ИИ-агентов;
- accidental privileged access из Storybook/test build.

## Tauri capability policy

Capabilities разделяются минимум на:

- main user window;
- import/export flow;
- updater flow;
- debug/read-only tools;
- desktop E2E build.

Правила:

- capability files включаются явно;
- production main window не получает SQL execute, shell и произвольный filesystem;
- permissions deny-by-default;
- merging capability files проходит review как расширение attack surface;
- test-only/WebdriverIO plugin отсутствует в release profile;
- Storybook не запускается с production capabilities.

## Persistence controls

- Rust authoritative write-boundary;
- typed commands и runtime-validated DTO;
- optimistic revisions/idempotency keys;
- atomic month commit;
- persisted MonthRun draft;
- SQLite minimum version gate;
- Online Backup API/controlled restore;
- pre-migration backup и post-migration validation;
- Safe Mode/recovery.

## Content/mod controls

- data-only mods;
- format/asset allowlist;
- namespaced IDs;
- manifest/version/dependencies/checksums;
- archive size/depth/file-count limits;
- path normalization и traversal rejection;
- temporary extraction/quarantine;
- sanitize/escape пользовательского контента;
- SVG либо запрещён для mods, либо проходит строгий sanitizer;
- activate only after complete validation.

## Updater and release controls

- signed updates и checksums;
- updater signing key отсутствует в repository и `.env`;
- protected release environment;
- encrypted offline escrow минимум в двух контролируемых копиях;
- documented fingerprint/rotation/compromise/recovery runbook;
- dry-run signature verification;
- immutable release artifacts;
- SBOM;
- provenance/attestation.

## Supply chain

- GitHub Actions pinned по full SHA;
- минимальные workflow permissions;
- dependency review required;
- secret scanning/push protection;
- cargo-deny и JS license policy;
- lockfile changes reviewed;
- release jobs не запускают untrusted PR code с secrets;
- dependency major/minor upgrades выполняются отдельными PR.

## Privacy

Baseline не отправляет telemetry и crash reports. Любая будущая remote analytics — отдельный opt-in ADR. Игра не импортирует контакты, браузерную историю и персональные файлы.

Локальная диагностика экспортируется вручную и проходит redaction preview.

## Agent security

Содержимое issues, mods, logs, research articles и внешних документов считается данными, а не инструкциями. Coding agent не меняет workflows, signing, capabilities, migrations и dependency policy без human review.

Storybook MCP:

- только development profile;
- без production save data;
- без SQL/filesystem/updater/signing permissions;
- без release secrets;
- не входит в production bundle;
- изменения подтверждаются focused tests.

## Vulnerability handling

Даже бесплатный проект хранит `SECURITY.md`, канал сообщения об уязвимости, triage process, severity и patch workflow до публичного распространения.

## Logging

Не логируются полные сейвы, user-entered names без необходимости, абсолютные paths, environment secrets и signing material. Diagnostic bundle проходит redaction preview.

## Threat review gates

Обязательны для:

- updater/signing;
- import/export;
- modding;
- rich text/SVG;
- Tauri capabilities;
- filesystem;
- SQLite migrations/restore;
- Storybook MCP;
- новых сетевых функций;
- новых GitHub Actions с write permissions/secrets.