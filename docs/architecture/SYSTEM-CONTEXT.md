# Runtime Human — System Context

## Назначение системы

Runtime Human — локальная однопользовательская Windows-игра. Авторитетные игровые данные находятся на устройстве пользователя. Сеть, аккаунт и backend не требуются для прохождения.

## Внешние акторы

- **Игрок** — создаёт персонажа, принимает решения, управляет проектами и продвигает время.
- **Автор контента** — добавляет исторические записи, события, компании и локализацию через проверяемые data packs.
- **Разработчик/ИИ-агент** — изменяет код и документы через Git branch и PR.
- **Release maintainer** — создаёт подписанные installers и update artifacts.
- **Операционная система** — предоставляет WebView2, filesystem, window lifecycle и системные диалоги.

## Внешние системы

Baseline использует только:

- локальную файловую систему;
- SQLite;
- WebView2/Tauri runtime;
- опциональный статический endpoint обновлений.

Не являются обязательными зависимостями:

- Steam;
- магазины;
- authentication;
- cloud save;
- telemetry;
- remote config;
- multiplayer;
- real-time сервисы.

## Контейнеры

```text
Desktop Application
├── React Renderer
├── Application Facade
├── Pure Game Core
├── Content Runtime
├── Rust Platform Adapter
└── SQLite Save Store
```

## Trust boundaries

1. Пользовательский ввод и UI не доверяются домену без валидации.
2. Моды и импортированные архивы считаются недоверенными данными.
3. React renderer не получает raw SQL и произвольные filesystem permissions.
4. Updater artifacts принимаются только после проверки подписи.
5. Исторические данные без provenance не входят в канонический каталог.

## Главные системные качества

- детерминированность;
- сохранность сейва;
- offline-first;
- расширяемый data-driven контент;
- быстрый переход месяца;
- контролируемая сложность;
- проверяемость агентами.
