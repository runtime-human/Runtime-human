---
title: "NPC и narrative memory"
type: events
status: draft
canon: true
depends_on: [ADR-013, ADR-017]
updated: 2026-07-18
---

# NPC и narrative memory

Связанные спецификации:

- [Professional Progression Engine](../game-design/PROFESSIONAL-PROGRESSION-ENGINE.md);
- [Programmer Learning Engine](../game-design/PROGRAMMER-LEARNING-ENGINE.md);
- [ADR-013](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [ADR-017](../adr/ADR-017-authoritative-programmer-learning-access-model.md).

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

## Mentoring и learning opportunities

NPC/provider определяет authoritative facts:

- доступность mentor;
- subject/domain/technology fit;
- teaching/feedback traits;
- качество и timing feedback;
- допустимый объём помощи;
- возможность pair work;
- relationship/professional trust requirement;
- стоимость времени или обязательств;
- downstream learner outcome.

Programmer Learning Engine получает immutable feedback/availability snapshot. Он не изменяет relationship или professional trust напрямую.

Progression Core использует assistance/feedback внутри `ExperienceEpisode`.

### Assistance modes

```text
hint
→ conceptual explanation
→ guided walkthrough
→ pair work
→ takeover
```

Правила:

- `hint` указывает направление и обычно сохраняет больше autonomy;
- explanation может значительно повысить mastery без delivery evidence;
- guided walkthrough подтверждает guided practice, не solo capability;
- pair work создаёт shared result и может дать сильный learning;
- takeover может завершить provider goal, но даёт минимальное подтверждение самостоятельности;
- помощь может повысить learning и снизить autonomy evidence одновременно;
- один mentor не создаёт mastery/grade напрямую;
- mentoring evidence наставника возникает только при traceable результате ученика или sustained contribution;
- repeated trivial help агрегируется и не фармится как leadership evidence.

## Mentor opportunity contract

```ts
type MentorLearningOpportunitySnapshot = Readonly<{
  personId: PersonId;
  relationId: RelationshipId;
  subjectFit: SubjectFitBand;
  feedbackQuality: FeedbackQualityBand;
  availability: AvailabilityBand;
  allowedAssistanceModes: readonly AssistanceMode[];
  trustRequirement?: ProfessionalTrustBand;
  timeCostBand: CostBand;
  obligationRisk?: ObligationRiskBand;
  fingerprint: ContextFingerprint;
}>;
```

Snapshot является projection. Learning Engine не создаёт или не редактирует NPC/relationship state.

## Mentorship access and recovery

Отсутствие mentor не блокирует весь programmer path.

Content/provider обязан предложить хотя бы один альтернативный route, когда mentor является единственным feedback source:

- self-check или worked example;
- school/club teacher;
- peer/pair;
- community/forum/BBS where historically available;
- delayed retry;
- simpler independent practice;
- project with bounded failure/recovery.

Один конкретный mentor не является обязательным для достижения грейда.

## Mentor quality and bad advice

Mentor может быть:

- сильным в технологии, но слабым преподавателем;
- хорошим объясняющим, но устаревшим в practices;
- доступным редко;
- полезным только для определённого domain;
- конфликтным или чрезмерно контролирующим.

Это создаёт contextual trade-offs, но не случайный flat bonus/penalty.

Obsolete/misleading feedback должен иметь player-facing reason и recovery. Ошибка mentor не может тайно навсегда повредить mastery или save.

## Code review

Review memory хранит:

- review context;
- принятые/отклонённые предложения;
- downstream quality/result;
- конфликт/доверие;
- mentoring effect;
- assistance mode;
- learner articulation/reflection where relevant.

Сам факт комментария не создаёт strong review/leadership evidence. Нужен meaningful contribution и downstream effect.

## Pair learning

Pair work хранит:

- partner PersonId;
- shared learning/project context;
- role/contribution summary;
- assistance symmetry;
- observable artifact/outcome;
- later solo transfer result when it occurs.

Shared success не становится solo capability автоматически. Later independent application может использовать pair history как learning context, но требует собственного outcome.

## Professional trust

Professional trust отличается от общей близости relationship.

Он может влиять на:

- доступ к сложным задачам;
- готовность делегировать;
- качество/частоту feedback;
- referral/recommendation;
- участие в open-source governance;
- incident/leadership events;
- доступ к mentor review or equipment/community route.

Professional trust не заменяет capabilities и не повышает grade напрямую.

## Promotion/demotion tiers

NPC повышается до active при попадании в важную цепочку, mentoring relation, устойчивые отношения или critical shared project. Уход из активного окружения переводит его в background/archived после сохранения нужной истории.

Evidence и learning artifact history хранят PersonId/semantic role snapshot, поэтому archival NPC не делает прошлое evidence невалидным.

## Генерация

NPC generation deterministic, использует era/city/organization profiles и отдельный RNG stream. Имена локализуемы и не должны повторяться в активном круге без намерения.

Mentor/colleague generation дополнительно учитывает:

- professional stage;
- technology/domain compatibility;
- teaching/feedback traits;
- availability;
- subject fit;
- assistance style;
- organization/team/community context;
- relationship/narrative diversity.

Generator не гарантирует ideal mentor. Он обязан сохранять альтернативные learning/access routes.

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
- NPC title не определяет professional grade персонажа;
- mentor availability/quality truth принадлежит NPC/provider, не Learning Engine;
- assistance mode всегда отражается в learning/episode semantics;
- pair/takeover не превращаются в solo capability;
- отсутствие mentor не создаёт permanent professional soft lock.

## Privacy

NPC полностью вымышлены. Игра не импортирует реальные контакты пользователя и не использует внешние персональные данные.