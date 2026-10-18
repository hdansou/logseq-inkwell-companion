import { describe, expect, it } from 'vitest'
import manifest from '../marketplace/manifest.json'
import pkg from '../package.json'
import { features } from './features'

describe('plugin package', () => {
  it('is marketplace-shaped: the built page is main, the icon sits at the root, DB only', () => {
    for (const k of ['version', 'description', 'author', 'license'] as const) expect(pkg[k], k).toBeTruthy()
    expect(pkg.logseq.id).toBe(pkg.name)
    expect(pkg.main).toBe('dist/index.html')
    expect(pkg.logseq.main).toBe('dist/index.html')
    expect(pkg.logseq.icon).toBe('./icon.svg')
    expect(pkg.logseq.supportsDBOnly).toBe(true)
  })

  it('the SDK floor is the same in dependencies and minSDKVersion', () => {
    expect(pkg.dependencies['@logseq/libs']).toBe(`^${pkg.logseq.minSDKVersion}`)
  })

  it('the manifest repo matches package.json and is not a theme', () => {
    expect(`https://github.com/${manifest.repo}`).toBe(pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, ''))
    expect(manifest).not.toHaveProperty('theme')
  })

  it("the manifest asks for effect: features read and change Logseq's page, which a plugin without it cannot reach", () => {
    expect(manifest.effect).toBe(true)
  })

  it('every feature has an id, title, description, category and start()', () => {
    for (const f of features) {
      for (const k of ['id', 'title', 'description', 'category'] as const) expect(f[k], `${f.id}: ${k}`).toBeTruthy()
      expect(typeof f.start).toBe('function')
    }
  })
})
