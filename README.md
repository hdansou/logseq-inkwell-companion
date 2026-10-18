# Inkwell Companion

Small UX fixes for Logseq DB graphs that CSS alone can't make. It works with any theme; it is made to sit next to the [Inkwell theme](https://github.com/hdansou/logseq-inkwell-theme), which stays a stylesheet with no code.

Each fix is a separate feature with its own switch. All are on by default. Turn them on and off in **Tweaks**, a dialog with a card per feature that you can search and filter by category: open it from the command palette ("Inkwell Companion: Tweaks") or with the Open Tweaks button under Settings › Plugins › Inkwell Companion. The same switches are on that settings page too.

| Feature | What it fixes |
|---|---|
| **Export tables** | Core can only copy a table view as EDN. This adds an Export button to tag and query tables: download CSV or JSON, or copy the rows for a spreadsheet (each format can be switched off). It exports every row, not just the ones on screen, with the view's columns, filters, search and sort. If its row count differs from the table's, it stops and says so rather than save something different. |
| **Fit embedded tweets** | Core shows `{{twitter …}}` embeds in a 240px box you scroll inside. This sizes each embed to its tweet (the embed reports its own height). |

## Install

Once published: Marketplace › Plugins › _Inkwell Companion_. To load a local checkout: Developer mode, then Plugins › Load unpacked plugin › choose this folder.

It asks for `effect` in the marketplace manifest: the features read and change Logseq's page (an Export button in table headers, tweet heights), which a plugin without it cannot reach.

The plugin needs the network: it loads Logseq's plugin library (`@logseq/libs`, pinned, with an integrity hash) from the jsDelivr CDN, and the features it ships act on web content.

## Compatibility

Logseq DB graphs (2.0.x), desktop and web. Not on iOS, which does not load plugins; the Inkwell theme's CSS fallbacks apply there.

## Develop

`npm test` (no dependencies, Node 20+). `npm run package` builds `dist/logseq-inkwell-companion-<version>.zip`. [docs/ADDING-A-FEATURE.md](docs/ADDING-A-FEATURE.md) covers adding one.

MIT licensed.
