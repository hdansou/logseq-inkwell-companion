# Tasks

Status: `[ ]` todo · `[~]` in progress · `[x]` done. Newest decisions at the bottom of each section.

## Context (read first)

Inkwell Companion is a Logseq DB plugin that sits next to the Inkwell theme (`../logseq-inkwell-theme`, public, v1.1.0 released). The theme is a stylesheet and stays code-free; anything CSS can't do goes here (`docs/ADDING-A-FEATURE.md`). Public on GitHub since 2026-10-18 (`hdansou/logseq-inkwell-companion`, v0.1.0 released).

Decisions (owner):
- **Name** Inkwell Companion, repo `hdansou/logseq-inkwell-companion`; works with any theme, not tied to Inkwell's CSS.
- **Toggle** one boolean setting per feature (plus optional per-feature options), all on by default, stored in the plugin's settings. Edited in the Tweaks dialog (mockup A, card grid; C11) or on the settings page. The dialog opens from the command palette and an Open Tweaks button on the settings page; no toolbar icon.
- **Tweets** the theme makes no tweet change (a fixed CSS height leaves short tweets with blank space); the companion fits each tweet exactly. Without the plugin (custom.css, iOS) tweets keep core's 240px scroll box.
- **Publishing** never push, tag, or open a marketplace PR without the owner's say-so.

How the first feature works: core renders `{{twitter <url>}}` as `iframe.tweet-embed` (min-height 240px, never resized). The embed posts `{"twttr.embed": {method: "twttr.private.resize", params: [{height}]}}` to the parent window; `src/features/tweet-height.js` applies it as an inline height on the iframe that sent it (origin `https://platform.twitter.com` only). Proven live in the theme repo on desktop 2.0.1: the test tweet (`https://x.com/richardcsuwandi/status/2106617018225147907`) went from a 240px box to 833px.

Known gotchas:
- Logseq needs `@logseq/libs` for the plugin handshake; without it the plugin fails with `handshake Timeout`. `index.html` loads `@logseq/libs@0.3.4` from jsDelivr with an SRI hash (changing the version means recomputing it: `curl -s <url> | openssl dgst -sha384 -binary | openssl base64 -A`).
- Features are classic scripts (no modules, no build), loaded by `index.html` before `src/main.js`; a test enforces both.
- Live testing in the desktop app shares `~/.logseq` with the owner's app. Use the `test-logseq-desktop` skill's rules: second instance with its own profile and a CDP port, throwaway graph, never register/unregister plugins from a script or change plugin settings. Loading this folder as an unpacked plugin (Developer mode) is an owner action, or ask first.

## Where we stopped (2026-10-18)

Shipped locally this session: C08–C11 (table export for tag and query tables; the Tweaks dialog; `effect: true` in the manifest). 39 tests pass. The owner runs it as an unpacked plugin and saw the Export button after a full restart.

Resume with:
1. Owner checks passed 2026-10-18: Download CSV opens the Save sheet and the file matches the table; in Tweaks, Export tables off/on removes/restores the button and CSV off removes it from the menu.
2. Done since: C02 (tweet switch off/on, owner) and C03 (icon). Then C04 (pushed, v0.1.0 released). Next: C05 marketplace PR (go-ahead needed) → C07.
3. Next features: export for All pages / references tables, relative date filters, non-English column titles, XLSX (C10 "Not yet"); each new feature needs a `category` (see `docs/ADDING-A-FEATURE.md`).

After changing plugin code, Logseq must be restarted (⌘Q): reloading the plugin serves the old script, in the owner's app as in the test instance.

## Done

- [x] C01 (2026-10-05) Scaffold: manifest, loader (`src/main.js`), first feature `tweet-height`, 10 tests, CI, publish workflow, release zip script. Copied from the theme repo: LICENSE, .gitignore, CI/publish workflows, **icon (placeholder)**
- [x] C06 (2026-10-05) Theme repo cleaned: script removed and no CSS height either; its README and DESIGN point here. Nothing to release for the theme

## Next, in order

