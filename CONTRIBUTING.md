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

Для solo-maintainer PR требование human review означает: владелец перечитал final diff на текущем head, текущие обязательные gates зелёные, blocking findings отсутствуют или явно dispositioned, а merge является отдельным явным owner decision. Собственное GitHub approval не используется как фиктивная замена независимого review.

## Комментарии в коде

Предпочитать ясные имена, типы, API и структуру вместо комментариев, которые просто пересказывают соседнюю строку кода.

Комментарий нужен, когда он сохраняет информацию, которую код сам по себе выражает плохо:

- почему очевидно более простая реализация неверна;
- deterministic, persistence, concurrency, lifecycle или ordering invariant;
- security/capability assumption и угрозу, которую предотвращает guard;
- compatibility/migration constraint;
- исторический/content provenance constraint;
- намеренную асимметрию между похожими путями;
- измеренный performance trade-off, оправдывающий дополнительную сложность.

Не хранить в source comments историю review, переписку с агентом или пошаговый reasoning transcript. Комментарий должен объяснять **текущую причину**, почему код обязан оставаться таким; историю изменений хранит Git.

Для exported/public API документировать неочевидные preconditions, postconditions, ownership/lifecycle, failure semantics и compatibility obligations. Не добавлять церемониальный JSDoc к очевидному API только ради покрытия документацией.

Не использовать бесконтекстные `TODO: fix later` или `FIXME`. Отложенная работа должна ссылаться на Issue и содержать условие удаления/активации, например:

```ts
// TODO(#123): Remove the compatibility adapter after save schema v2 is no longer supported.
```

`FIXME` допустим только для известного дефекта, который нельзя принять за обычный future enhancement.

## Обязательный ADR

Новый ADR требуется для изменения календаря, географии, backend/distribution model, persistence boundary, deterministic primitives, save consistency, content API и других системных решений.

## Sensitive changes

Human review обязателен для workflows, GitHub governance, Tauri capabilities, persistence/migrations, updater/signing, canonical historical dates, licenses и destructive content ID changes.

Нельзя ослаблять тест, security boundary, capability или required check только ради прохождения CI.

## Public CI и логи

GitHub Actions, PRs, issues и вложенная verification evidence в публичном репозитории считаются **публичными данными**.

Не публиковать и не выводить без необходимости:

- secrets, tokens, cookies, credentials и значения environment secrets;
- personal usernames, домашние каталоги и personal/self-hosted absolute paths;
- имена домашних/self-hosted runner-машин и локальные `_work` paths;
- private project paths, реальные пользовательские данные или содержимое сейвов;
- полные environment dumps и необрезанные диагностические логи.

Стандартные ephemeral paths GitHub-hosted runner сами по себе не считаются приватной machine identity; всё равно предпочитайте repository-relative paths и минимальную evidence.

`pnpm public:check` механически ловит известные классы repository-identity и personal-path regressions в tracked text. Это дополнительный guard, а не замена secret scanning или review.

Self-hosted runners не используются обычным public CI. Если когда-либо потребуется отдельный физический/evidence runner, он должен быть opt-in, изолирован от стандартного PR workflow и не принимать недоверенный fork-код.

## Security reports

Потенциальные уязвимости, secrets и sensitive evidence не публикуются в обычных issues. Следовать `SECURITY.md`; если private reporting недоступен, публично запрашивать только безопасный канал связи без технических деталей уязвимости.

## Завершение

Документация, schemas, tests и implementation обновляются синхронно, если меняется их общий контракт. Перед merge проверить final diff, актуальный CI, unresolved review threads и отсутствие sensitive данных в публичной evidence.
