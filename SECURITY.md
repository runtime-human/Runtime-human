# Security Policy

Runtime Human находится в ранней приватной разработке.

## Reporting

Не публикуйте потенциальную уязвимость в открытом issue. Сообщите владельцу приватного репозитория с описанием:

- affected version/commit;
- reproduction steps;
- impact;
- proof of concept без реальных пользовательских данных;
- suggested mitigation, если известна.

## Scope

Особенно важны:

- повреждение/утечка сейвов;
- bypass Tauri capabilities;
- malicious mod/import archives;
- updater/signature issues;
- path traversal;
- XSS/rich-content injection;
- release secret exposure.

## Response

До публичного релиза сроки реакции не гарантируются, но P0/P1 findings блокируют release. Security fix сопровождается regression test, recovery assessment и release note без раскрытия exploit details до исправления.