---
title: "ASSET-PIPELINE"
type: content
status: draft
canon: true
updated: 2026-07-18
---

# Asset pipeline

## Asset manifest

Каждый встроенный asset имеет:

- stable ID;
- kind;
- source path;
- optimized output path;
- dimensions/duration;
- hash;
- license/source;
- preload policy;
- localization variants;
- attribution requirements.

## Изображения

- UI raster assets конвертируются в WebP/AVIF только после проверки качества и WebView2 compatibility;
- SVG проходят SVGO и security validation;
- remote CDN assets запрещены;
- размеры и memory budget фиксируются;
- декоративные assets lazy-loaded.

## Шрифты

- локальные файлы;
- полное покрытие кириллицы;
- зафиксированная лицензия;
- ограниченное число weights;
- fallback stack;
- проверка читаемости при 200% scale.

## Audio

Asset metadata содержит channel, loudness target, duration и loop policy. Большие треки загружаются по требованию. Значимая информация всегда имеет визуальный эквивалент.

## Build tools

- `svgo` для SVG;
- `sharp` как build-only tool для raster processing;
- checksum generation;
- duplicate detection;
- license report.

## Mod assets

Allowlist форматов, limits размера/разрешения, запрет scripts/HTML, защита от archive bombs и path traversal. Недоверенный SVG либо запрещается, либо преобразуется в безопасный raster.

## CI

Проверяются missing manifest entries, duplicate IDs, oversized files, unsupported formats, license metadata и hash mismatch.