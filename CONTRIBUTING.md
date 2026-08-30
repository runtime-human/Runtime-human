# Contributing

Runtime Human — публичный репозиторий. Изменения делаются небольшими, проверяемыми и независимо ревьюируемыми срезами через branch/worktree и pull request.

## Перед работой

1. Прочитать `AGENTS.md`.
2. Найти relevant ADR и профильную спецификацию через `docs/INDEX.md`.
3. Определить затронутую zone/risk и требуемый verification tier.
4. Создать отдельную branch/worktree. Не вести существенную работу напрямую в `main`.

## Commit и PR title

Рабочие commits могут быть мелкими и удобными для разработки. Долговечной записью изменения считается **PR title**, потому что он должен использоваться как итоговый squash commit message.

Формат:

```text
<type>(<scope>): <summary>
<type>: <summary>
```

Разрешённые `type`: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `chore`.

`scope` необязателен и должен быть узким. Предпочтительные scopes: `core`, `application`, `content`, `simulation`, `persistence`, `desktop`, `ui`, `studio`, `docs`, `ci`, `governance`.

Примеры:

```text
feat(simulation): add deterministic scenario comparison
fix(persistence): preserve recovery state after failed commit
ci: move verification to GitHub-hosted runners
```

Не использовать расплывчатые заголовки вроде `updates`, `fix stuff`, `WIP` для PR, готового к merge. Автоматический `pr-title` check проверяет форму заголовка; смысл и корректность scope остаются предметом review.

## Pull request contract

PR — каноническая единица изменения. Он должен содержать:

- один независимо ревьюируемый scope;
- relevant issue/ADR/specification;
- affected contracts и save/content/ruleset impact;
- точную verification evidence в форме `command → result`;
- риски, migration/rollback/recovery impact;
- player/user impact для пользовательских изменений;
- явно отмеченные проверки, которые **не запускались**.

Не заявлять `passed`, `verified`, `fixed` или `complete`, если соответствующая проверка фактически не выполнялась на текущем коде.

## Review comments

Для actionable review-комментариев используем семантические префиксы:

- `blocking:` — проблема должна быть исправлена или явно разрешена до merge;
- `suggestion:` — улучшение, не блокирующее текущий PR;
- `question:` — запрос контекста/обоснования; сам по себе не блокирует merge, пока не преобразован в `blocking:`;
- `nit:` — косметическое замечание, не блокирующее merge.

Перед merge все `blocking:` threads должны быть закрыты на актуальном head. Старое одобрение не считается доказательством для существенно изменившегося diff; при значимых правках требуется fresh review соответствующей зоны риска.

## Обязательный ADR

Новый ADR требуется для изменения календаря, географии, backend/distribution model, persistence boundary, deterministic primitives, save consistency, content API и других системных решений.

## Sensitive changes

Human review обязателен для workflows, GitHub governance, Tauri capabilities, persistence/migrations, updater/signing, canonical historical dates, licenses и destructive content ID changes.

Нельзя ослаблять тест, security boundary, capability или required check только ради прохождения CI.

## Public CI и логи

GitHub Actions, PRs, issues и вложенная verification evidence в публичном репозитории считаются **публичными данными**.

Не публиковать и не выводить без необходимости:

- secrets, tokens, cookies, credentials и значения environment secrets;
- usernames, домашние каталоги и абсолютные локальные пути (`C:\\Users\\...`, `/home/...`);
- имена домашних/self-hosted runner-машин и локальные `_work` paths;
- приватные project paths, реальные пользовательские данные или содержимое сейвов;
- полные environment dumps и необрезанные диагностические логи.

Предпочитать repository-relative paths, короткие error excerpts и структурированную redacted evidence. `--nocapture`, verbose/debug tracing и полные log uploads допустимы только когда это действительно требуется для диагностики и вывод предварительно проверен на чувствительные данные.

Self-hosted runners не используются обычным public CI. Если когда-либо потребуется отдельный физический/evidence runner, он должен быть opt-in, изолирован от стандартного PR workflow и не принимать недоверенный fork-код.

## Security reports

Потенциальные уязвимости, secrets и sensitive evidence не публикуются в обычных issues. Следовать `SECURITY.md` и использовать приватный security reporting channel.

## Завершение

Документация, schemas, tests и implementation обновляются синхронно, если меняется их общий контракт. Перед merge проверить final diff, актуальный CI, unresolved review threads и отсутствие sensitive данных в публичной evidence.
