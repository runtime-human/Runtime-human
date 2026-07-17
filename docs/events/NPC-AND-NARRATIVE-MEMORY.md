# NPC и narrative memory

Связанные спецификации: [Professional Progression Engine](../game-design/PROFESSIONAL-PROGRESSION-ENGINE.md) и [ADR-013](../adr/ADR-013-authoritative-professional-progression-evidence.md).

## Уровни NPC

### Active

Полное состояние для партнёра, руководителя, близкого коллеги, co-founder, ключевого maintainer, mentor/mentee и других участников регулярных событий.

### Background

Сокращённое состояние: identity, role, organization, traits, relationship summary, professional trust summary и last seen.

### Archived

Историческая запись после выхода из активной среды. Archived NPC сохраняет stable ID и ключевые связи для журнала, evidence context и будущих возвращений.

## PersonState

Содержит:

- PersonId;
- identity и birth date;
- status/tier;
- traits;
- role и organization;
- location context;
- relationship refs;
- narrative memory;
- professional memory summary;
- current availability.

NPC professional grade/title может существовать как его собственный world state, но evidence персонажа не выводится из статуса NPC автоматически.

## Narrative memory

Memory хранит только значимые typed facts:

- общие проекты;
- обещания;
- конфликты;
- помощь;
- увольнение/переход компании;
- семейные события;
- unresolved hooks.

Она не является свободным LLM-текстом и представлена typed records с source event/history ID.

## Professional memory

Professional memory хранит контекст, необходимый для событий и provider outcomes:

- mentor/mentee relation;
- code review history;
- shared project/work package;
- technical trust;
- assistance history;
- delegated responsibility;
- joint incident/release;
- professional conflict/resolution;
- recommendation/referral;
- teaching/learning outcome;
- ownership/succession transition.

Пример typed fact:

```ts
type ProfessionalMemoryFact = Readonly<{
  id: ProfessionalMemoryFactId;
  personId: PersonId;
  kind: ProfessionalMemoryKind;
  sourceRef: HistoryRecordRef;
  relatedProjectId?: ProjectId;
  relatedTaskId?: ProfessionalTaskId;
  evidenceIds?: readonly ProfessionalEvidenceId[];
  strength: MemoryStrength;
  occurredAt: GameDate;
  expiresAt?: GameDate;
}>;
```

## Mentoring и помощь

NPC/provider определяет:

- доступность mentor;
- качество feedback;
- объём помощи;
- совместную работу;
- downstream learner outcome.

Progression Core использует assistance/feedback внутри `ExperienceEpisode`.

Правила:

- помощь может повысить learning;
- помощь снижает autonomy evidence пропорционально фактическому участию;
- один mentor не создаёт mastery/grade напрямую;
- mentoring evidence наставника возникает только при traceable результате ученика или sustained contribution;
- repeated trivial help агрегируется и не фармится как leadership evidence.

## Code review

Review memory хранит:

- review context;
- принятые/отклонённые предложения;
- downstream quality/result;
- конфликт/доверие;
- mentoring effect.

Сам факт комментария не создаёт strong review/leadership evidence. Нужен meaningful contribution и downstream effect.

## Professional trust

Professional trust отличается от общей близости relationship.

Он может влиять на:

- доступ к сложным задачам;
- готовность делегировать;
- качество/частоту feedback;
- referral/recommendation;
- участие в open-source governance;
- incident/leadership events.

Professional trust не заменяет capabilities и не повышает grade напрямую.

## Promotion/demotion tiers

NPC повышается до active при попадании в важную цепочку, mentoring relation, устойчивые отношения или critical shared project. Уход из активного окружения переводит его в background/archived после сохранения нужной истории.

Evidence хранит PersonId/semantic role snapshot, поэтому archival NPC не делает прошлое evidence невалидным.

## Генерация

NPC generation deterministic, использует era/city/organization profiles и отдельный RNG stream. Имена локализуемы и не должны повторяться в активном круге без намерения.

Mentor/colleague generation дополнительно учитывает:

- professional stage;
- technology/domain compatibility;
- organization/team context;
- teaching/feedback traits;
- availability;
- relationship/narrative diversity.

## Invariants

- стабильный PersonId;
- один current employer;
- relationships симметричны там, где это требуется типом;
- event participant существует;
- archived NPC не получает регулярные daily updates;
- narrative/professional facts ссылаются на существующее event/history record;
- evidence PersonId может ссылаться на archived NPC;
- assistance history не создаёт duplicate evidence;
- professional trust не создаёт mastery/grade;
- mentoring evidence требует learner/downstream outcome;
- NPC title не определяет professional grade персонажа.

## Privacy

NPC полностью вымышлены. Игра не импортирует реальные контакты пользователя и не использует внешние персональные данные.
