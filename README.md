# Inkwell Companion

Small UX fixes for Logseq DB graphs that CSS alone can't make. It works with any theme; it is made to sit next to the [Inkwell theme](https://github.com/hdansou/logseq-inkwell-theme), which stays a stylesheet with no code.

Each fix is a separate feature with its own switch under Settings › Plugins › Inkwell Companion. All are on by default.

| Feature | What it fixes |
|---|---|
| **Fit embedded tweets** | Core shows `{{twitter …}}` embeds in a 240px box you scroll inside. This sizes each embed to its tweet (the embed reports its own height). |

## Install

Once published: Marketplace › Plugins › _Inkwell Companion_. To load a local checkout: Developer mode, then Plugins › Load unpacked plugin › choose this folder.

The plugin needs the network: it loads Logseq's plugin library (`@logseq/libs`, pinned, with an integrity hash) from the jsDelivr CDN, and the features it ships act on web content.

## Compatibility

Logseq DB graphs (2.0.x), desktop and web. Not on iOS, which does not load plugins; the Inkwell theme's CSS fallbacks apply there.

## Develop

`npm test` (no dependencies, Node 20+). `npm run package` builds `dist/logseq-inkwell-companion-<version>.zip`. [docs/ADDING-A-FEATURE.md](docs/ADDING-A-FEATURE.md) covers adding one.

MIT licensed.
