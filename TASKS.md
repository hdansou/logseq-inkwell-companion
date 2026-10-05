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
