import type { BlockTool, BlockToolConstructorOptions, BlockToolData, ConversionConfig } from '../types'

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

  static conversionConfig: ConversionConfig = {
    export: (data) =>
      ((data as ChecklistData).items ?? []).map((i) => i.text).join('\n'),
    import: (text) => ({
      items: text.split('\n').filter(Boolean).map((t) => ({ text: t, checked: false })),
    }),
  }

  static isReadOnlySupported = true

  private data: ChecklistData
  private readOnly: boolean
  private root: HTMLElement | null = null

  constructor({ data, readOnly }: BlockToolConstructorOptions<ChecklistData>) {
    this.data = data
    this.readOnly = !!readOnly
  }

  private renderRow(item: ChecklistItem): HTMLElement {
    const row = document.createElement('div')
    row.className = 'de-checklist-row'
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.checked = item.checked
    checkbox.disabled = this.readOnly
    const text = document.createElement('span')
    text.contentEditable = this.readOnly ? 'false' : 'true'
    text.className = 'de-checklist-text'
    text.innerHTML = item.text

    if (!this.readOnly) {
      text.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          e.stopPropagation()
          const newRow = this.renderRow({ text: '', checked: false })
          row.after(newRow)
          newRow.querySelector<HTMLElement>('.de-checklist-text')?.focus()
        } else if (e.key === 'Backspace' && text.textContent === '') {
          const rows = this.root?.querySelectorAll('.de-checklist-row')
          if (rows && rows.length > 1) {
            e.preventDefault()
            e.stopPropagation()
            const prev = row.previousElementSibling as HTMLElement | null
            row.remove()
            prev?.querySelector<HTMLElement>('.de-checklist-text')?.focus()
          }
        }
      })
    }

    row.append(checkbox, text)
    return row
  }

  render(): HTMLElement {
    const el = document.createElement('div')
    el.className = 'de-checklist'
    const items = this.data.items?.length ? this.data.items : [{ text: '', checked: false }]
    for (const item of items) el.appendChild(this.renderRow(item))
    this.root = el
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
