import type { BlockTool, BlockToolConstructorOptions, BlockToolData } from '../types'

interface HeaderData extends BlockToolData {
  text?: string
  level?: 1 | 2 | 3
}

export class HeaderTool implements BlockTool {
  static toolbox = {
    title: 'Heading',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4v16M18 4v16M6 12h12"/></svg>',
  }

  private data: HeaderData

  constructor({ data }: BlockToolConstructorOptions<HeaderData>) {
    this.data = data
  }

  render(): HTMLElement {
    const level = this.data.level ?? 2
    const el = document.createElement(`h${level}`)
    el.contentEditable = 'true'
    el.className = 'de-header'
    el.dataset.level = String(level)
    el.dataset.placeholder = 'Heading'
    el.innerHTML = this.data.text ?? ''
    return el
  }

  save(blockContent: HTMLElement): HeaderData {
    const level = Number(blockContent.dataset.level ?? 2) as 1 | 2 | 3
    return { text: blockContent.innerHTML, level }
  }
}
