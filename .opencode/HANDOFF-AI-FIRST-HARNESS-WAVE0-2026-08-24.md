# HANDOFF — Runtime Human «AI-First Game Development Harness»: реализация Wave 0

Дата: 2026-08-24 · Репозиторий: `C:\Reposit\Runtime-human` (main @ `a364fc97…`, PR #80)
Следующая сессия: реализовать **Wave 0** плана (см. §4), затем отчитаться по контракту задачи.

---

## 1. Источники (не дублируются здесь)

- План (master blueprint, 4400 строк): `.opencode/Runtime-Human-AI-First-Game-Development-Implementation-Plan-2026-08-24.md`
  - Волны и PR-серия: §48–§50. Приоритеты P0–P3: §54.
  - Целевой шаблон AGENTS.md: §5.3. GAME.md дополнения: §6.
  - Skill checker: §9. Context Map v2 + envelope: §10. Verification tiers: §12.
  - Зависимости новых зон: §44. Антипаттерны: §53. Self-review чеклист: §56.
- Контракт воркера и формат завершения: `.studio/task-contract.md` (блок `DONE|BLOCKED|FAILED …`).
- Правила репо: `AGENTS.md` (текущий полный), `GAME.md`, `docs/INDEX.md`.

Владелец разрешил ослаблять церемонию контракта воркера. Субагенты в сессии недоступны
(нет инструмента; в репо `task: deny`, `subagent_depth: 0`) — работать напрямую;
параллелизация позже только через Orca (`maxWorkers=3`, DAG по границам авторитета, §49 плана).

## 2. Факт: ничего не написано

Прошедшая сессия = анализ плана + разведка репо. **Ни один файл не изменён.**
Pre-existing грязное дерево (НЕ трогать, не коммитить, не считать своими):
`M .gitattributes`, `M .studio/findings/ledger.jsonl`, `M .studio/producer.md`,
`M gamestudio/START_PROMPT.md`, `?? .agents/skills/runtime-producer/`,
`?? .opencode/Runtime-Human-AI-First-…Plan-2026-08-24.md` (сам план) и этот хэндофф.

Запреты: без merge/push/commit; канон не переписывать содержательно (зона canon в
`.studio/zones.json` имеет `ownerReview: true` — отметить в отчёте, что AGENTS.md/GAME.md/docs
требуют owner review перед merge).

## 3. Разведанные факты репо (критично для реализации)

- `package.json`: `studio:check` = `node scripts/studio/check-config.mjs`; `docs:check` =
  `node scripts/build-toc.mjs --check`; `fmt`/`fmt:check`/`lint` уже покрывают `scripts/studio`.
  Node >=24 <25, pnpm 11.11.0, TypeScript 7.0.2, Vitest 4.1.10, oxlint/oxfmt.
- `scripts/studio/check-config.mjs` жёстко сверяет **зоны двусторонне**: каждый id из
  `.studio/zones.json` обязан быть в `.studio/context-map.json.zones` и наоборот. Новые зоны
  добавлять **в оба файла одним изменением**, иначе `studio:check` падает. Он также проверяет
  models.json/opencode.json/finding-policy.json, JSONL-леджеры и наличие файлов из списка
  `required` (список можно расширить новыми конфигами/доками — это forcing function).
- `scripts/build-toc.mjs`: каждый `docs/**/*.md` обязан иметь frontmatter
  `title/type/status/canon/updated`; type выводится из каталога (`architecture`→architecture,
  `engineering`→engine, `agents`→agent); статус по умолчанию `draft`; допустимые:
  accepted/draft/superseded/proposed/completed; `depends_on` — только существующие `ADR-###`.
  `docs/MANIFEST.jsonc` + `docs/CATALOG.md` генерируются детерминированно: после добавления
  доков выполнить `node scripts/build-toc.mjs` (без --check), затем `pnpm docs:check`.
- `.studio/zones.json`: core(R2)/persistence(R3)/content(R2)/application(R2)/ui(R1)/
  qa-performance(R1)/canon(R2,ownerReview). `exclusiveWriteGroups`:
  [core,persistence],[canon,core],[canon,persistence].
- Скиллы на диске (8): runtime-architecture/-content/-implement/-producer(untracked!)/
  -qa/-review/-test/-ui. Frontmatter SKILL.md: `name/description/compatibility`.
  Образец стиля: `.agents/skills/runtime-implement/SKILL.md` (13 строк).
- Стиль studio-скриптов: plain ESM `.mjs`, `node:fs/node:path`, ошибки копятся в массив,
  при провале exit 1 + список, успех — одна строка «OK». См. `check-config.mjs`, `route.mjs`.
- `docs/agents/QA-AGENT.md` НЕ содержит MVP-gameplay verification matrix из AGENTS.md —
  при сжатии AGENTS.md перенести матрицу туда новой секцией (знание не терять).
- Формат «completion report» уже живёт в `.studio/task-contract.md` — в AGENTS.md оставить
  только указатель.
- `docs/EXECUTION-STATUS.jsonc`: `_schemaVersion` 1, поля updated/implementationProfile/
  mainHeadAt*/currentPhase/milestones[] — перед правкой прочитать хвост файла.

## 4. ЗАДАЧА: Wave 0 — Canon/AI harness alignment (план §48 «Wave 0»)

### Создать

1. `.studio/skill-map.json` — реестр: name → `{path, status: active|planned, activation}`.
   active = 8 существующих; planned: balance/scenario/simulation/persistence/harness
   (активация после соответствующих волн; план §8.8–8.12, W9).
2. `.studio/verification-policy.json` — tier'ы V0(edit-loop)/V1(worker affected)/V2(PR
   candidate)/V3(full gate = `pnpm verify`)/V4(release = `pnpm verify:release`) + adaptive
   review policy из §35.2 (класс изменения → deterministic gate / tester / reviewer /
   cross-family). Ключи evaluator-профилей должны совпадать с `.studio/models.json`
   (lunaTester/lunaReviewer/r3Reviewer/crossFamilyReviewer).
