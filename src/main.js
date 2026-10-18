// Loader: one settings toggle per feature (all on by default); start the enabled ones, stop them on unload.
// A feature is { id, title, description, category, options?, start(host, sdk) -> stop() } from src/features/*.js;
// sdk is the `logseq` API. The Tweaks dialog (src/tweaks.js) shows the same switches as cards.
const features = (window.InkwellCompanion && window.InkwellCompanion.features) || []
const tweaks = window.InkwellCompanion.tweaks
const host = window.parent
const running = new Map()

const sync = () => {
  for (const f of features) {
    const on = tweaks.isOn(logseq.settings, f.id)
    if (on && !running.has(f.id)) running.set(f.id, f.start(host, logseq))
    if (!on && running.has(f.id)) { running.get(f.id)(); running.delete(f.id) }
  }
}

let dialog = null
const closeTweaks = () => {
  if (dialog) { dialog.destroy(); dialog = null }
  logseq.hideMainUI({ restoreEditingCursor: true })
}
const openTweaks = async () => {
  // From the settings page's button: that page is a modal over the main UI, and no API closes it; it closes on
  // Escape like any of Logseq's dialogs.
  for (let i = 0; i < 3 && host.document.querySelector('[data-key="openTweaks"]'); i++) {
    host.document.body.dispatchEvent(new host.KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }))
    await new Promise((r) => setTimeout(r, 120))
  }
  if (dialog) dialog.destroy()
  logseq.showMainUI({ autoFocus: true })
  dialog = tweaks.mount(document, {
    features,
    getSettings: () => logseq.settings,
    set: (key, value) => logseq.updateSettings({ [key]: value }),
    onClose: closeTweaks,
    dark: host.document.documentElement.getAttribute('data-theme') === 'dark',
    font: host.getComputedStyle(host.document.body).fontFamily,
  })
}

logseq.ready(() => {
  logseq.useSettingsSchema(tweaks.settingsSchema(features))
  logseq.provideModel({ openTweaks })
  logseq.App.registerCommandPalette({ key: 'inkwell-companion-tweaks', label: 'Inkwell Companion: Tweaks' }, openTweaks)
  logseq.on('ui:visible:changed', ({ visible }) => { if (!visible && dialog) { dialog.destroy(); dialog = null } })
  sync()
  logseq.onSettingsChanged(() => { sync(); if (dialog) dialog.refresh() })
  logseq.beforeunload(async () => { closeTweaks(); for (const stop of running.values()) stop(); running.clear() })
}).catch(console.error)
