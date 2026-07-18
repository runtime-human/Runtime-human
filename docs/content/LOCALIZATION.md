---
title: "Локализация"
type: content
status: draft
canon: true
updated: 2026-07-18
---

# Локализация

## Baseline

Основной язык разработки контента — русский. Архитектура с первого дня поддерживает дополнительную английскую локализацию без хранения пользовательского текста в domain definitions.

## Правила

- Контент содержит localization keys, а не готовые строки.
- Форматирование чисел, дат и валют выполняется UI formatter.
- Plural/gender/context поддерживаются ICU-compatible сообщениями.
- Stable IDs и schema discriminators не локализуются.
- Исторические собственные названия сохраняют принятую форму и могут иметь localized display variant.

## Структура ключей

```text
event.conference.first_talk.title
event.conference.first_talk.body
choice.accept
technology.python.name
company.byteforge.description
```

## Rich text

Разрешён ограниченный безопасный markup/structured message model. Raw HTML и script запрещены. Links открываются только через проверенный platform action.

## QA

- missing key check;
- unused key report;
- placeholder consistency;
- ICU parse validation;
- pseudo-localization;
- expansion tests;
- Cyrillic font coverage;
- screenshots с длинными строками;
- правильные формы 1/2/5 для русского.

## User-generated names

Имя персонажа, проектов и компаний хранится отдельно от localization и экранируется при выводе. Оно не используется как ключ, путь или SQL identifier.

## Historical text

Source citations и factual notes отделены от художественного текста. Перевод не должен менять подтверждённый смысл даты или release status.