3. `docs/architecture/AI-FIRST-GAME-DEVELOPMENT.md` — целевая архитектура харнесса: классы
   артефактов (presentation/content/balance/scenario/rule), принципы P-01…P-10 (§2), роли
   Orca/Studio/Nx/gamectl/compiler/simulation/Storybook, правила зависимостей пакетов (§44),
   запреты §53. Статус draft, canon true. Planned инструменты не выдавать за существующие.
4. `docs/engineering/VERIFICATION-TIERS.md` — V0–V4 (§12) с честным маппингом на текущие
   скрипты (V3=`verify`, V4=`verify:release`; studio:affected/exec — planned).
5. `docs/engineering/AGENT-EVALS.md` — eval suite (§39): 10 representative tasks, измеряемые
   поля, golden task policy. Статус planned/P2.
6. `scripts/studio/check-skills.mjs` — валидатор скиллов (§9): YAML frontmatter обязателен
   (name/description непустые, compatibility); dirname == name; имена уникальны; описания
   попарно различаются; SKILL.md ≤ 180 строк; упомянутые backtick-пути репо существуют;
   упомянутые `pnpm <script>` есть в package.json; кросс-чек с skill-map.json
   (диск↔карта в обе стороны; planned на диске существовать не обязаны). Exit 1 + список
   ошибок, иначе `Skills OK (<n>)`. Пути нормализовать (Windows!). Без новых зависимостей.

### Изменить

