# BRISQUE Visualizer

Electron + Vite приложение для визуализации качества изображений с помощью BRISQUE.

## О проекте

Это дипломный проект, собранный на Electron и TypeScript. Приложение разделено на три части:

- `main` — основная часть Electron-приложения,
- `preload` — безопасный мост между рендером и основным процессом,
- `renderer` — пользовательский интерфейс.

## Быстрый старт

### Установка зависимостей

```bash
npm install
```

### Разработка

```bash
npm run dev
```

### Обычный запуск сборки

```bash
npm run build
```

### Сборка дистрибутива

```bash
npm run build:win
npm run build:mac
npm run build:linux
```

## Полезные команды

- `npm run lint` — проверить код ESLint
- `npm run format` — отформатировать весь проект через Prettier
- `npm run typecheck` — выполнить проверку типов TypeScript
- `npm run check` — линт + тайпчек
- `npm run clean` — удалить артефакты сборки

## Конфигурации

- `electron-builder.yml` — упаковка приложения для Windows, macOS и Linux.
- `tsconfig.node.json` / `tsconfig.web.json` — разделение компиляции на основной процесс и рендер.
- `eslint.config.mjs` — правила ESLint + Prettier.
- `.prettierrc.yaml` — параметры форматирования.
