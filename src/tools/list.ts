import type { BlockTool, BlockToolConstructorOptions, BlockToolData } from '../types'

interface ListData extends BlockToolData {
  style?: 'ordered' | 'unordered'
  items?: string[]
}

export class ListTool implements BlockTool {
  static toolbox = {
    title: 'List',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  }

  private data: ListData

  constructor({ data }: BlockToolConstructorOptions<ListData>) {
    this.data = data
  }

  render(): HTMLElement {
    const style = this.data.style ?? 'unordered'
    const el = document.createElement(style === 'ordered' ? 'ol' : 'ul')
    el.contentEditable = 'true'
    el.className = 'de-list'
    el.dataset.style = style
    const items = this.data.items?.length ? this.data.items : ['']
    for (const item of items) {
      const li = document.createElement('li')
      li.innerHTML = item
      el.appendChild(li)
    }
    return el
  }

  save(blockContent: HTMLElement): ListData {
    const items = Array.from(blockContent.querySelectorAll('li')).map((li) => li.innerHTML)
    return { style: blockContent.dataset.style as ListData['style'], items }
  }
}
