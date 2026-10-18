// Entry: the only `import '@logseq/libs'`. Wires the features, the settings page and the Tweaks dialog to Logseq.
import '@logseq/libs'
import { features } from './features'
import { createLoader } from './loader'
import { makeSdk, useSettingsSchema } from './sdk'
import { settingsSchema } from './tweaks/model'
import type { Host } from './types'
import { mountTweaks } from './ui/tweaks-dialog'

const host = window.parent as Host
const sdk = makeSdk()
const loader = createLoader(features, host, sdk)
let dialog: ReturnType<typeof mountTweaks> | null = null

const dropDialog = () => {
  dialog?.destroy()
  dialog = null
}

const closeTweaks = () => {
  dropDialog()
  logseq.hideMainUI({ restoreEditingCursor: true })
}

const openTweaks = async () => {
  // From the settings page's button: that page is a modal over the main UI, and no API closes it
  // (hideSettingsUI only clears the focused plugin); it closes on Escape like any of Logseq's dialogs.
  for (let i = 0; i < 3 && host.document.querySelector('[data-key="openTweaks"]'); i++) {
    const esc = new host.KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true })
    host.document.body.dispatchEvent(esc)
    await new Promise((r) => setTimeout(r, 120))
  }
  dropDialog()
  logseq.showMainUI({ autoFocus: true })
  dialog = mountTweaks(document, {
    features,
    getSettings: () => logseq.settings,
    set: (key, value) => logseq.updateSettings({ [key]: value }),
    onClose: closeTweaks,
    dark: host.document.documentElement.getAttribute('data-theme') === 'dark',
    font: host.getComputedStyle(host.document.body).fontFamily,
  })
}

function main() {
  useSettingsSchema(settingsSchema(features))
  logseq.provideModel({ openTweaks })
  logseq.App.registerCommandPalette({ key: 'inkwell-companion-tweaks', label: 'Inkwell Companion: Tweaks' }, openTweaks)
  logseq.on('ui:visible:changed', ({ visible }: { visible: boolean }) => {
    if (!visible) dropDialog()
  })
  loader.sync(logseq.settings)
  logseq.onSettingsChanged(() => {
    loader.sync(logseq.settings)
    dialog?.refresh()
  })
  logseq.beforeunload(async () => {
    closeTweaks()
    loader.stopAll()
  })
}

logseq.ready(main).catch(console.error)
