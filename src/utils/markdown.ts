import type { OutputData } from '../types'

const FORBIDDEN_TAGS = new Set([
  'SCRIPT',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'LINK',
  'META',
  'BASE',
  'FORM',
  'SVG',
  'MATH',
  'TEMPLATE',
  'NOSCRIPT',
])

const DANGEROUS_URI = /^(?:javascript|vbscript|data\s*:\s*text\/html)/i

function isDangerousUrl(value: string): boolean {
  const trimmed = value.trim().replace(/[\u0000-\u001f\u007f]/g, '')
  // Decode a few common entity / whitespace tricks before scheme check
  const decoded = trimmed
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&tab;|&newline;/gi, '')
    .replace(/\s+/g, '')
  return DANGEROUS_URI.test(decoded)
}

function scrubElement(el: Element): void {
  // Drop on* handlers (quoted or not) by clearing attributes
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase()
    if (name.startsWith('on')) {
      el.removeAttribute(attr.name)
      continue
    }
    if (name === 'href' || name === 'src' || name === 'xlink:href' || name === 'action' || name === 'formaction') {
      if (isDangerousUrl(attr.value)) {
        el.setAttribute(attr.name, '#')
      }
    }
    if (name === 'srcdoc') {
      el.removeAttribute(attr.name)
    }
  }
}

/**
 * DOM-based sanitizer for pasted / imported HTML.
 * Removes executable tags, event handlers, and dangerous URI schemes.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''
  if (typeof DOMParser === 'undefined') {
    // Non-DOM fallback (tests without jsdom full parser still get basic stripping)
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<(iframe|object|embed|svg|math)[\s\S]*?(<\/\1>|\/>)/gi, '')
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/(href|src)\s*=\s*(["']?)\s*(javascript|vbscript|data\s*:\s*text\/html)[^"'>\s]*/gi, '$1=$2#$2')
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT)
  const toRemove: Element[] = []

  let node = walker.currentNode as Element | null
  while (node) {
    if (FORBIDDEN_TAGS.has(node.tagName)) {
      toRemove.push(node)
    } else {
      scrubElement(node)
    }
    node = walker.nextNode() as Element | null
  }

  for (const el of toRemove) el.remove()
  return doc.body.innerHTML
}

/** Returns true when a URL is safe to use as an href (http/https/mailto/relative). */
export function isSafeHref(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed || trimmed.startsWith('#')) return true
  try {
    const parsed = new URL(trimmed, 'https://example.invalid')
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '')
}

/** Serializes saved block data to GFM-flavored markdown. */
export function blocksToMarkdown(data: OutputData): string {
  const lines: string[] = []
  for (const block of data.blocks) {
    switch (block.type) {
      case 'header': {
        const level = Number((block.data as { level?: number }).level ?? 2)
        lines.push(`${'#'.repeat(level)} ${stripTags((block.data as { text?: string }).text ?? '')}`)
        break
      }
      case 'paragraph':
        lines.push(stripTags((block.data as { text?: string }).text ?? ''))
        break
      case 'quote': {
        const text = stripTags((block.data as { text?: string }).text ?? '')
        const caption = stripTags((block.data as { caption?: string }).caption ?? '')
        lines.push(`> ${text}${caption ? `\n> — ${caption}` : ''}`)
        break
      }
      case 'list': {
        const { style, items } = block.data as { style?: string; items?: string[] }
        ;(items ?? []).forEach((item, i) => {
          lines.push(style === 'ordered' ? `${i + 1}. ${stripTags(item)}` : `- ${stripTags(item)}`)
        })
        break
      }
      case 'checklist': {
        const { items } = block.data as { items?: { text: string; checked: boolean }[] }
        for (const item of items ?? []) {
          lines.push(`- [${item.checked ? 'x' : ' '}] ${stripTags(item.text)}`)
        }
        break
      }
      case 'delimiter':
        lines.push('---')
        break
      case 'image': {
        const { url, caption } = block.data as { url?: string; caption?: string }
        lines.push(`![${stripTags(caption ?? '')}](${url ?? ''})`)
        break
      }
      default:
        break
    }
    lines.push('')
  }
  return lines.join('\n').trim() + '\n'
}
