# Security Policy

Runtime Human находится в ранней разработке, а репозиторий является публичным. Поэтому issues, pull requests, Actions logs, comments и обычные attachments следует считать публичными по умолчанию.

## Reporting

Не публикуйте потенциальную уязвимость, secret или чувствительный proof of concept в обычном issue.

Используйте приватный GitHub security reporting channel, доступный через вкладку **Security** репозитория. Если private vulnerability reporting временно недоступен, свяжитесь с владельцем проекта приватным каналом до публикации технических деталей.

В отчёте укажите:

- affected version/commit;
- минимальные reproduction steps;
- impact;
- proof of concept без реальных пользовательских данных;
- suggested mitigation, если известна.

Не прикладывайте credentials, реальные save data, полные environment dumps или необработанные логи с локальными данными.

## Scope

Особенно важны:

- повреждение или утечка сейвов;
- bypass Tauri capabilities;
- malicious mod/import archives;
- updater/signature issues;
- path traversal;
- XSS/rich-content injection;
- release secret exposure;
- CI/log disclosure of credentials, private data, usernames, runner hostnames or local absolute paths.

## Public CI and evidence

Обычный CI должен выполняться на GitHub-hosted runners с минимальными permissions. Public logs и verification evidence должны использовать repository-relative paths и минимальный необходимый diagnostic output.

Self-hosted или физические evidence runners, если они когда-либо потребуются для специализированных измерений, не должны быть частью обычного workflow для недоверенных pull requests и не должны раскрывать домашние пути, machine identity или private environment state.

## Response

P0/P1 findings блокируют release. Security fix сопровождается regression test, recovery assessment и release note без раскрытия exploitable details до исправления и согласованного disclosure.
