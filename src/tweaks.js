// The Tweaks dialog: a card per feature (search, category filters, the feature's options on its card when it is on).
// It reads and writes the plugin's settings, which stay the store; the settings page shows the same switches.
// Drawn in the plugin's own frame (logseq.showMainUI), not in Logseq's page.
(function (root) {
  const ALL = 'All'

  // ---------- pure ----------

  /** A switch is on unless the settings say false (features and options default to on). */
  const isOn = (settings, key) => !settings || settings[key] !== false

  /** 'All', then each category in the order features list them. */
  function categories(features) {
    return [ALL, ...new Set(features.map((f) => f.category || 'Other'))]
  }

  /** Does a feature show for this search text and category? Search looks in title, description, category, options. */
  function matches(feature, query, category) {
    if (category && category !== ALL && (feature.category || 'Other') !== category) return false
    const words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean)
    const text = [feature.title, feature.description, feature.category, ...(feature.options || []).map((o) => o.label)]
      .join(' ').toLowerCase()
    return words.every((w) => text.includes(w))
  }

  /** The settings page: an Open Tweaks button, then per category a heading, each feature's switch and its options. */
  function settingsSchema(features) {
    const schema = [{
      key: 'openTweaks', type: 'button', title: 'Tweaks',
      description: 'The same switches as below, as cards you can search. Also in the command palette: "Inkwell Companion: Tweaks".',
      buttonText: 'Open Tweaks', buttonAction: 'openTweaks',
    }]
    for (const category of categories(features).slice(1)) {
      schema.push({ key: `heading${category.replace(/\W/g, '')}`, type: 'heading', title: category, description: '' })
      for (const f of features.filter((x) => (x.category || 'Other') === category)) {
        schema.push({ key: f.id, type: 'boolean', default: true, title: f.title, description: f.description })
        for (const o of f.options || []) {
          schema.push({ key: o.key, type: 'boolean', default: true, title: `${f.title}: ${o.label}`, description: `Used only while "${f.title}" is on.` })
        }
      }
    }
    return schema
  }

  // ---------- DOM ----------

  const CSS = `
.ikw-tweaks{--bg:#f5f5f7;--surface:#fff;--fill:#7878801a;--line:#d2d2d7;--line-soft:#e8e8ed;--label:#1d1d1f;--label-2:#5f5f64;
  --label-3:#6e6e73;--tint:#223b3b;--on-tint:#fff;--scrim:rgba(0,0,0,.28);--off:#aeaeb2;--focus:#2f6f6f;
  --shadow:0 0 0 .5px rgba(0,0,0,.12),0 12px 40px rgba(0,0,0,.18)}
.ikw-tweaks.dark{--surface:#1c1c1e;--fill:#7878802e;--line:#48484a;--line-soft:#2c2c2e;--label:#f5f5f7;--label-2:#a1a1a6;
  --label-3:#98989d;--tint:#b3c6c6;--on-tint:#000;--scrim:rgba(0,0,0,.55);--off:#636366;--focus:#b3c6c6;
  --shadow:0 0 0 .5px rgba(255,255,255,.12),0 12px 40px rgba(0,0,0,.6)}
html,body{margin:0;background:transparent}
.ikw-tweaks{position:fixed;inset:0;display:flex;align-items:flex-start;justify-content:center;padding:56px 16px;box-sizing:border-box;
  background:var(--scrim);color:var(--label);font-size:14px;overflow:auto}
.ikw-tweaks *{box-sizing:border-box}
.ikw-tweaks button{font:inherit;cursor:pointer}
.ikw-tweaks :focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.ikw-dialog{width:min(940px,100%);max-height:calc(100vh - 112px);display:flex;flex-direction:column;background:var(--surface);
  border-radius:14px;box-shadow:var(--shadow)}
.ikw-head{padding:24px 28px 16px;display:flex;align-items:flex-start;gap:16px;border-bottom:1px solid var(--line-soft)}
.ikw-head div{flex:1;display:flex;flex-direction:column;gap:4px}
.ikw-head h1{margin:0;font-size:22px;font-weight:700}
.ikw-head p{margin:0;color:var(--label-2)}
.ikw-close{width:36px;height:36px;border:0;border-radius:8px;background:var(--fill);color:var(--label-2);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ikw-bar{padding:14px 28px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.ikw-search{display:flex;align-items:center;gap:8px;height:36px;padding:0 12px;border-radius:8px;background:var(--fill);width:260px;max-width:100%;color:var(--label-3)}
.ikw-search input{border:0;outline:0;background:transparent;font:inherit;color:var(--label);width:100%}
.ikw-search:focus-within{outline:2px solid var(--focus);outline-offset:2px}
.ikw-tweaks .ikw-search input:focus-visible{outline:0}
.ikw-cats{display:flex;gap:6px;flex-wrap:wrap}
.ikw-pill{height:32px;padding:0 12px;border-radius:16px;font-size:13px;border:1px solid var(--line);background:transparent;color:var(--label-2)}
.ikw-pill[aria-pressed=true]{border-color:var(--tint);background:var(--tint);color:var(--on-tint)}
.ikw-grid{flex:1;overflow:auto;padding:4px 28px 20px;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(380px,100%),1fr));gap:14px;align-content:start}
.ikw-card{border:1px solid var(--line-soft);border-radius:12px;padding:16px 18px;display:flex;flex-direction:column;gap:10px}
.ikw-card-top{display:flex;align-items:center;gap:8px}
.ikw-cat{flex:1;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--label-3)}
.ikw-switch{width:44px;height:26px;border-radius:13px;border:0;padding:0;position:relative;flex-shrink:0;background:var(--off)}
.ikw-switch[aria-checked=true]{background:var(--tint)}
.ikw-switch span{position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:10px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:left .15s}
.ikw-switch[aria-checked=true] span{left:21px}
.ikw-title{font-size:16px;font-weight:700}
.ikw-desc{line-height:1.45;color:var(--label-2)}
.ikw-options{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding-top:10px;border-top:1px solid var(--line-soft)}
.ikw-options>span{font-size:13px;color:var(--label-2);margin-right:4px}
.ikw-empty{grid-column:1/-1;padding:24px 0;color:var(--label-2)}
.ikw-foot{padding:14px 28px;border-top:1px solid var(--line-soft);display:flex;align-items:center;gap:12px;font-size:13px;color:var(--label-2);flex-wrap:wrap}
.ikw-foot span:first-child{flex:1}
@media (prefers-reduced-motion:reduce){.ikw-switch span{transition:none}}
`

  const CLOSE_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  const SEARCH_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>'

  /**
   * Draws the dialog into `doc` (the plugin frame's document). `getSettings()` returns the current settings,
   * `set(key, value)` saves one, `onClose()` hides the frame. Returns { refresh, destroy }: call refresh when the
   * settings change, destroy to remove everything.
   */
  function mount(doc, { features, getSettings, set, onClose, dark, font }) {
    const el = (tag, props, ...children) => {
      const n = doc.createElement(tag)
      for (const [k, v] of Object.entries(props || {})) {
        if (k === 'class') n.className = v
        else if (k === 'html') n.innerHTML = v
        else if (k.startsWith('on')) n.addEventListener(k.slice(2), v)
        else n.setAttribute(k, v)
      }
      for (const c of children) if (c != null) n.append(c)
      return n
    }
    let query = ''
    let category = ALL
    const pending = {} // values saved but not yet echoed back by onSettingsChanged
    const settings = () => ({ ...getSettings(), ...pending })
    const toggle = (key) => { const v = !isOn(settings(), key); pending[key] = v; set(key, v); draw() }

    const style = el('style', null, CSS)
    const search = el('input', { type: 'search', placeholder: 'Search tweaks', 'aria-label': 'Search tweaks',
      oninput: (e) => { query = e.target.value; draw() } })
    const cats = el('div', { class: 'ikw-cats', role: 'group', 'aria-label': 'Category' })
    const grid = el('div', { class: 'ikw-grid' })
    const count = el('span')
    const dialog = el('div', { class: 'ikw-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ikw-title' },
      el('div', { class: 'ikw-head' },
        el('div', null, el('h1', { id: 'ikw-title' }, 'Tweaks'),
          el('p', null, 'Inkwell Companion. Turn on the fixes you want; each one applies right away.')),
        el('button', { type: 'button', class: 'ikw-close', 'aria-label': 'Close', html: CLOSE_ICON, onclick: () => onClose() })),
      el('div', { class: 'ikw-bar' }, el('label', { class: 'ikw-search', html: SEARCH_ICON }, search), cats),
      grid,
      el('div', { class: 'ikw-foot' }, el('span', null, 'Saved in Settings › Plugins › Inkwell Companion too.'), count))
    const overlay = el('div', { class: `ikw-tweaks${dark ? ' dark' : ''}` }, dialog)
    if (font) overlay.style.fontFamily = font
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) onClose() })
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      if (e.key !== 'Tab') return
      // keep Tab inside the dialog: past the last control back to the first, and the other way
      const items = [...dialog.querySelectorAll('button, input')]
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus() }
    }
    doc.addEventListener('keydown', onKey)

    function draw() {
      const s = settings()
      const focused = doc.activeElement && doc.activeElement.dataset && doc.activeElement.dataset.key
      cats.replaceChildren(...categories(features).map((c) => el('button', {
        type: 'button', class: 'ikw-pill', 'aria-pressed': String(c === category), 'data-key': `cat:${c}`,
        onclick: () => { category = c; draw() },
      }, c)))
      const shown = features.filter((f) => matches(f, query, category))
      grid.replaceChildren(...shown.map((f) => {
        const on = isOn(s, f.id)
        return el('div', { class: 'ikw-card' },
          el('div', { class: 'ikw-card-top' },
            el('span', { class: 'ikw-cat' }, f.category || 'Other'),
            el('button', { type: 'button', role: 'switch', class: 'ikw-switch', 'aria-checked': String(on), 'aria-label': f.title,
              'data-key': f.id, onclick: () => toggle(f.id) }, el('span'))),
          el('div', { class: 'ikw-title' }, f.title),
          el('div', { class: 'ikw-desc' }, f.description),
          on && f.options && f.options.length ? el('div', { class: 'ikw-options', role: 'group', 'aria-label': `${f.title} options` },
            el('span', null, 'Options'),
            ...f.options.map((o) => el('button', { type: 'button', class: 'ikw-pill', 'aria-pressed': String(isOn(s, o.key)),
              'data-key': o.key, onclick: () => toggle(o.key) }, o.label))) : null)
      }))
      if (!shown.length) grid.append(el('div', { class: 'ikw-empty' }, query ? `No tweaks match "${query}".` : 'No tweaks in this category.'))
      count.textContent = `${features.filter((f) => isOn(s, f.id)).length} of ${features.length} on`
      const again = focused && doc.querySelector(`[data-key="${focused}"]`)
      if (again) again.focus()
    }

    doc.head.append(style)
    doc.body.append(overlay)
    draw()
    // the frame is shown and focused by the host after this runs
    const focusTimer = setTimeout(() => { doc.defaultView.focus(); search.focus() }, 60)
    return {
      refresh() { for (const k of Object.keys(pending)) delete pending[k]; draw() },
      destroy() { clearTimeout(focusTimer); doc.removeEventListener('keydown', onKey); overlay.remove(); style.remove() },
    }
  }

  const api = { isOn, categories, matches, settingsSchema, mount }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else (root.InkwellCompanion = root.InkwellCompanion || { features: [] }).tweaks = api
})(typeof window !== 'undefined' ? window : globalThis)
