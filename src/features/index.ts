// Every feature, in the order the Tweaks dialog and the settings page list them.

import type { Feature } from '../types'
import { tableExport } from './table-export'
import { tweetHeight } from './tweet-height'

export const features: readonly Feature[] = [tableExport, tweetHeight]
