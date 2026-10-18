// What the Tweaks dialog and the settings page show: pure functions over the features and the settings.
import type { SettingItem } from '../sdk'
import type { Feature, Settings } from '../types'

export const ALL = 'All'

/** A switch is on unless the settings say false (features and options default to on). */
export const isOn = (settings: Settings, key: string): boolean => settings?.[key] !== false

/** 'All', then each category in the order features list them. */
export const categories = (features: readonly Feature[]): string[] => [ALL, ...new Set(features.map((f) => f.category))]

/** Does a feature show for this search text and category? Search looks in title, description, category, options. */
export function matches(feature: Feature, query: string, category: string): boolean {
  if (category !== ALL && feature.category !== category) return false
  const text = [feature.title, feature.description, feature.category, ...(feature.options ?? []).map((o) => o.label)]
    .join(' ')
    .toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((word) => text.includes(word))
}

/** The settings page: an Open Tweaks button, then per category a heading, each feature's switch and its options. */
export function settingsSchema(features: readonly Feature[]): SettingItem[] {
  const schema: SettingItem[] = [
    {
      key: 'openTweaks',
      type: 'button',
      title: 'Tweaks',
      description:
        'The same switches as below, as cards you can search. Also in the command palette: "Inkwell Companion: Tweaks".',
      buttonText: 'Open Tweaks',
      buttonAction: 'openTweaks',
    },
  ]
  for (const category of categories(features).slice(1)) {
    schema.push({
      key: `heading${category.replace(/\W/g, '')}`,
      type: 'heading',
      title: category,
      description: '',
      default: null,
    })
    for (const f of features.filter((x) => x.category === category)) {
      schema.push({ key: f.id, type: 'boolean', default: true, title: f.title, description: f.description })
      for (const o of f.options ?? []) {
        const description = `Used only while "${f.title}" is on.`
        schema.push({ key: o.key, type: 'boolean', default: true, title: `${f.title}: ${o.label}`, description })
      }
    }
  }
  return schema
}
