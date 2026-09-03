import type { BlockTool, BlockToolConstructorOptions, BlockToolData, ConversionConfig, PasteConfig } from '../types'

interface HeaderData extends BlockToolData {
  text?: string
  level?: 1 | 2 | 3
}

export class HeaderTool implements BlockTool {
  static toolbox = {
    title: 'Heading',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4v16M18 4v16M6 12h12"/></svg>',
  }

  static pasteConfig: PasteConfig = {
    tags: ['H1', 'H2', 'H3'],
  }

  static conversionConfig: ConversionConfig = {
    export: (data) => String((data as HeaderData).text ?? ''),
    import: (text) => ({ text, level: 2 as const }),
  }

  static shortcut = 'CMD+SHIFT+H'
  static isReadOnlySupported = true

  private data: HeaderData
  private readOnly: boolean
  private element: HTMLElement | null = null

  constructor({ data, readOnly }: BlockToolConstructorOptions<HeaderData>) {
    this.data = { level: data.level ?? 2, text: data.text }
    this.readOnly = !!readOnly
  }

  render(): HTMLElement {
    const level = this.data.level ?? 2
    // Use a div so level changes don't replace the node Block holds as content.
    const el = document.createElement('div')
    el.contentEditable = this.readOnly ? 'false' : 'true'
    el.className = 'de-header'
    el.dataset.level = String(level)
    el.setAttribute('role', 'heading')
    el.setAttribute('aria-level', String(level))
    el.dataset.placeholder = 'Heading'
    el.innerHTML = this.data.text ?? ''
    this.element = el
    return el
  }

  renderSettings(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'de-header-settings'
    for (const level of [1, 2, 3] as const) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className =
        'de-settings-btn' + ((this.data.level ?? 2) === level ? ' de-settings-active' : '')
      btn.textContent = `H${level}`
      btn.addEventListener('click', () => {
        this.setLevel(level)
        wrap.querySelectorAll('.de-settings-btn').forEach((b) => b.classList.remove('de-settings-active'))
        btn.classList.add('de-settings-active')
      })
      wrap.appendChild(btn)
    }
    return wrap
  }

  private setLevel(level: 1 | 2 | 3): void {
    this.data.level = level
    if (!this.element) return
    this.element.dataset.level = String(level)
    this.element.setAttribute('aria-level', String(level))
  }

  save(blockContent: HTMLElement): HeaderData {
    const level = Number(blockContent.dataset.level ?? this.data.level ?? 2) as 1 | 2 | 3
    return { text: blockContent.innerHTML, level }
  }
}
