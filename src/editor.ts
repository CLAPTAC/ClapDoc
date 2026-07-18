import { Block, generateBlockId } from './block'
import type { EditorAPI, EditorConfig, EditorTools, OutputData, BlockToolData } from './types'
import { ParagraphTool } from './tools/paragraph'
import { HeaderTool } from './tools/header'
import { ListTool } from './tools/list'
import { ChecklistTool } from './tools/checklist'
import { QuoteTool } from './tools/quote'
import { DelimiterTool } from './tools/delimiter'
import { ImageTool } from './tools/image'

export const DEFAULT_TOOLS: EditorTools = {
  paragraph: ParagraphTool,
  header: HeaderTool,
  list: ListTool,
  checklist: ChecklistTool,
  quote: QuoteTool,
  delimiter: DelimiterTool,
  image: ImageTool,
}

const CHANGE_DEBOUNCE_MS = 300

export class Editor {
  private holder: HTMLElement
  private tools: EditorTools
  private blocks: Block[] = []
  private root: HTMLElement
  private blocksEl: HTMLElement
  private menuEl: HTMLElement | null = null
  private config: EditorConfig
  private changeTimer: ReturnType<typeof setTimeout> | null = null
  private api: EditorAPI

  constructor(config: EditorConfig) {
    this.config = config
    this.tools = { ...DEFAULT_TOOLS, ...(config.tools ?? {}) }

    const holder =
      typeof config.holder === 'string' ? document.querySelector<HTMLElement>(config.holder) : config.holder
    if (!holder) throw new Error('[doc-editor] holder element not found')
    this.holder = holder

    this.root = document.createElement('div')
    this.root.className = 'de-root'
    if (config.readOnly) this.root.classList.add('de-readonly')

    this.blocksEl = document.createElement('div')
    this.blocksEl.className = 'de-blocks'
    this.root.appendChild(this.blocksEl)
    this.holder.appendChild(this.root)

    this.api = this.buildApi()

    this.blocksEl.addEventListener('keydown', this.handleKeydown)
    this.blocksEl.addEventListener('input', this.scheduleChange)
    this.blocksEl.addEventListener('click', this.handleBlockClick)
    document.addEventListener('click', this.handleOutsideClick)

    if (config.data?.blocks?.length) {
      for (const b of config.data.blocks) this.appendBlock(b.type, b.data, b.id)
    } else {
      this.appendBlock(config.defaultBlock ?? 'paragraph', {})
    }
  }

  private buildApi(): EditorAPI {
    return {
      blocks: {
        insertAfter: (blockId, type, data) => this.insertAfter(blockId, type ?? this.config.defaultBlock ?? 'paragraph', data ?? {}),
        delete: (blockId) => this.deleteBlock(blockId),
        move: (blockId, direction) => this.moveBlock(blockId, direction),
        getCount: () => this.blocks.length,
      },
      caret: {
        focusBlock: (blockId) => this.blocks.find((b) => b.id === blockId)?.focus(),
      },
    }
  }

  private appendBlock(type: string, data: BlockToolData, id?: string): Block {
    const ToolClass = this.tools[type] ?? this.tools[this.config.defaultBlock ?? 'paragraph']
    if (!ToolClass) throw new Error(`[doc-editor] unknown tool "${type}"`)
    const block = new Block(type, ToolClass, data, { api: this.api, config: {} }, id)
    this.blocks.push(block)
    this.blocksEl.appendChild(this.decorate(block))
    return block
  }

  private insertAfter(afterBlockId: string, type: string, data: BlockToolData): string {
    const ToolClass = this.tools[type]
    if (!ToolClass) throw new Error(`[doc-editor] unknown tool "${type}"`)
    const block = new Block(type, ToolClass, data, { api: this.api, config: {} })
    const idx = this.blocks.findIndex((b) => b.id === afterBlockId)
    const decorated = this.decorate(block)
    if (idx === -1 || idx === this.blocks.length - 1) {
      this.blocks.push(block)
      this.blocksEl.appendChild(decorated)
    } else {
      this.blocks.splice(idx + 1, 0, block)
      this.blocks[idx]!.wrapper.after(decorated)
    }
    block.focus()
    this.scheduleChange()
    return block.id
  }

  private deleteBlock(blockId: string): void {
    const idx = this.blocks.findIndex((b) => b.id === blockId)
    if (idx === -1) return
    const [removed] = this.blocks.splice(idx, 1)
    removed!.wrapper.remove()
    if (this.blocks.length === 0) {
      this.appendBlock(this.config.defaultBlock ?? 'paragraph', {})
    } else {
      const focusIdx = Math.max(0, idx - 1)
      this.blocks[focusIdx]!.focus()
    }
    this.scheduleChange()
  }

  private moveBlock(blockId: string, direction: 'up' | 'down'): void {
    const idx = this.blocks.findIndex((b) => b.id === blockId)
    if (idx === -1) return
    const target = direction === 'up' ? idx - 1 : idx + 1
    if (target < 0 || target >= this.blocks.length) return
    const [block] = this.blocks.splice(idx, 1)
    const moved = block!
    this.blocks.splice(target, 0, moved)
    if (direction === 'up') {
      this.blocks[target + 1]!.wrapper.before(moved.wrapper)
    } else {
      this.blocks[target - 1]!.wrapper.after(moved.wrapper)
    }
    this.scheduleChange()
  }

