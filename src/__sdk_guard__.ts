import '@logseq/libs'

// Compile-time guard: references an API introduced in @logseq/libs ≥ 0.3.1. If this file fails typecheck, upgrade
// the SDK. Never imported, so it is not in the bundle.
export const _sdkGuard: typeof logseq.App.getCurrentRoute = logseq.App.getCurrentRoute
