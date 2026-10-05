import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const pkg = JSON.parse(read('package.json'))
const manifest = JSON.parse(read('marketplace/manifest.json'))

describe('plugin package', () => {
  test('is marketplace-shaped, with an icon and a main that exists', () => {
    for (const k of ['version', 'description', 'author', 'license']) assert.ok(pkg[k], `missing ${k}`)
    assert.equal(pkg.logseq.id, pkg.name)
    assert.ok(existsSync(new URL(`../${pkg.logseq.icon}`, import.meta.url)), 'icon missing')
    assert.ok(existsSync(new URL(`../${pkg.logseq.main}`, import.meta.url)), 'main missing')
  })
  test('the manifest repo matches package.json and is not a theme', () => {
    assert.equal(`https://github.com/${manifest.repo}`, pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, ''))
    assert.notEqual(manifest.theme, true)
  })
  test('index.html pins its library with integrity and loads every feature before the loader', () => {
    const html = read('index.html')
    assert.match(html, /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@logseq\/libs@\d+\.\d+\.\d+\/dist\/lsplugin\.user\.js" integrity="sha384-[A-Za-z0-9+/=]+"/)
    const scripts = [...html.matchAll(/<script src="\.\/(src\/[^"]+)"/g)].map((m) => m[1])
    const features = readdirSync(new URL('../src/features', import.meta.url)).map((f) => `src/features/${f}`)
    for (const f of features) assert.ok(scripts.includes(f), `${f} is not loaded by index.html`)
    assert.equal(scripts.at(-1), 'src/main.js', 'the loader must come last')
  })
  test('every feature has an id, title, description and start()', () => {
    for (const f of readdirSync(new URL('../src/features', import.meta.url))) {
      const feature = createRequire(import.meta.url)(`../src/features/${f}`)
      for (const k of ['id', 'title', 'description']) assert.ok(feature[k], `${f}: missing ${k}`)
      assert.equal(typeof feature.start, 'function', `${f}: start`)
    }
  })
})
