import { sanitizeHtml } from '../utils/markdown'
import type { BlockToolData, PasteConfig, ResolvedTool, SanitizeConfig } from '../types'

export interface PasteBlockResult {
  type: string
  data: BlockToolData
}

export interface PastePipelineOptions {
  tools: Map<string, ResolvedTool>
  defaultBlock: string
  sanitize?: SanitizeConfig
}

/**
 * Converts clipboard HTML / plain text into one or more block payloads.
 */
export function processPaste(
  event: ClipboardEvent,
  options: PastePipelineOptions
): PasteBlockResult[] | null {
  const clipboard = event.clipboardData
  if (!clipboard) return null

  const html = clipboard.getData('text/html')
  const text = clipboard.getData('text/plain')

  if (html && html.trim()) {
    const cleaned = applySanitize(html, options.sanitize)
    const fromHtml = parseHtmlToBlocks(cleaned, options)
    if (fromHtml.length) return fromHtml
  }

  if (text && text.trim()) {
    return parsePlainTextToBlocks(text, options)
  }

  return null
}

function applySanitize(html: string, config?: SanitizeConfig): string {
  // Always sanitize — `enabled: false` is ignored to prevent XSS bypass.
  void config?.enabled
  let out = sanitizeHtml(html)
  for (const tag of config?.forbidTags ?? []) {
    const re = new RegExp(`<${tag}[\\s\\S]*?(</${tag}>|/>)`, 'gi')
    out = out.replace(re, '')
  }
  return out
}

function parseHtmlToBlocks(html: string, options: PastePipelineOptions): PasteBlockResult[] {
  const container = document.createElement('div')
  container.innerHTML = html
  const results: PasteBlockResult[] = []

  const children = Array.from(container.childNodes)
  if (children.length === 0) return results

  for (const node of children) {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent?.trim()
      if (t) results.push({ type: options.defaultBlock, data: { text: escapeHtml(t) } })
      continue
    }
    if (!(node instanceof HTMLElement)) continue

    const tag = node.tagName.toUpperCase()

    // Handle lists before pasteConfig matching — ListTool.conversionConfig.import
    // splits on newlines and cannot parse <li> children.
    if (tag === 'UL' || tag === 'OL') {
      const items = Array.from(node.querySelectorAll(':scope > li')).map((li) => li.innerHTML)
      results.push({
        type: options.tools.has('list') ? 'list' : options.defaultBlock,
        data: options.tools.has('list')
          ? { style: tag === 'OL' ? 'ordered' : 'unordered', items }
          : { text: items.join('<br>') },
      })
      continue
    }

    const matched = findToolForTag(tag, options.tools)
    if (matched) {
      const data = matched.class.conversionConfig?.import
        ? matched.class.conversionConfig.import(node.innerHTML)
        : htmlElementToData(tag, node)
      results.push({ type: matched.name, data })
    } else if (tag === 'P' || tag === 'DIV') {
      const inner = node.innerHTML.trim()
      if (inner) results.push({ type: options.defaultBlock, data: { text: inner } })
    } else if (tag === 'BLOCKQUOTE') {
      results.push({
        type: options.tools.has('quote') ? 'quote' : options.defaultBlock,
        data: options.tools.has('quote')
          ? { text: node.innerHTML, caption: '' }
          : { text: node.innerHTML },
      })
    } else if (tag === 'HR') {
      if (options.tools.has('delimiter')) results.push({ type: 'delimiter', data: {} })
    } else {
      const text = node.innerHTML.trim()
      if (text) results.push({ type: options.defaultBlock, data: { text } })
    }
  }

  return results
}

function htmlElementToData(tag: string, el: HTMLElement): BlockToolData {
  if (tag.startsWith('H') && tag.length === 2) {
    const level = Number(tag[1]) as 1 | 2 | 3
    return { text: el.innerHTML, level: level >= 1 && level <= 3 ? level : 2 }
  }
  if (tag === 'IMG') {
    return { url: (el as HTMLImageElement).src, caption: (el as HTMLImageElement).alt ?? '' }
  }
  return { text: el.innerHTML }
}

function findToolForTag(tag: string, tools: Map<string, ResolvedTool>): ResolvedTool | undefined {
  for (const tool of tools.values()) {
    const paste: PasteConfig | undefined = tool.class.pasteConfig
    if (paste?.tags?.some((t) => t.toUpperCase() === tag)) return tool
  }
  // Built-in heuristics when pasteConfig is missing
  if (tag === 'H1' || tag === 'H2' || tag === 'H3') return tools.get('header')
  if (tag === 'IMG') return tools.get('image')
  return undefined
}

function parsePlainTextToBlocks(text: string, options: PastePipelineOptions): PasteBlockResult[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const results: PasteBlockResult[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    let matched = false
    for (const tool of options.tools.values()) {
      const patterns = tool.class.pasteConfig?.patterns
      if (!patterns) continue
      for (const pattern of patterns) {
        if (pattern.test(trimmed)) {
          const data = tool.class.conversionConfig?.import?.(trimmed) ?? { text: escapeHtml(trimmed) }
          results.push({ type: tool.name, data })
          matched = true
          break
        }
      }
      if (matched) break
    }
    if (matched) continue

    // Markdown-ish heuristics
    const headerMatch = /^(#{1,3})\s+(.*)$/.exec(trimmed)
    if (headerMatch && options.tools.has('header')) {
      results.push({
        type: 'header',
        data: { text: escapeHtml(headerMatch[2]!), level: headerMatch[1]!.length as 1 | 2 | 3 },
      })
      continue
    }
    if (/^---+$/.test(trimmed) && options.tools.has('delimiter')) {
      results.push({ type: 'delimiter', data: {} })
      continue
    }
    if (/^[-*]\s+\[[ xX]\]\s+/.test(trimmed) && options.tools.has('checklist')) {
      const checked = /\[[xX]\]/.test(trimmed)
      const itemText = trimmed.replace(/^[-*]\s+\[[ xX]\]\s+/, '')
      results.push({ type: 'checklist', data: { items: [{ text: escapeHtml(itemText), checked }] } })
      continue
    }
    if (/^[-*]\s+/.test(trimmed) && options.tools.has('list')) {
      results.push({
        type: 'list',
        data: { style: 'unordered', items: [escapeHtml(trimmed.replace(/^[-*]\s+/, ''))] },
      })
      continue
    }
    if (/^\d+\.\s+/.test(trimmed) && options.tools.has('list')) {
      results.push({
        type: 'list',
        data: { style: 'ordered', items: [escapeHtml(trimmed.replace(/^\d+\.\s+/, ''))] },
      })
      continue
    }

    results.push({ type: options.defaultBlock, data: { text: escapeHtml(trimmed) } })
  }

  return results
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
