// The one place that adapts `logseq.*` to this plugin's types. No SDK import: the global comes from index.ts.
import type { SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin'
import type { Sdk } from './types'

/** The SDK calls features use, wrapped so they can be injected (tests pass fakes). */
export const makeSdk = (): Sdk => ({
  settings: () => logseq.settings,
  showMsg: (text, status) => void logseq.UI.showMsg(text, status),
  db: {
    q: (query) => logseq.DB.datascriptQuery<unknown[][] | null>(query),
    dsl: (query) => logseq.DB.q<unknown[] | null>(query),
    custom: (query) => logseq.DB.customQuery<unknown[] | null>(query),
  },
})

/**
 * A settings-page button (core `render-item-button`, logseq 2026-08-26, in Logseq-DB 2.0.2): clicking it calls the
 * `provideModel` method named in `buttonAction`. @logseq/libs 0.3.4's SettingSchemaDesc predates it.
 */
export interface SettingButton {
  key: string
  type: 'button'
  title: string
  description: string
  buttonText: string
  buttonAction: string
  default?: undefined
}

export type SettingItem = SettingSchemaDesc | SettingButton

export const useSettingsSchema = (schema: SettingItem[]): void => {
  logseq.useSettingsSchema(schema as SettingSchemaDesc[])
}
