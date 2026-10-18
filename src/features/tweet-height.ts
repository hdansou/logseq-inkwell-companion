// Sizes {{twitter}} embeds to their content. Core renders the tweet as a cross-origin iframe (iframe.tweet-embed,
// inline min-height 240px) and never resizes it; the embed reports its height to the page (twttr.private.resize).
import type { Feature } from '../types'

const ORIGIN = 'https://platform.twitter.com'

/** The height (px) in a Twitter embed resize message, or null for any other message. */
export function parseResize(data: unknown): number | null {
  let msg = data
  if (typeof msg === 'string') {
    try {
      msg = JSON.parse(msg)
    } catch {
      return null
    }
  }
  const embed = (msg as { 'twttr.embed'?: { method?: string; params?: { height?: unknown }[] } } | null)?.[
    'twttr.embed'
  ]
  const height = embed?.method === 'twttr.private.resize' ? embed.params?.[0]?.height : undefined
  return typeof height === 'number' && height > 0 ? Math.ceil(height) : null
}

export const tweetHeight: Feature = {
  id: 'tweetHeight',
  title: 'Fit embedded tweets to their content',
  description: 'Core shows {{twitter …}} embeds in a short box you scroll inside. This sizes each one to its tweet.',
  category: 'Embeds',
  start(host) {
    const sized = new Set<HTMLIFrameElement>() // iframes this feature set a height on, cleared again by stop
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== ORIGIN) return
      const height = parseResize(e.data)
      if (height === null) return
      for (const frame of host.document.querySelectorAll<HTMLIFrameElement>('iframe.tweet-embed')) {
        if (frame.contentWindow !== e.source) continue
        frame.style.height = `${height}px`
        sized.add(frame)
      }
    }
    host.addEventListener('message', onMessage)
    return () => {
      host.removeEventListener('message', onMessage)
      for (const frame of sized) frame.style.height = ''
      sized.clear()
    }
  },
}
