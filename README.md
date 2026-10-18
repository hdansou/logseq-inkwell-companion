# Inkwell Companion

Small UX fixes for Logseq DB graphs that CSS alone can't make. It works with any theme; it is made to sit next to the [Inkwell theme](https://github.com/hdansou/logseq-inkwell-theme), which stays a stylesheet with no code.

Each fix is a separate feature with its own switch. All are on by default. Turn them on and off in **Tweaks**, a dialog with a card per feature that you can search and filter by category: open it from the command palette ("Inkwell Companion: Tweaks") or with the Open Tweaks button under Settings › Plugins › Inkwell Companion. The same switches are on that settings page too.

| Feature | What it fixes |
|---|---|
| **Export tables** | Core can only copy a table view as EDN. This adds an Export button to tag and query tables: download CSV or JSON, or copy the rows for a spreadsheet (each format can be switched off). It exports every row, not just the ones on screen, with the view's columns, filters, search and sort. If its row count differs from the table's, it stops and says so rather than save something different. |
| **Fit embedded tweets** | Core shows `{{twitter …}}` embeds in a 240px box you scroll inside. This sizes each embed to its tweet (the embed reports its own height). |

## Install

Marketplace › Plugins › _Inkwell Companion_ (once listed), or download the zip from [Releases](https://github.com/hdansou/logseq-inkwell-companion/releases), unzip it, and in Developer mode use Plugins › Load unpacked plugin. To load a checkout instead: `npm install && npm run build`, then load this folder (Logseq runs `dist/index.html`); restart Logseq after each build, since reloading the plugin keeps the old code.

It asks for `effect` in the marketplace manifest: the features read and change Logseq's page (an Export button in table headers, tweet heights), which a plugin without it cannot reach.

## Privacy

The plugin sends nothing anywhere and keeps no data of its own beyond its switches (in Logseq's plugin settings). Exports go to a file you save or to your clipboard. It makes no network requests: Logseq's plugin library is bundled in.

## Compatibility

Logseq DB graphs (2.0.x), desktop; checked on 2.0.2. The web app is not tested yet. Not on iOS, which does not load plugins; the Inkwell theme's CSS fallbacks apply there.

## Develop

TypeScript, built with Vite; tests with Vitest (happy-dom for the DOM parts); lint and format with Biome. Node 22+.

```sh
npm install
npm run check   # typecheck, lint, test, build
npm run dev     # Vite dev server on 8295
```

Pushing a tag `v<version>` builds the release zip on GitHub. [docs/ADDING-A-FEATURE.md](docs/ADDING-A-FEATURE.md) covers adding a feature.

MIT licensed.
