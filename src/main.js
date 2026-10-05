// Loader: one settings toggle per feature (all on by default); start the enabled ones, stop them on unload.
// A feature is { id, title, description, start(host) -> stop() } from src/features/*.js.
const features = (window.InkwellCompanion && window.InkwellCompanion.features) || []
const host = window.parent
const running = new Map()

const sync = () => {
  for (const f of features) {
    const on = logseq.settings[f.id] !== false
    if (on && !running.has(f.id)) running.set(f.id, f.start(host))
    if (!on && running.has(f.id)) { running.get(f.id)(); running.delete(f.id) }
  }
}

logseq.ready(() => {
  logseq.useSettingsSchema(features.map((f) => ({
    key: f.id, type: 'boolean', default: true, title: f.title, description: f.description,
  })))
  sync()
  logseq.onSettingsChanged(sync)
  logseq.beforeunload(async () => { for (const stop of running.values()) stop(); running.clear() })
}).catch(console.error)
