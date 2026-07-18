import type { OutputData } from '../types'

// Strips executable content from user/tool-provided HTML before it's ever
// inserted into contenteditable DOM or exported. Ported from this repo's
// lib/markdown.js, which guards the same class of injection in the TipTap
// based editor (script tags, event handlers, javascript: URLs).
export function sanitizeHtml(html: string): string {
  return (html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<(iframe|object|embed)[\s\S]*?(<\/\1>|\/>)/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1=$2#$2')
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
