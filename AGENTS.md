# Inkwell Companion

Logseq DB plugin, companion to the Inkwell theme (`../logseq-inkwell-theme`). TypeScript + Vite, Vitest, Biome, npm; follows the owner's `logseq-plugin-dev` standards. `npm run check` runs typecheck, lint, tests and the build.

- Only what CSS can't do belongs here; CSS fixes go in the theme. See `docs/ADDING-A-FEATURE.md`.
- TDD: write the failing test first (beside the code, `src/**/*.test.ts`), then the smallest code that passes. KISS, DRY.
- Layout: `src/index.ts` is the only `import '@logseq/libs'` and wires everything; `src/sdk.ts` holds every adaptation of `logseq.*` (including the settings `button` type the 0.3.4 typings lack); features in `src/features/` get Logseq's window (`host`) and an injected `Sdk`, so tests pass fakes; pure logic has no DOM or SDK; DOM code builds elements with `src/ui/dom.ts` `el()`. DOM tests opt into happy-dom per file.
- Logseq loads `dist/index.html`: build before loading the folder, and restart Logseq after a build (a plugin reload keeps the old code).
- Dev ports 8295/8296 (query-builder 8291/8292, Planner 8293/8294).
- Live testing in the desktop app shares `~/.logseq` with the user's app: use the `test-logseq-desktop` skill's rules, never register/unregister plugins from a script, never change plugin settings from the instance.
- Track work in `TASKS.md`; commit with conventional commits; do not push or publish without the owner's say-so.
