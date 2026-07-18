import type { BlockTool, BlockToolConstructorOptions, BlockToolData } from '../types'

interface ChecklistItem {
  text: string
  checked: boolean
}

interface ChecklistData extends BlockToolData {
  items?: ChecklistItem[]
}

export class ChecklistTool implements BlockTool {
  static toolbox = {
    title: 'Checklist',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4M3 12l3 3 3-3M3 19h6"/></svg>',
  }

  private data: ChecklistData

  constructor({ data }: BlockToolConstructorOptions<ChecklistData>) {
    this.data = data
  }

  private renderRow(item: ChecklistItem): HTMLElement {
    const row = document.createElement('div')
    row.className = 'de-checklist-row'
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.checked = item.checked
    const text = document.createElement('span')
    text.contentEditable = 'true'
    text.className = 'de-checklist-text'
    text.innerHTML = item.text
    row.append(checkbox, text)
    return row
  }

  render(): HTMLElement {
    const el = document.createElement('div')
    el.className = 'de-checklist'
    const items = this.data.items?.length ? this.data.items : [{ text: '', checked: false }]
    for (const item of items) el.appendChild(this.renderRow(item))
    return el
  }

  save(blockContent: HTMLElement): ChecklistData {
    const items = Array.from(blockContent.querySelectorAll<HTMLElement>('.de-checklist-row')).map((row) => ({
      text: row.querySelector('.de-checklist-text')?.innerHTML ?? '',
      checked: row.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked ?? false,
    }))
    return { items }
  }
}
