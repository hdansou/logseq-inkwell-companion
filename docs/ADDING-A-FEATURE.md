# Adding a feature

Only add something here that CSS can't do. If the theme can fix it with a rule, it belongs in the theme, which stays code-free.

1. Create `src/features/<name>.js`, a classic script (no modules: it is loaded by `index.html`) in this shape:
   ```js
   (function (root) {
     const feature = {
       id: 'camelCaseKey',        // the settings key; the switch defaults to on
       title: 'Short sentence for the settings page',
       description: 'What it fixes and why core does not.',
       category: 'Tables',        // groups it in the Tweaks dialog and on the settings page
       options: [{ key: 'camelCaseKeyCsv', label: 'CSV' }], // optional: more switches (settings keys, on by default), read from sdk.settings
       start(host, sdk) { /* host is Logseq's window, sdk the `logseq` API; return a function that undoes everything */ return () => {} },
     }
     if (typeof module !== 'undefined' && module.exports) module.exports = feature
     else (root.InkwellCompanion = root.InkwellCompanion || { features: [] }).features.push(feature)
   })(typeof window !== 'undefined' ? window : globalThis)
   ```
2. Add its `<script src="./src/features/<name>.js">` to `index.html`, before `src/main.js` (a test checks this).
3. Put the logic that does not touch the DOM in pure functions (like `parseResize`) and test it in `tests/`. Check DOM and message handling with a fake host, as `tests/tweet-height.test.mjs` does.
4. Verify it live in the desktop app (see the Inkwell theme's `docs/TESTING.md`, "second instance" recipe) and add a row to the README table and a line to `CHANGELOG.md`.

A feature must leave no trace after `stop` (listeners, inline styles, observers), work on any theme, and do nothing harmful when its target is absent.
