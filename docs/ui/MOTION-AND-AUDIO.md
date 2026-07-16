# Motion и audio

## Motion principles

Анимация подчёркивает изменение состояния, а не задерживает пользователя.

Подходящие случаи:

- переход месяца;
- открытие значимого события;
- повышение;
- достижение;
- релиз продукта;
- изменение layout;
- появление нового раздела.

Hover и простые transitions реализуются CSS. Motion используется там, где нужен enter/exit, layout transition или gesture.

## Ограничения

- никаких обязательных длинных intro-анимаций;
- animation duration ограничена;
- события не используют агрессивные вспышки;
- reduced motion отключает parallax, масштабирование и сложные переходы;
- animation completion не управляет авторитетной логикой.

## Audio channels

```text
Master
Music
Ambient
SFX
UI
```

Каждый канал имеет volume/mute. При сворачивании окна применяются platform lifecycle rules.

## Audio implementation

Baseline: Web Audio API или тонкая Howler wrapper после проверки bundle/maintenance. Домен не импортирует audio library; UI получает semantic cues.

## Accessibility

- звук не является единственным сигналом;
- речь имеет subtitles;
- mute не скрывает gameplay outcomes;
- отдельная настройка интенсивности UI sounds;
- автоматическое воспроизведение начинается только после user interaction.

## Asset budgets

Audio lazy-loaded, long tracks streamed/decoded по необходимости, simultaneous SFX ограничены. CI проверяет manifest и отсутствующие файлы.