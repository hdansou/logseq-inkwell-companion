// One way to build elements, for the Tweaks dialog (plugin frame) and the Export menu (Logseq's page).

type Child = Node | string | null | undefined | false
export interface Props {
  class?: string
  /** trusted markup only (the plugin's own icons) */
  html?: string
  style?: Partial<CSSStyleDeclaration>
  [attrOrHandler: string]: unknown
}

/** An element in `doc`: `on…` props become listeners, `class` / `html` / `style` set those, the rest attributes. */
export function el<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = doc.createElement(tag)
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue
    if (k === 'class') node.className = String(v)
    else if (k === 'html') node.innerHTML = String(v)
    else if (k === 'style') Object.assign(node.style, v)
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v as EventListener)
    else node.setAttribute(k, String(v))
  }
  for (const c of children) if (c) node.append(c)
  return node
}
