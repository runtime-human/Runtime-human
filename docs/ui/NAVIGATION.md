# Навигация

## Router

Используется TanStack Router с type-safe routes и route-level error boundaries.

## Основные маршруты

```text
/life
/career
/skills
/technologies
/projects
/open-source
/products
/company
/housing
/equipment
/relationships
/health
/history
/settings
/saves
/diagnostics
```

## PC layout

Базовая структура:

```text
левое основное меню
+ центральный игровой экран
+ контекстная правая панель при необходимости
```

Панели не должны постоянно уменьшать рабочую область. На малой ширине правая панель становится drawer.

## Deep links

Route params могут ссылаться на project/company/person IDs. При отсутствующем объекте отображается recoverable not-found state, а не crash.

## Focus

После перехода focus перемещается к заголовку экрана или основному region. Закрытие modal возвращает focus исходному элементу.

## Back behavior

Browser-like back работает внутри приложения предсказуемо. Critical command не повторяется при навигации назад.

## Command palette

Позднее допускается keyboard command palette для переходов и безопасных мгновенных действий. Она не обходит доменные permissions и confirmations.

## Month action

Кнопка «Следующий месяц» доступна из устойчивого места интерфейса, но блокируется при незавершённом mandatory decision, migration/recovery и невалидном plan.