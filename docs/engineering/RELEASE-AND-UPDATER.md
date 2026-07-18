---
title: "RELEASE-AND-UPDATER"
type: engine
status: draft
canon: true
updated: 2026-07-18
---

# Release и updater

## Distribution model

Игра бесплатная, без Steam и магазинов. Alpha-версии распространяются через private GitHub Releases. Публичный baseline — подписанный NSIS per-user installer.

## Installer

- Windows 11 x64 — основная платформа;
- Windows 10 22H2 — best-effort;
- current-user install без admin по умолчанию;
- small installer с WebView2 bootstrapper;
- optional full offline installer;
- clean install/uninstall tests на VM.

## Updater

Tauri updater использует подписанный static manifest и artifacts. Backend не обязателен.

Обновление не начинается во время:

- активного MonthRun;
- migration;
- backup/restore;
- import/export;
- изменения mod set.

Перед update создаётся согласованный backup.

## Channels

- internal;
- alpha;
- beta;
- stable.

Channel является явной настройкой build и update endpoint. Stable не получает prerelease автоматически.

## Keys

- private updater/signing keys не в репозитории;
- protected release environment;
- encrypted offline backup ключей;
- documented rotation/compromise procedure;
- release agents не имеют постоянного доступа.

## Artifacts

```text
setup.exe
setup.exe.sig
latest.json
checksums.txt
sbom.cdx.json
THIRD-PARTY-NOTICES.txt
CHANGELOG.md
```

## Rollback/recovery

Automatic rollback не предполагается без собственной реализации. Сохраняются backup сейва, previous installer reference и first-launch health marker. При failed update доступен Safe Mode и manual downgrade, если schema совместима.

## Release gate

Полный migration corpus, desktop E2E, installer smoke, signature verification, backup/restore и update from previous supported version.