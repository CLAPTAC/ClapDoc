import type { BlockTool, BlockToolConstructorOptions, BlockToolData, ConversionConfig, PasteConfig } from '../types'

interface ListData extends BlockToolData {
  style?: 'ordered' | 'unordered'
  items?: string[]
}

export class ListTool implements BlockTool {
  static toolbox = {
    title: 'List',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  }

  static pasteConfig: PasteConfig = {
    tags: ['UL', 'OL'],
  }

  static conversionConfig: ConversionConfig = {
    export: (data) => ((data as ListData).items ?? []).join('\n'),
    import: (text) => ({
      style: 'unordered' as const,
      items: text.split('\n').filter(Boolean),
    }),
  }

  static isReadOnlySupported = true

  private data: ListData
  private readOnly: boolean
  private element: HTMLElement | null = null

  constructor({ data, readOnly }: BlockToolConstructorOptions<ListData>) {
    this.data = data
    this.readOnly = !!readOnly
  }

  render(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'de-list-wrap'
    this.element = wrap
    this.mountList(wrap)
    return wrap
  }

  private mountList(wrap: HTMLElement): void {
    wrap.innerHTML = ''
    const style = this.data.style ?? 'unordered'
    const el = document.createElement(style === 'ordered' ? 'ol' : 'ul')
    el.contentEditable = this.readOnly ? 'false' : 'true'
    el.className = 'de-list'
    el.dataset.style = style
    const items = this.data.items?.length ? this.data.items : ['']
    for (const item of items) {
      const li = document.createElement('li')
      li.innerHTML = item
      el.appendChild(li)
    }

    if (!this.readOnly) {
      el.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.stopPropagation()
        }
        if (e.key === 'Tab') {
          e.preventDefault()
          document.execCommand(e.shiftKey ? 'outdent' : 'indent')
        }
      }
    }

    wrap.appendChild(el)
  }

  renderSettings(): HTMLElement {
    const panel = document.createElement('div')
    panel.className = 'de-list-settings'
    for (const style of ['unordered', 'ordered'] as const) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className =
        'de-settings-btn' + ((this.data.style ?? 'unordered') === style ? ' de-settings-active' : '')
      btn.textContent = style === 'ordered' ? '1.' : '•'
      btn.title = style
      btn.addEventListener('click', () => {
        if (!this.element) return
        // Persist current items before switching style
        const current = this.save(this.element)
        this.data = { ...current, style }
        this.mountList(this.element)
        panel.querySelectorAll('.de-settings-btn').forEach((b) => b.classList.remove('de-settings-active'))
        btn.classList.add('de-settings-active')
      })
      panel.appendChild(btn)
    }
    return panel
  }

  save(blockContent: HTMLElement): ListData {
    const list = blockContent.querySelector('.de-list') ?? blockContent
    const items = Array.from(list.querySelectorAll('li')).map((li) => li.innerHTML)
    const style =
      (list instanceof HTMLElement ? (list.dataset.style as ListData['style']) : undefined) ??
      this.data.style ??
      'unordered'
    return { style, items }
  }
}