  /** Wraps a block's DOM with hover controls: drag/move handles, delete, and the add-block trigger. */
  private decorate(block: Block): HTMLElement {
    const controls = document.createElement('div')
    controls.className = 'de-controls'
    controls.innerHTML = `
      <button type="button" class="de-btn de-add" title="Add block below" aria-label="Add block below">+</button>
      <button type="button" class="de-btn de-up" title="Move up" aria-label="Move block up">&uarr;</button>
      <button type="button" class="de-btn de-down" title="Move down" aria-label="Move block down">&darr;</button>
      <button type="button" class="de-btn de-delete" title="Delete block" aria-label="Delete block">&times;</button>
    `
    block.wrapper.prepend(controls)
    return block.wrapper
  }

  private handleBlockClick = (e: MouseEvent): void => {
    if (this.config.readOnly) return
    const target = e.target as HTMLElement
    const wrapper = target.closest<HTMLElement>('.de-block')
    if (!wrapper) return
    const blockId = wrapper.dataset.blockId
    if (!blockId) return

    if (target.closest('.de-add')) {
      e.preventDefault()
      e.stopPropagation()
      this.openToolbox(wrapper, blockId)
    } else if (target.closest('.de-up')) {
      this.moveBlock(blockId, 'up')
    } else if (target.closest('.de-down')) {
      this.moveBlock(blockId, 'down')
    } else if (target.closest('.de-delete')) {
      this.deleteBlock(blockId)
    }
  }

  private openToolbox(afterWrapper: HTMLElement, afterBlockId: string): void {
    this.closeToolbox()
    const menu = document.createElement('div')
    menu.className = 'de-menu'
    for (const [name, ToolClass] of Object.entries(this.tools)) {
      if (!ToolClass.toolbox) continue
      const item = document.createElement('button')
      item.type = 'button'
      item.className = 'de-menu-item'
      item.innerHTML = `<span class="de-menu-icon">${ToolClass.toolbox.icon}</span><span>${ToolClass.toolbox.title}</span>`
      item.addEventListener('click', () => {
        this.insertAfter(afterBlockId, name, {})
        this.closeToolbox()
      })
      menu.appendChild(item)
    }
    afterWrapper.appendChild(menu)
    this.menuEl = menu
  }

  private closeToolbox(): void {
    this.menuEl?.remove()
    this.menuEl = null
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    // Shadow DOM retargets e.target to the host element for listeners outside
    // the shadow tree, so containment must be checked via composedPath()
    // instead of e.target directly.
    if (this.menuEl && !e.composedPath().includes(this.menuEl)) this.closeToolbox()
  }

  private handleKeydown = (e: KeyboardEvent): void => {
    if (this.config.readOnly) return
    const wrapper = (e.target as HTMLElement).closest<HTMLElement>('.de-block')
    if (!wrapper) return
    const blockId = wrapper.dataset.blockId
    if (!blockId) return
    const block = this.blocks.find((b) => b.id === blockId)
    if (!block) return

    if (e.key === 'Enter' && !e.shiftKey && (block.type === 'paragraph' || block.type === 'header' || block.type === 'quote')) {
      const editable = block.content.querySelector<HTMLElement>('[contenteditable="true"]')
      const isListLike = editable?.closest('li')
      if (!isListLike) {
        e.preventDefault()
        this.insertAfter(blockId, this.config.defaultBlock ?? 'paragraph', {})
      }
    } else if (e.key === 'Backspace') {
      const editable = block.content.querySelector<HTMLElement>('[contenteditable="true"]')
      if (editable && editable.textContent === '' && this.blocks.length > 1) {
        e.preventDefault()
        this.deleteBlock(blockId)
      }
    }
  }

  private scheduleChange = (): void => {
    if (this.changeTimer) clearTimeout(this.changeTimer)
    this.changeTimer = setTimeout(async () => {
      const data = await this.save()
      this.config.onChange?.(data)
    }, CHANGE_DEBOUNCE_MS)
  }

  async save(): Promise<OutputData> {
    const blocks = await Promise.all(
      this.blocks.map(async (b) => ({ id: b.id, type: b.type, data: await b.save() }))
    )
    return { time: Date.now(), blocks, version: '0.1.0' }
  }

  render(data: OutputData): void {
    this.blocksEl.innerHTML = ''
    this.blocks = []
    if (data.blocks?.length) {
      for (const b of data.blocks) this.appendBlock(b.type, b.data, b.id)
    } else {
      this.appendBlock(this.config.defaultBlock ?? 'paragraph', {})
    }
  }

  clear(): void {
    this.render({ time: Date.now(), blocks: [], version: '0.1.0' })
  }

  destroy(): void {
    document.removeEventListener('click', this.handleOutsideClick)
    if (this.changeTimer) clearTimeout(this.changeTimer)
    this.root.remove()
  }

  static generateBlockId = generateBlockId
}
