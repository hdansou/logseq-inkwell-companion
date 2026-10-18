// Sizes {{twitter}} embeds to their content. Core renders the tweet as a cross-origin iframe (iframe.tweet-embed,
// inline min-height 240px) and never resizes it; the embed reports its height to the page (twttr.private.resize).
(function (root) {
  const ORIGIN = 'https://platform.twitter.com'

  /** The height (px) in a Twitter embed resize message, or null for any other message. */
  function parseResize(data) {
    if (typeof data === 'string') {
      try { data = JSON.parse(data) } catch { return null }
    }
    const msg = data && data['twttr.embed']
    const height = msg && msg.method === 'twttr.private.resize' && msg.params && msg.params[0] && msg.params[0].height
    return height > 0 ? Math.ceil(height) : null
  }

  const feature = {
    id: 'tweetHeight',
    title: 'Fit embedded tweets to their content',
    description: 'Core shows {{twitter …}} embeds in a short box you scroll inside. This sizes each one to its tweet.',
    category: 'Embeds',
    parseResize,
    start(host) {
      const onMessage = (e) => {
        if (e.origin !== ORIGIN) return
        const height = parseResize(e.data)
        if (height === null) return
        for (const frame of host.document.querySelectorAll('iframe.tweet-embed')) {
          if (frame.contentWindow === e.source) frame.style.height = `${height}px`
        }
      }
      host.addEventListener('message', onMessage)
      return () => host.removeEventListener('message', onMessage)
    },
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = feature
  else (root.InkwellCompanion = root.InkwellCompanion || { features: [] }).features.push(feature)
})(typeof window !== 'undefined' ? window : globalThis)
