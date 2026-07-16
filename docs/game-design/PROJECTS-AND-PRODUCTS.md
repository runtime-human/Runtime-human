# Проекты и продукты

## Project base model

Общие поля проекта:

- kind;
- scope;
- requirements;
- technologies;
- progress work units;
- quality dimensions;
- technical debt;
- bugs;
- maintainability;
- deadline;
- participants;
- release history;
- audience;
- economic model.

## Виды

- рабочий проект;
- freelance contract;
- pet project;
- research project;
- open-source project;
- коммерческий продукт/SaaS.

Специализированные подсистемы расширяют базовую модель, а не копируют отдельные несовместимые Project-типы.

## Длительность

Проект не расходует единый action slot. Он получает work units от персонажа, команды, contributors или автоматизации. Несколько проектов разрешены, но context switching и обязательства уменьшают скорость.

## Качество

Качество многомерно:

- functional correctness;
- UX;
- performance;
- reliability;
- security;
- documentation;
- maintainability.

Одна абстрактная шкала «качество 100» недостаточна для событий и последствий.

## Релиз

Release является отдельной неизменяемой записью с version, scope, known issues, quality snapshot, marketing/support decisions и результатом запуска.

## Продукт

Коммерческий продукт дополнительно хранит:

- users и active users;
- pricing model;
- revenue и operating cost;
- support load;
- churn;
- market fit;
- brand/reputation;
- competitors;
- legal/operational risks в упрощённом виде.

## Failure states

Проект может быть заморожен, отменён, передан, продан, архивирован или закрыт. Неудача сохраняется в истории и может дать опыт, репутационный урон или новый narrative arc.

## Историческая связь

Доступные project kinds, distribution channels и monetization patterns зависят от эпохи. SaaS не должен выглядеть одинаково в 1995 и 2015 году.