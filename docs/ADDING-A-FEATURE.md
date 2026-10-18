# Adding a feature

Only add something here that CSS can't do. If the theme can fix it with a rule, it belongs in the theme, which stays code-free.

1. **Test first.** Create `src/features/<name>.test.ts` (or a folder `src/features/<name>/` when it has several parts) with the behaviour you want, and watch it fail. Pure logic is tested in Node; a test that needs the DOM starts with `// @vitest-environment happy-dom`. Pass a fake `Sdk` (`src/types.ts`) for anything the feature asks of Logseq.
2. **Write the feature** in `src/features/<name>.ts`, the smallest code that passes:
   ```ts
   import type { Feature } from '../types'

   export const myFeature: Feature = {
     id: 'myFeature', // the settings key; the switch defaults to on
     title: 'Short sentence for the settings page',
     description: 'What it fixes and why core does not.',
     category: 'Tables', // groups it in the Tweaks dialog and on the settings page
     options: [{ key: 'myFeatureCsv', label: 'CSV' }], // optional: more switches, read with sdk.settings()
     start(host, sdk) {
       // host is Logseq's window, sdk the injected SDK calls; return a function that undoes everything
       return () => {}
     },
   }
   ```
   Keep logic that does not touch the DOM in pure functions; build DOM with `el()` from `src/ui/dom.ts`.
3. Add it to the list in `src/features/index.ts` (the order is the order in Tweaks and on the settings page).
4. `npm run check`, then verify it live in the desktop app (the `test-logseq-desktop` skill: second instance, throwaway graph) and add a row to the README table and a line to `CHANGELOG.md`.

A feature must leave no trace after `stop` (listeners, inline styles, observers), work on any theme, and do nothing harmful when its target is absent.
