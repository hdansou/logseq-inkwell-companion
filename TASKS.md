# Tasks

Status: `[ ]` todo · `[~]` in progress · `[x]` done. Newest decisions at the bottom of each section.

## Context (read first)

Inkwell Companion is a Logseq DB plugin that sits next to the Inkwell theme (`../logseq-inkwell-theme`, public, v1.1.0 released). The theme is a stylesheet and stays code-free; anything CSS can't do goes here (`docs/ADDING-A-FEATURE.md`). Nothing here is on GitHub yet; the repo exists only locally (3 commits on `main`).

Decisions (owner):
- **Name** Inkwell Companion, repo `hdansou/logseq-inkwell-companion`; works with any theme, not tied to Inkwell's CSS.
- **Toggle** one boolean setting per feature on the plugin's settings page, all on by default. No command palette or toolbar toggle.
- **Tweets** the theme makes no tweet change (a fixed CSS height leaves short tweets with blank space); the companion fits each tweet exactly. Without the plugin (custom.css, iOS) tweets keep core's 240px scroll box.
- **Publishing** never push, tag, or open a marketplace PR without the owner's say-so.

How the first feature works: core renders `{{twitter <url>}}` as `iframe.tweet-embed` (min-height 240px, never resized). The embed posts `{"twttr.embed": {method: "twttr.private.resize", params: [{height}]}}` to the parent window; `src/features/tweet-height.js` applies it as an inline height on the iframe that sent it (origin `https://platform.twitter.com` only). Proven live in the theme repo on desktop 2.0.1: the test tweet (`https://x.com/richardcsuwandi/status/2106617018225147907`) went from a 240px box to 833px.

Known gotchas:
- Logseq needs `@logseq/libs` for the plugin handshake; without it the plugin fails with `handshake Timeout`. `index.html` loads `@logseq/libs@0.3.4` from jsDelivr with an SRI hash (changing the version means recomputing it: `curl -s <url> | openssl dgst -sha384 -binary | openssl base64 -A`).
- Features are classic scripts (no modules, no build), loaded by `index.html` before `src/main.js`; a test enforces both.
- Live testing in the desktop app shares `~/.logseq` with the owner's app. Use the `test-logseq-desktop` skill's rules: second instance with its own profile and a CDP port, throwaway graph, never register/unregister plugins from a script or change plugin settings. Loading this folder as an unpacked plugin (Developer mode) is an owner action, or ask first.

## Done

- [x] C01 (2026-10-05) Scaffold: manifest, loader (`src/main.js`), first feature `tweet-height`, 10 tests, CI, publish workflow, release zip script. Copied from the theme repo: LICENSE, .gitignore, CI/publish workflows, **icon (placeholder)**
- [x] C06 (2026-10-05) Theme repo cleaned: script removed and no CSS height either; its README and DESIGN point here. Nothing to release for the theme

## Next, in order

- [ ] C02 Live check of the loader and settings page, which are NOT verified live yet (only the tweet logic is, and only via the theme's earlier copy of it). Load the folder as an unpacked plugin, then check: plugin loads with no `handshake Timeout`; the settings page lists "Fit embedded tweets to their content", on by default; with it on a tweet resizes to its content; switching it off stops resizing without a reload (listener removed; inline height from before the switch stays until the tweet reloads, so decide whether `stop` should also clear it); on again resumes. Then tick the box in this file
- [ ] C03 Own icon (`assets/icon.png`, currently a copy of the theme's). Keep it distinct from the theme's but recognisably related
- [ ] C04 Create `hdansou/logseq-inkwell-companion` on GitHub, push `main`, check CI is green, then tag `v0.1.0` (the Publish workflow checks the tag matches `package.json`, runs the tests and attaches the zip). Needs the owner's go-ahead for each push
- [ ] C05 Marketplace PR (`marketplace/manifest.json` + `assets/icon.png`; see how the theme's PR #922 was done). The manifest has no `theme: true`. Check whether a plugin that runs code needs anything the theme did not (the `effect` flag is for app-level UI/code injection, left off on purpose)
- [ ] C07 Then: link the companion from the theme's README once it is published (the link already exists there and 404s until C04), and note the companion in the theme repo if the marketplace listing wants it

## Table export and the Tweaks dialog (planned 2026-10-17)

Mockups: https://claude.ai/artifact/1FgcfFfbFRGcvjGjrptzsU (private). Owner picked **A, the card-grid dialog** (search + category filters, a card per feature, options shown on the card when it is on): it scans better than a narrow drawer once the list is long. The built-in settings stay where the switches are stored; the dialog reads and writes them (`logseq.updateSettings`), so the existing `onSettingsChanged` → `sync` path keeps working and the settings page stays usable on its own.

Facts from the Logseq source (DB version, 2026-10-17):
- Core's only view export is "Export EDN" in the view's "⋯" menu, copied to the clipboard (`views.cljs:1098`). No CSV/JSON.
- Table rows are virtualized (react-virtuoso, overscan 2 rows), so reading the DOM misses rows. No plugin API returns a view's rows.
- The view entity stores `:logseq.property.table/ordered-columns`, `hidden-columns`, `sorting`, `filters`; `:logseq.property.view/feature-type` (`:class-objects`, `:query-result`, ...); `:logseq.property/view-for`; query views use `:logseq.property/query`.
- DOM: header `div.ls-view-head` > `div.view-actions` (put the Export button here); rows `.ls-table-row` carry `blockid`; header and body cells have no column id; the only DOM attribute holding the view's uuid is `data-view-tab-id` on view tabs.
- No plugin API saves a file. The plugin iframe has no `sandbox` attribute, so a Blob `<a download>` should work in a browser; unverified in Electron.

- [ ] C08 Spike: can the plugin save a file in the desktop app (Blob + `<a download>`, from the plugin iframe and from the host document)? If neither works, export falls back to the clipboard
- [ ] C09 Spike: find a reliable way to tie a table on screen to its view entity (only `data-view-tab-id` carries it, and only when tabs show)
- [ ] C10 Feature `tableExport`: rows from the database (the tag's objects, or re-run the view's query), columns from ordered minus hidden columns, the view's sort and common filters applied; warn instead of exporting when the row count differs from the table's. Formats: CSV (UTF-8 BOM, RFC 4180, multi-values joined with `; `, refs as titles, ISO dates), JSON, copy as TSV. XLSX (hand-written stored zip) later. Pure functions tested like `parseResize`
- [ ] C11 Tweaks dialog (mockup A). The feature shape gains `category` and optional `options`; the settings schema gains `heading` entries per category. Open question for the owner: how the dialog opens (toolbar icon, command palette, a settings-page button). The C-era decision says no command palette or toolbar *toggle*; an opener is not a toggle, but confirm
