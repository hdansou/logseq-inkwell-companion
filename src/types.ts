// Shared types. No SDK import: the `logseq` global is only touched in index.ts and sdk.ts.

/** The plugin's settings as Logseq stores them: switch keys to booleans (missing means on). */
export type Settings = Readonly<Record<string, unknown>> | undefined

/** The three ways to read the graph a feature needs (logseq.DB), injected so tests can pass fakes. */
export interface Db {
  /** datascriptQuery: rows of a :find query */
  q(query: string): Promise<unknown[][] | null>
  /** DB.q: a simple (DSL) query's blocks */
  dsl(query: string): Promise<unknown[] | null>
  /** DB.customQuery: an advanced query's blocks */
  custom(query: string): Promise<unknown[] | null>
}

/** What a feature may ask of Logseq besides its page (`host`). */
export interface Sdk {
  settings(): Settings
  showMsg(text: string, status: 'success' | 'warning' | 'error'): void
  db: Db
}

/** Logseq's window, with its own constructors (URL, Blob, MutationObserver…), not the plugin frame's. */
export type Host = Window & typeof globalThis

/** An extra switch on a feature (its own settings key, on by default), shown on the feature's Tweaks card. */
export interface FeatureOption {
  key: string
  label: string
}

/**
 * One fix, with its own switch. `id` is the settings key; `start` gets Logseq's window (`host`) and returns a
 * function that undoes everything it did.
 */
export interface Feature {
  id: string
  title: string
  description: string
  category: string
  options?: FeatureOption[]
  start(host: Host, sdk: Sdk): () => void
}
