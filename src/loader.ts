// Starts the features that are switched on and stops the ones switched off, each at most once.
import { isOn } from './tweaks/model'
import type { Feature, Host, Sdk, Settings } from './types'

export function createLoader(features: readonly Feature[], host: Host, sdk: Sdk) {
  const running = new Map<string, () => void>()
  return {
    sync(settings: Settings): void {
      for (const f of features) {
        const stop = running.get(f.id)
        if (isOn(settings, f.id) && !stop) running.set(f.id, f.start(host, sdk))
        if (!isOn(settings, f.id) && stop) {
          stop()
          running.delete(f.id)
        }
      }
    },
    stopAll(): void {
      for (const stop of running.values()) stop()
      running.clear()
    },
  }
}
