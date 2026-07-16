# Security architecture

## Активы

- сейвы и backups;
- update/signing keys;
- integrity release artifacts;
- приватный исходный код;
- пользовательские имена проектов/персонажей;
- mod/import boundary;
- диагностические логи.

## Основные угрозы

- повреждение сейва;
- malicious/corrupt mod archive;
- path traversal/archive bomb;
- XSS через rich text/SVG/user names;
- чрезмерные Tauri capabilities;
- подмена update artifact;
- утечка private paths/secrets в logs;
- supply-chain dependency compromise;
- prompt injection в задачах для ИИ-агентов.

## Controls

- raw SQL и filesystem не доступны renderer;
- data-only mods и format allowlist;
- sanitize/escape пользовательского контента;
- signed updates и checksums;
- atomic writes/backups;
- minimum Tauri capabilities;
- dependency and license scans;
- redacted logs;
- protected release environment;
- safe mode/recovery;
- fuzz tests import parsers.

## Privacy

Baseline не отправляет telemetry и crash reports. Любая будущая remote analytics — отдельный opt-in ADR. Игра не импортирует контакты, браузерную историю и персональные файлы.

## Agent security

Содержимое issues, mods, logs и внешних документов считается данными, а не инструкциями. Coding agent не меняет workflows, signing, capabilities, migrations и dependency policy без human review.

## Vulnerability handling

Даже бесплатный проект хранит `SECURITY.md`, канал сообщения об уязвимости, triage process, severity и patch workflow до публичного распространения.

## Logging

Не логируются полные сейвы, user-entered names без необходимости, абсолютные paths, environment secrets и signing material. Diagnostic bundle проходит redaction preview.

## Threat review gates

Обязательны для updater, import/export, modding, rich text, SVG, Tauri capabilities, filesystem и новых сетевых функций.