- [x] C02 (2026-10-18) Live check of the loader and settings page: plugin loads, settings page lists every switch (C10/C11 runs); the owner confirmed the tweet switch off/on works live and Export tables off/on
- [x] C03 (2026-10-18) Own icon: `assets/icon.svg` (source) rendered to `assets/icon.png` 256px with `rsvg-convert -w 256 -h 256`. The theme's tile and palette (#223b3b, #b3c6c6, #f5f5f7, ink red #9c2529), two switches instead of ink lines: one on with the red dot as its knob, one off. Reads at 64px
- [x] C04 (2026-10-18) Public repo https://github.com/hdansou/logseq-inkwell-companion created and `main` pushed (owner's go); CI green; tag `v0.1.0` → Publish green, release https://github.com/hdansou/logseq-inkwell-companion/releases/tag/v0.1.0 with `logseq-inkwell-companion-0.1.0.zip`
- [ ] C05 Marketplace PR (`marketplace/manifest.json` + `assets/icon.png`; see how the theme's PR #922 was done). The manifest has no `theme: true`. Check whether a plugin that runs code needs anything the theme did not (the `effect` flag is for app-level UI/code injection, left off on purpose). **C08 found this matters:** a marketplace plugin without `effect: true` loads from `lsp://logseq.io/plugins/`, cross-origin to the app, so `host.document` throws. `tweet-height` (reads `host.document`, listens on `host`) and the planned Export button (injected into the view header) both need `effect: true` in `marketplace/manifest.json`, or a rewrite onto `provideUI`/`provideModel`. Decided 2026-10-18: `effect: true` is in the manifest (C10); the dev install hides the problem (same origin)
- [ ] C07 Then: link the companion from the theme's README once it is published (the link already exists there and 404s until C04), and note the companion in the theme repo if the marketplace listing wants it

## Table export and the Tweaks dialog (planned 2026-10-17)

Mockups: https://claude.ai/artifact/1FgcfFfbFRGcvjGjrptzsU (private). Owner picked **A, the card-grid dialog** (search + category filters, a card per feature, options shown on the card when it is on): it scans better than a narrow drawer once the list is long. The built-in settings stay where the switches are stored; the dialog reads and writes them (`logseq.updateSettings`), so the existing `onSettingsChanged` → `sync` path keeps working and the settings page stays usable on its own.

Facts from the Logseq source (DB version, 2026-10-17):
- Core's only view export is "Export EDN" in the view's "⋯" menu, copied to the clipboard (`views.cljs:1098`). No CSV/JSON.
- Table rows are virtualized (react-virtuoso, overscan 2 rows), so reading the DOM misses rows. No plugin API returns a view's rows.
- The view entity stores `:logseq.property.table/ordered-columns`, `hidden-columns`, `sorting`, `filters`; `:logseq.property.view/feature-type` (`:class-objects`, `:query-result`, ...); `:logseq.property/view-for`; query views use `:logseq.property/query`.
- DOM: header `div.ls-view-head` > `div.view-actions` (put the Export button here); rows `.ls-table-row` carry `blockid`; header and body cells have no column id; the only DOM attribute holding the view's uuid is `data-view-tab-id` on view tabs.
- No plugin API saves a file. A Blob `<a download>` in Logseq's page opens the Save sheet, but see the C08 correction: unconfirmed with a real click.

- [x] C08 (2026-10-18) Saving a file: a Blob `<a download>` clicked from Logseq's page opens the native macOS Save sheet (file name as given, folder Downloads; Cancel leaves nothing). **Correction found in C10:** the C08 runs had CDP download events switched on (`Browser.setDownloadBehavior`), which changes the outcome. Without them, in the background test instance, a download started WITHOUT a user gesture opens the sheet and one started WITH a gesture (as every real click is) silently does nothing, no file anywhere; core's own exports use the same `<a download>` click, so this is most likely the background window / synthetic input, not the code. Needs a real click in a frontmost window (see C10). From the `lsp://logseq.io` frame `parent.document` throws, see C05
- [x] C09 (2026-10-18) Table on screen → view entity, from each `.ls-view-head` (source `5824434`, verified live on Logseq-DB 2.0.2, throwaway graph):
  - Tag tables (and All pages, references): the head always renders tabs, even for one view (`view-head`, `views.cljs:3475`). The current tab is the `[data-view-tab-id]` WITHOUT class `text-muted-foreground`; strip `view-tab-` to get the view uuid. Its entity has `view/feature-type` `classObjects` and `view-for` the tag. Adding a view and clicking tabs moved the current tab as expected (the selection is React state, `selected-view` at :4093, so the DOM is the only place to read it)
  - Query tables: no tabs; the view entity IS the query block (`query.cljs:54` passes `current-block`). Take `head.closest('.query-result').closest('[blockid]:not(.ls-table-row)')`; that block carries `:logseq.property/query` and the table properties
  - Rows in the DOM for one view: walk up from the head to the first ancestor holding `.ls-table-row[blockid]` (still only the rendered window)
  - Row count for the C10 check: the current tab's text ends with the count ("All3" = title "All" + 3 rows); query heads print it in their title (`:view.table/default-title` with `(count rows)`)
- [x] C10 (2026-10-18) Feature `tableExport` built, `src/features/table-export.js`, 23 tests. Export button before "⋯" on tag tables (`class-objects`) and query tables only. Rows from the database (tag + tags extending it; query re-run via `DB.q` / `DB.customQuery`), columns from the header cells on screen (skip the `!border-0` select and "New property" cells; built-ins matched by English title), filters / head search / sort following core (`row-matched?`, and the live sort `sort-eids-by-sorting`: empty values last both ways, many values joined ", " or summed, choices by `:block/order`, date by journal day; ties keep query order, or entity id for tags). Stops with a message when its count differs from the tab / "Live query (n)" count. Loader now calls `start(host, logseq)`; manifest has `effect: true` (test).
  Verified live (Logseq-DB 2.0.2, throwaway graph seeded with text, number, choice, date, node many, checkbox, url, datetime; a Novel tag extending Book): button on the tag and query tables, none on Linked references; export rows, order and count matched the screen for a filtered + sorted view, an unfiltered view sorted by a choice, and the query table; Copy for spreadsheet put the right TSV on the clipboard (the shared system clipboard). Gotchas: `LSPluginCore.reload` served the old script, restart the instance instead; `datascriptQuery` needs a real clause next to `ground` ("Extra inputs passed").
  Owner's app (2026-10-18): no button after a plugin reload; after a full restart (⌘Q) the button shows. Same stale-script cause as `LSPluginCore.reload`: after updating the plugin, restart Logseq.
  **Save sheet confirmed by the owner (2026-10-18):** a real click opens it and the CSV matches the table, so the background-instance failure was the synthetic input. Earlier note: In the background test instance a download clicked through the menu started (`Page.downloadWillBegin`) but showed no sheet and saved nothing (see the C08 correction). Owner check: in your app (restarted), open a tag table, Export › Download CSV, expect the Save sheet; also switch the setting off (buttons go away) and on. If no sheet shows, the fallback is the clipboard or `showSaveFilePicker` (exists in the page).
  Not yet: All pages / references tables, relative date filters (`before`/`after` with a keyword), non-English column titles, grouping (exported flat), XLSX
- [x] C11 (2026-10-18) Tweaks dialog (mockup A), `src/tweaks.js`, drawn in the plugin's frame (`showMainUI`). Features gain `category` and optional `options` (`{key, label}`, their own settings keys; tableExport's formats). The settings schema: an Open Tweaks `button` (`buttonAction` → `provideModel`, in core since 2026-08-26, in both installed 2.0.2 builds), then per category a `heading`, the feature, its options. Opens from the palette ("Inkwell Companion: Tweaks") and that button; no toolbar icon. The settings page is a modal above the main UI and no API closes it (`hideSettingsUI` only clears the focused plugin), so the button sends Escape to Logseq's page first. Light/dark from the host's `data-theme`, font from its body. Writes go through `updateSettings`; the dialog redraws on `onSettingsChanged`.
  Verified live (Logseq-DB 2.0.2, throwaway graph): palette and settings button both open it on top (`elementFromPoint` hits the plugin frame), settings modal closed, search focused, search / category / empty state, Tab stays in the dialog, Escape and × close it; dark at 390px wide without horizontal scroll. Not tested from the instance: flipping switches (the settings file is shared with the owner's app). On registration Logseq wrote the three new option keys as `true` into the shared settings file.
  Owner check passed (2026-10-18): flip a switch in the dialog (the Export button goes away / comes back; turning CSV off removes it from the Export menu)

## Production-hardening pass (2026-10-18)

Applied: export guards formula-like text in CSV / TSV (leading `'`; JSON untouched; tests); tweet-height `stop` clears the heights it set (test); the loader uses `tweaks.isOn`; dead theme-lab lines out of `.gitignore`; descriptions in `package.json` and the marketplace manifest name the features; README: Privacy section, compatibility says desktop 2.0.2 checked and the web app not tested; CHANGELOG: icon, formula guard, tweet stop, and `[Unreleased]` cut to `[0.1.0] - 2026-10-18` (redate if the tag lands later).
Deferred: a live run in the web app (app.logseq.com) before claiming web support. No dependencies, so no audit; CI and the publish workflow both run the tests.
