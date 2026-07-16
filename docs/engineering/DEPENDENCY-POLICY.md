# Политика зависимостей

## Критерии добавления

Новая dependency должна:

- решать конкретную проблему;
- сокращать сложный/рискованный собственный код;
- иметь приемлемую лицензию;
- иметь активную поддержку или стабильную зрелость;
- работать offline и в WebView2/Tauri;
- не дублировать уже принятый инструмент;
- иметь понятную boundary и replacement strategy.

## Review record

PR указывает:

- use case;
- рассмотренные альтернативы;
- runtime/build impact;
- bundle/binary impact;
- maintenance/security status;
- license;
- план тестирования;
- почему стандартной библиотеки недостаточно.

## Versions

- runtime dependencies фиксируются exact version;
- обновления выполняются отдельными PR;
- major update не смешивается с feature;
- lockfile обязателен;
- Node/pnpm/Rust toolchains pinned.

## Tool overlap

Не поддерживаются параллельно без ADR:

- Oxfmt и Prettier;
- Oxlint и полный ESLint stack;
- несколько state managers;
- несколько chart libraries;
- несколько schema libraries.

## License policy

Разрешённые/ограниченные licenses фиксируются в automated policy. Copyleft и unusual terms требуют human review. Все обязательные notices включаются в release.

## Security

- dependency review;
- advisories;
- cargo-deny;
- package integrity/lockfile;
- SBOM;
- запрет install scripts, если нет обоснования;
- transitive dependency risk review для sensitive packages.

## Removal

Knip помогает найти мёртвые зависимости, но удаление content/save-related package требует соответствующих integration tests. Dependency удаляется вместе с конфигурацией, docs и generated artifacts.