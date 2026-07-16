# Documentation review checklist

## Канон

- [ ] Январь 1990, возраст 12 лет.
- [ ] Реальный Gregorian calendar.
- [ ] Один вымышленный мегаполис.
- [ ] Нет universal action points.
- [ ] Нет постоянной migration/geography simulation.
- [ ] Бесплатно, без Steam/backend/payments.

## Границы

- [ ] Core не зависит от platform/UI.
- [ ] UI не содержит formulas/raw SQL.
- [ ] Rust не содержит gameplay rules.
- [ ] Content data-only.
- [ ] Save/MonthRun boundaries непротиворечивы.

## Статусы решений

- [ ] ADR-001–003 Accepted.
- [ ] ADR-004–010 остаются Proposed до явного решения.
- [ ] Master не выдаёт Proposed ADR за окончательно принятые.

## Полнота

- [ ] Все ссылки из `docs/INDEX.md` существуют.
- [ ] README/AGENTS ссылаются на индекс.
- [ ] Historical policy использует local city availability, не multi-region.
- [ ] Roadmap соответствует vertical slice.
- [ ] Release plan не содержит Steam/EU commercial gates.

## После review

- [ ] Принять/отклонить каждый Proposed ADR.
- [ ] Обновить статусы и master.
- [ ] Squash merge либо сохранить историю согласно решению владельца.
- [ ] Создать implementation issues для Phase 0/Vertical Slice.