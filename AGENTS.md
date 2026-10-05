# Inkwell Companion

Logseq DB plugin, companion to the Inkwell theme (`../logseq-inkwell-theme`). Zero dependencies; `npm test` runs `node --test`.

- Only what CSS can't do belongs here; CSS fixes go in the theme. See `docs/ADDING-A-FEATURE.md`.
- Features are classic scripts (no modules, no build) loaded by `index.html`; the loader is `src/main.js`.
- `@logseq/libs` is loaded from jsDelivr, pinned with an integrity hash (needed only for the plugin handshake). Changing the version means recomputing the hash.
- Live testing in the desktop app shares `~/.logseq` with the user's app: use the `test-logseq-desktop` skill's rules, never register/unregister plugins from a script.
- Track work in `TASKS.md`; commit with conventional commits; do not push or publish without the owner's say-so.
