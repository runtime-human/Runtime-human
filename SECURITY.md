# Security Policy

Runtime Human находится в ранней разработке, а репозиторий является публичным. Issues, pull requests, Actions logs, comments и обычные attachments следует считать публичными по умолчанию.

## Reporting

Не публикуйте потенциальную уязвимость, secret, exploit details или чувствительный proof of concept в обычном issue.

Если во вкладке **Security** доступно **Report a vulnerability**, используйте этот приватный GitHub reporting flow. Наличие этой кнопки зависит от включённого для репозитория Private vulnerability reporting и не предполагается автоматически.

Если приватный GitHub reporting flow временно недоступен, создайте только минимальный публичный запрос на безопасный канал связи — без exploit details, credentials, private paths, реальных save data и чувствительных логов. Maintainer должен перевести дальнейшее обсуждение в приватный канал до передачи технических деталей.

В приватном отчёте укажите:

- affected version/commit;
- минимальные reproduction steps;
- impact;
- proof of concept без реальных пользовательских данных;
- suggested mitigation, если известна.

## Scope

Особенно важны:

- повреждение или утечка сейвов;
- bypass Tauri capabilities;
- malicious mod/import archives;
- updater/signature issues;
- path traversal;
- XSS/rich-content injection;
- release secret exposure;
- CI/log disclosure of credentials, private data, personal usernames, self-hosted runner identity или personal/local absolute paths.

## Public CI and evidence

Обычный CI выполняется на GitHub-hosted runners с минимальными permissions. Public verification evidence должна быть минимальной и repository-relative, когда это возможно.

Self-hosted или физические evidence runners, если они когда-либо потребуются для специализированных измерений, не являются частью обычного workflow для недоверенных pull requests. Их machine identity, домашние пути и private environment state не должны попадать в публичную evidence.

## Supported versions

До первого публичного релиза отдельного supported-version promise нет. Для отчёта указывайте точный commit или версию, на которой проблема воспроизводится.

## Response

Security findings используют общую severity taxonomy из `.studio/finding-contract.md`. `S0` и `S1` security findings блокируют release. Исправление сопровождается regression test, recovery assessment и согласованным disclosure без преждевременной публикации exploitable details.
