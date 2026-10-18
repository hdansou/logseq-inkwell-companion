# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/).

## [Unreleased]

### Changed

- Rewritten in TypeScript (Vite build, Vitest, Biome), following the owner's plugin standards; behaviour unchanged. Logseq now loads `dist/index.html`, and `@logseq/libs` is bundled instead of fetched from jsDelivr, so the plugin makes no network requests.

## [0.1.0] - 2026-10-18

### Added

- Own icon: two switches on the Inkwell theme's tile.
- Tweaks: a dialog with a card per feature (search, category filters, a feature's options on its card), from the command palette or the Open Tweaks button on the plugin's settings page. The settings page groups the switches under a heading per category. Export tables: each format has its own switch.
- Feature: export tables. An Export button on tag and query tables saves CSV or JSON, or copies the rows for a spreadsheet; every row, with the view's columns, filters, search and sort. In CSV and copied rows, text that starts like a formula (`=`, `+`, `-`, `@`) gets a leading `'` so spreadsheets keep it as text. Not yet: All pages and references tables, relative date filters, column titles in languages other than English.
- First version. Feature: fit embedded tweets to their content (moved here from the Inkwell theme's unreleased work); switching it off gives tweets their own height back. Settings: one switch per feature.