7. `AGENTS.md` — сжать до ~100–140 строк по шаблону §5.3: Product capsule; Authority order;
   Hard architecture boundaries (сохранить: чистый game-core без React/Tauri/SQLite/fs/
   network/system-time; seeded versioned PRNG; integer/fixed-point arithmetic; compiled
   content — не runtime JSONC/Ajv; Rust-owned single-writer persistence; renderer без raw SQL;
   stable ID tombstone review; provenance; Storybook dev-only без production Tauri permissions;
   Playwright=renderer / WebdriverIO=executable; SQLite 3.51.3+/WAL; MonthRun crash-safe);
   Repository map; Task workflow; Tool router (Nx+studio:affected и gamectl пометить planned);
   компактный Skill router (только 8 существующих); Security; Owner gate; Change gates одной
   строкой (branch/PR, ADR, schema migration assessment, tombstone, source review, dependency
   rationale, code+docs together); указатели: MVP verification matrix → QA-AGENT.md;
   completion report → task-contract.md; зонные инварианты → docs/game-design/* +
   ADR-013…018 + docs/agents/*. НИ ОДНОГО знания не удалить без нового дома. Проверить размер.
8. `docs/agents/QA-AGENT.md` — новая секция «MVP gameplay verification» = полный перенесённый
   список из AGENTS.md (comprehension; 10–20s decision; 2–4 approaches; no dominant approach;
   learning source/access/assistance comprehension; guided vs independent; low-access recovery;
   monthly causality; bounded visible concepts; no duplicate/reroll; assisted/partial/failure;
   project trade-off; first-month recovery; career opportunity/offer comprehension; title vs
   grade; gap vs employer cancellation; rejection/layoff/re-entry recovery;
   salary/referral/credential non-dominance; routine aggregation + workplace trust;
   accessibility/long RU; desire to continue). Обновить `updated`.
9. `GAME.md` — добавить секции «Core loop» и «Explicit non-goals» (текст §6 плана).
10. `docs/agents/README.md` — таблица-роутер задача→skill→guide→tool (план §7), ТОЛЬКО
    существующие скиллы/гайды; planned строки помечать `(planned)`. Обновить `updated`.
11. `docs/agents/AGENT-WORKFLOW.md` — малая правка: сослаться на VERIFICATION-TIERS.md и
    skill router в agents/README.md; обновить `updated`.
12. `.studio/context-map.json` + `.studio/zones.json` ОДНИМ изменением — новые зоны:
    `balance` (paths `balance/**`, minRisk R2, promoteToR3On: перенос авторитетного алгоритма
    из Core), `scenario` (paths `content/**/scenarios/**`, minRisk R2), `simulation`
    (paths `packages/game-simulation/**`, `fixtures/**`, minRisk R2), `tooling`
    (paths `.studio/**`, `.agents/skills/**`, `scripts/studio/**`, `nx.json`, minRisk R1).
    В context-map у новых зон agentGuide = `docs/agents/ARCHITECT-AGENT.md` до появления
    профильных гайдов. Перекрытие content/** ↔ scenarios чекер не ловит; route.mjs берёт зону
    явно — приемлемо.
13. `.studio/producer.md` — «First reads» += verification-policy.json, skill-map.json;
    «Verification and gates» += ссылка на VERIFICATION-TIERS.md. Файл уже содержит чужие
    незакоммиченные правки — минимальный дифф поверх.
14. `docs/EXECUTION-STATUS.jsonc` — `updated`=2026-08-24;
    `mainHeadAtCurrentSliceStart`=`a364fc97b4e0f86c99c850abbfa44b2db1608ff6`;
    `currentPhase`=`ai-first-harness-foundation`; milestone `ai-first-harness-wave0`
    (status in-progress). Прочитать хвост перед правкой.
15. `package.json` — `"studio:skills:check": "node scripts/studio/check-skills.mjs"`;
    `"studio:check"` = `node scripts/studio/check-config.mjs && node scripts/studio/check-skills.mjs`.
16. `scripts/studio/check-config.mjs` — расширить `required` новыми файлами (.studio/skill-map.json,
    .studio/verification-policy.json, три новых дока); лёгкие ассерты: verification-policy
    содержит tiers V0–V4; skill-map парсится и ссылки активных скиллов существуют.

## 5. Верификация (focused; полный verify НЕ нужен для docs/config-батча)

```bash
node scripts/build-toc.mjs        # регенерация MANIFEST/CATALOG после новых доков
pnpm studio:skills:check          # новый чекер
pnpm studio:check                 # конфиги + скиллы
pnpm docs:check                   # frontmatter + производные индексы
oxfmt --check scripts/studio/check-skills.mjs && oxlint scripts/studio/check-skills.mjs
git diff --stat                   # самопроверка: только заявленные файлы
```

Acceptance Wave 0 (план §48): агент, читая только AGENTS.md + GAME.md, понимает что за игра,
где authority, куда идти по типу задачи, какую skill/tool использовать, что запрещено — без
десятков страниц domain-detail; все ссылки/скиллы роутеров существуют (механически проверяет
новый чекер); AGENTS.md стал короче, знание перенесено, а не удалено; `pnpm check:fast`
проходят студийные/доковые шаги.

## 6. Отчёт по завершении

Вернуть компактный блок из `.studio/task-contract.md`: DONE/BLOCKED; Changed; Acceptance по
критериям; Verification command→exit; Authority impact (= canon-zone правки AGENTS/GAME/docs
требуют owner review перед merge); Migration/content-ID impact = none; Risks; Question.
Не коммитить, не пушить.

## 7. После Wave 0 (следующие батчи по приоритету §54)

- Wave 1: `scripts/studio/task.mjs`, `context-lib.mjs` + task envelope v1 (§10); тесты на
  Windows-пути/детерминизм порядка/бюджеты контекста.
- Wave 2: `exec.mjs` (compact logs в `.studio/runtime/logs/<run>/`), `affected.mjs`,
  `verify.mjs` (tiers как команды).
- Далее (§48): Nx minimal → Vitest projects + Storybook browser → Game Catalog + gamectl
  (`packages/game-devtools`) → TypeBox pilot → balance pilot → simulation/fast-check/repro →
  skills v2 + adaptive review → scenario v1 → Authoring Studio (P2) → DTCG tokens.
- Параллелить после Wave 1–2 можно только потоки A(Nx/perf) / B(Storybook) / C(catalog/schema)
  и НИКОГДА одновременно: game-schema authority, compiler public contracts, January rule
  contracts, persistence schema (§49).

## Suggested skills для следующей сессии

1. Skill: `runtime-implement` (загрузить первой вместе с чтением AGENTS.md/GAME.md).
2. При архитектурных спорах о харнессе: Skill: `runtime-architecture`.
3. Этот документ уже следует формату skill `handoff` — повторно не загружать.
