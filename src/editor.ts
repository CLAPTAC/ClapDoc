import { Block, generateBlockId } from './block'
import { BlockManager } from './core/block-manager'
import { EventBus } from './core/event-bus'
import { History } from './core/history'
import { processPaste } from './core/paste'
import { resolveTools, resolveTunes } from './core/tools-registry'
import { UIController } from './core/ui'
import { InlineToolbar } from './plugins/inline-toolbar'
import { ParagraphTool } from './tools/paragraph'
import { HeaderTool } from './tools/header'
import { ListTool } from './tools/list'
import { ChecklistTool } from './tools/checklist'
import { QuoteTool } from './tools/quote'
import { DelimiterTool } from './tools/delimiter'
import { ImageTool } from './tools/image'
import type {
  BlockToolData,
  EditorAPI,
  EditorConfig,
  EditorEventMap,
  EditorEventName,
  EditorTools,
  OutputBlockData,
  OutputData,
  ResolvedTool,
  ShortcutMap,
} from './types'
import { EDITOR_VERSION } from './types'

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
const HISTORY_COALESCE_MS = 800

const DEFAULT_SHORTCUTS: Required<ShortcutMap> = {
  undo: 'Mod+Z',
  redo: 'Mod+Shift+Z',
  slash: '/',
  deleteEmpty: 'Backspace',
  newBlock: 'Enter',
}

export class Editor {
  private holder: HTMLElement
  private config: EditorConfig
  private tools: Map<string, ResolvedTool>
  private root: HTMLElement
  private blocksEl: HTMLElement
  private events = new EventBus()
  private history = new History()
  private ui: UIController
  private manager!: BlockManager
  private api!: EditorAPI
  private changeTimer: ReturnType<typeof setTimeout> | null = null
  private historyTimer: ReturnType<typeof setTimeout> | null = null
  private ready = false
  private readOnly: boolean
  private pluginCleanups: Array<() => void> = []
  private inlineToolbar: InlineToolbar | null = null
  private dragFromId: string | null = null
  private shortcuts: Required<ShortcutMap>
  private applyingHistory = false

  constructor(config: EditorConfig) {
    this.config = config
    this.readOnly = !!config.readOnly
    this.shortcuts = { ...DEFAULT_SHORTCUTS, ...config.shortcuts }
    this.tools = resolveTools({ ...DEFAULT_TOOLS, ...(config.tools ?? {}) })
    const tuneClasses = resolveTunes(config.tunes ?? {})

    const holder =
      typeof config.holder === 'string'
        ? document.querySelector<HTMLElement>(config.holder)
        : config.holder
    if (!holder) throw new Error('[doc-editor] holder element not found')
    this.holder = holder

    this.root = document.createElement('div')
    this.root.className = 'de-root'
    if (this.readOnly) this.root.classList.add('de-readonly')
    if (config.minHeight != null) {
      this.root.style.minHeight =
        typeof config.minHeight === 'number' ? `${config.minHeight}px` : config.minHeight
    }

    this.blocksEl = document.createElement('div')
    this.blocksEl.className = 'de-blocks'
    this.root.appendChild(this.blocksEl)
    this.holder.appendChild(this.root)

    this.ui = new UIController(config.ui, {
      onAdd: (blockId, wrapper) => this.openToolbox(wrapper, blockId),
      onUp: (blockId) => this.moveBlock(blockId, 'up'),
      onDown: (blockId) => this.moveBlock(blockId, 'down'),
      onDelete: (blockId) => this.deleteBlock(blockId),
      onSettings: (blockId, wrapper) => this.openSettings(blockId, wrapper),
      onDragStart: (blockId, e) => this.onDragStart(blockId, e),
      onDragOver: (_blockId, e) => {
        e.preventDefault()
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
      },
      onDrop: (blockId, e) => this.onDrop(blockId, e),
      onDragEnd: () => {
        this.dragFromId = null
        this.root.querySelectorAll('.de-dragging, .de-drag-over').forEach((el) => {
          el.classList.remove('de-dragging', 'de-drag-over')
        })
      },
      t: (key, fallback) => this.t(key, fallback),
    })
    this.ui.setReadOnly(this.readOnly)

    this.api = this.buildApi()

    this.manager = new BlockManager({
      tools: this.tools,
      tuneClasses,
      defaultBlock: config.defaultBlock ?? 'paragraph',
      api: this.api,
      blocksEl: this.blocksEl,
      decorate: (block) => this.ui.decorate(block),
      readOnly: this.readOnly,
    })

    this.blocksEl.addEventListener('keydown', this.handleKeydown)
    this.blocksEl.addEventListener('input', this.handleInput)
    this.blocksEl.addEventListener('click', this.handleBlockClick)
    this.blocksEl.addEventListener('paste', this.handlePaste)
    this.blocksEl.addEventListener('focusin', this.handleFocusIn)
    this.blocksEl.addEventListener('focusout', this.handleFocusOut)
    document.addEventListener('click', this.handleOutsideClick)

    if (config.data?.blocks?.length) {
      for (const b of config.data.blocks) {
        this.manager.append(b.type, b.data, b.id, b.tunes)
      }
    } else {
      this.manager.append(config.defaultBlock ?? 'paragraph', {})
    }

    if (config.inlineToolbar) {
      this.inlineToolbar = new InlineToolbar(this.root, this.api, true)
    }

    for (const plugin of config.plugins ?? []) {
      const cleanup = plugin.install(this.api)
      if (typeof cleanup === 'function') this.pluginCleanups.push(cleanup)
    }

    void this.save().then((data) => {
      this.history.seed(data)
      this.ready = true
      this.events.emit('ready', undefined as void)
      config.onReady?.()
      if (config.autofocus && !this.readOnly) {
        this.manager.getByIndex(0)?.focus()
      }
    })
  }

  private buildApi(): EditorAPI {
    return {
      blocks: {
        insertAfter: (blockId, type, data) =>
          this.insertAfter(blockId, type ?? this.config.defaultBlock ?? 'paragraph', data ?? {}),
        insert: (options) => this.insert(options),
        delete: (blockId) => this.deleteBlock(blockId),
        move: (blockId, direction) => this.moveBlock(blockId, direction),
        moveTo: (blockId, toIndex) => this.moveTo(blockId, toIndex),
        getById: (blockId) => this.getBlockOutputSync(blockId),
        getBlockByIndex: (index) => this.getBlockOutputSyncByIndex(index),
        getBlocks: () => this.getBlocksOutputSync(),
        getCount: () => this.manager.length,
        update: (blockId, data) => void this.updateBlock(blockId, data),
        convert: (blockId, newType) => void this.convertBlock(blockId, newType),
        clear: () => this.clear(),
      },
      caret: {
        focusBlock: (blockId) => this.manager.getById(blockId)?.focus(),
      },
      events: {
        on: (event, handler) => this.events.on(event, handler),
        off: (event, handler) => this.events.off(event, handler),
        emit: (event, payload) => this.events.emit(event, payload),
      },
      i18n: {
        t: (key, fallback) => this.t(key, fallback),
      },
      undo: () => void this.undo(),
      redo: () => void this.redo(),
      setReadOnly: (value) => this.setReadOnly(value),
      isReadOnly: () => this.readOnly,
      isReady: () => this.ready,
      save: () => this.save(),
      destroy: () => this.destroy(),
    }
  }

  private t(key: string, fallback?: string): string {
    return this.config.i18n?.messages?.[key] ?? fallback ?? key
  }

  private toolboxTools(): ResolvedTool[] {
    return Array.from(this.tools.values()).filter((t) => t.toolbox)
  }

  private openToolbox(wrapper: HTMLElement, afterBlockId: string): void {
    this.ui.openToolbox(wrapper, this.toolboxTools(), (name) => {
      this.insertAfter(afterBlockId, name, {})
    })
  }

  private openSettings(blockId: string, wrapper: HTMLElement): void {
    const block = this.manager.getById(blockId)
    if (!block) return
    const settings = block.getSettingsElement()
    if (!settings) return
    this.ui.openSettings(wrapper, settings)
  }

  private insertAfter(afterBlockId: string, type: string, data: BlockToolData): string {
    const block = this.manager.insertAfter(afterBlockId, type, data)
    block.focus()
    const index = this.manager.indexOf(block.id)
    this.events.emit('block-added', { id: block.id, type: block.type, index })
    this.scheduleChange(true)
    return block.id
  }

  private insert(options: {
    type?: string
    data?: BlockToolData
    index?: number
    id?: string
    focus?: boolean
  }): string {
    const type = options.type ?? this.config.defaultBlock ?? 'paragraph'
    const index = options.index ?? this.manager.length
    const block = this.manager.insertAt(index, type, options.data ?? {}, options.id)
    if (options.focus !== false) block.focus()
    this.events.emit('block-added', { id: block.id, type: block.type, index })
    this.scheduleChange(true)
    return block.id
  }

  private deleteBlock(blockId: string): void {
    const result = this.manager.remove(blockId)
    if (!result) return
    this.events.emit('block-removed', { id: blockId, index: result.index })
    if (this.manager.length === 0) {
      const block = this.manager.ensureDefault()
      this.events.emit('block-added', { id: block.id, type: block.type, index: 0 })
    } else {
      const focusIdx = Math.max(0, result.index - 1)
      this.manager.getByIndex(focusIdx)?.focus()
    }
    this.scheduleChange(true)
  }

  private moveBlock(blockId: string, direction: 'up' | 'down'): void {
    const result = this.manager.move(blockId, direction)
    if (!result) return
    this.events.emit('block-moved', { id: blockId, from: result.from, to: result.to })
    this.scheduleChange(true)
  }

  private moveTo(blockId: string, toIndex: number): void {
    const result = this.manager.moveTo(blockId, toIndex)
    if (!result) return
    this.events.emit('block-moved', { id: blockId, from: result.from, to: result.to })
    this.scheduleChange(true)
  }

  private async updateBlock(blockId: string, data: BlockToolData): Promise<void> {
    const block = this.manager.getById(blockId)
    if (!block) return
    await this.manager.replace(blockId, block.type, data)
    this.events.emit('block-changed', { id: blockId, type: block.type })
    this.scheduleChange(true)
  }

  private async convertBlock(blockId: string, newType: string): Promise<void> {
    const block = this.manager.getById(blockId)
    if (!block) return
    const saved = await block.save()
    const fromTool = this.tools.get(block.type)
    const toTool = this.tools.get(newType)
    if (!toTool) return

    let text = ''
    if (fromTool?.class.conversionConfig?.export) {
      text = fromTool.class.conversionConfig.export(saved.data)
    } else if (typeof saved.data.text === 'string') {
      text = saved.data.text
    } else {
      text = JSON.stringify(saved.data)
    }

    const data = toTool.class.conversionConfig?.import
      ? toTool.class.conversionConfig.import(text)
      : { text }

    await this.manager.replace(blockId, newType, data)
    this.manager.getById(blockId)?.focus()
    this.events.emit('block-changed', { id: blockId, type: newType })
    this.scheduleChange(true)
  }

  private onDragStart(blockId: string, e: DragEvent): void {
    this.dragFromId = blockId
    e.dataTransfer?.setData('text/plain', blockId)
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
    this.manager.getById(blockId)?.wrapper.classList.add('de-dragging')
  }

  private onDrop(targetId: string, e: DragEvent): void {
    e.preventDefault()
    const fromId = this.dragFromId ?? e.dataTransfer?.getData('text/plain')
    this.root.querySelectorAll('.de-dragging, .de-drag-over').forEach((el) => {
      el.classList.remove('de-dragging', 'de-drag-over')
    })
    if (!fromId || fromId === targetId) return
    const toIndex = this.manager.indexOf(targetId)
    if (toIndex === -1) return
    this.moveTo(fromId, toIndex)
    this.dragFromId = null
  }

  private handleBlockClick = (e: MouseEvent): void => {
    this.ui.handleClick(e)
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    this.ui.handleOutsideClick(e)
  }

  private handleFocusIn = (e: FocusEvent): void => {
    const wrapper = (e.target as HTMLElement).closest<HTMLElement>('.de-block')
    const id = wrapper?.dataset.blockId
    if (id) this.events.emit('focus', { id })
  }

  private handleFocusOut = (e: FocusEvent): void => {
    const wrapper = (e.target as HTMLElement).closest<HTMLElement>('.de-block')
    const id = wrapper?.dataset.blockId
    if (id) this.events.emit('blur', { id })
  }

  private handleInput = (e: Event): void => {
    if (this.readOnly) return
    const target = e.target as HTMLElement
    const wrapper = target.closest<HTMLElement>('.de-block')
    const blockId = wrapper?.dataset.blockId
    if (!blockId) return

    // Slash command: "/" in empty(ish) paragraph
    if (this.ui.showToolbox && target.isContentEditable) {
      const text = target.textContent ?? ''
      if (text.startsWith('/') && (wrapper?.dataset.blockType === 'paragraph' || wrapper?.dataset.blockType === 'header')) {
        const filter = text.slice(1)
        this.ui.openSlashMenu(wrapper!, this.toolboxTools(), filter, (name) => {
          void this.convertBlock(blockId, name)
        })
      } else if (this.ui.isSlashOpen() && !text.startsWith('/')) {
        this.ui.closeMenus()
      } else if (this.ui.isSlashOpen() && text.startsWith('/')) {
        this.ui.openSlashMenu(wrapper!, this.toolboxTools(), text.slice(1), (name) => {
          void this.convertBlock(blockId, name)
        })
      }
    }

    const block = this.manager.getById(blockId)
    if (block) this.events.emit('block-changed', { id: blockId, type: block.type })
    this.scheduleChange(false)
  }

  private handlePaste = (e: ClipboardEvent): void => {
    if (this.readOnly) return
    const wrapper = (e.target as HTMLElement).closest<HTMLElement>('.de-block')
    const blockId = wrapper?.dataset.blockId
    if (!blockId) return

    const block = this.manager.getById(blockId)
    if (block?.tool.onPaste?.(e)) {
      e.preventDefault()
      this.scheduleChange(true)
      return
    }

    const results = processPaste(e, {
      tools: this.tools,
      defaultBlock: this.config.defaultBlock ?? 'paragraph',
      sanitize: this.config.sanitize,
    })
    if (!results || results.length === 0) return

    e.preventDefault()

    // Replace current block with first result, insert the rest after
    const [first, ...rest] = results
    void (async () => {
      await this.manager.replace(blockId, first!.type, first!.data)
      let afterId = blockId
      for (const r of rest) {
        const b = this.manager.insertAfter(afterId, r.type, r.data)
        afterId = b.id
        this.events.emit('block-added', {
          id: b.id,
          type: b.type,
          index: this.manager.indexOf(b.id),
        })
      }
      this.manager.getById(afterId)?.focus()
      this.events.emit('block-changed', { id: blockId, type: first!.type })
      this.scheduleChange(true)
    })()
  }

  private handleKeydown = (e: KeyboardEvent): void => {
    if (this.readOnly) return

    if (this.matchesShortcut(e, this.shortcuts.undo)) {
      e.preventDefault()
      void this.undo()
      return
    }
    if (this.matchesShortcut(e, this.shortcuts.redo)) {
      e.preventDefault()
      void this.redo()
      return
    }

    if (this.ui.isSlashOpen()) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        this.ui.navigateSlash(1)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        this.ui.navigateSlash(-1)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const name = this.ui.confirmSlash()
        this.ui.closeMenus()
        const wrapper = (e.target as HTMLElement).closest<HTMLElement>('.de-block')
        const blockId = wrapper?.dataset.blockId
        if (name && blockId) void this.convertBlock(blockId, name)
        return
      }
      if (e.key === 'Escape') {
        this.ui.closeMenus()
        return
      }
    }

    const wrapper = (e.target as HTMLElement).closest<HTMLElement>('.de-block')
    if (!wrapper) return
    const blockId = wrapper.dataset.blockId
    if (!blockId) return
    const block = this.manager.getById(blockId)
    if (!block) return

    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      (block.type === 'paragraph' || block.type === 'header' || block.type === 'quote')
    ) {
      const editable = block.content.querySelector<HTMLElement>('[contenteditable="true"]')
      const isListLike = editable?.closest('li')
      if (!isListLike) {
        // Don't intercept if slash menu consumed Enter above
        if ((editable?.textContent ?? '').startsWith('/')) return
        e.preventDefault()
        this.insertAfter(blockId, this.config.defaultBlock ?? 'paragraph', {})
      }
    } else if (e.key === 'Backspace') {
      const editable = (e.target as HTMLElement).closest<HTMLElement>('[contenteditable="true"]')
      if (editable && editable.textContent === '' && this.manager.length > 1) {
        e.preventDefault()
        this.deleteBlock(blockId)
      }
    }
  }

  private matchesShortcut(e: KeyboardEvent, chord: string): boolean {
    const parts = chord.toLowerCase().split('+')
    const key = parts[parts.length - 1]!
    const needMod = parts.includes('mod') || parts.includes('ctrl') || parts.includes('meta')
    const needShift = parts.includes('shift')
    const needAlt = parts.includes('alt')

    const modPressed = e.metaKey || e.ctrlKey
    if (needMod !== modPressed) return false
    if (needShift !== e.shiftKey) return false
    if (needAlt !== e.altKey) return false

    const pressed = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase()
    return pressed === key || e.code.toLowerCase() === `key${key}`
  }

  private scheduleChange(structural: boolean): void {
    if (this.applyingHistory) return
    if (this.changeTimer) clearTimeout(this.changeTimer)
    this.changeTimer = setTimeout(async () => {
      const data = await this.save()
      this.events.emit('change', data)
      this.config.onChange?.(data)

      if (structural) {
        this.history.push(data)
      } else {
        if (this.historyTimer) clearTimeout(this.historyTimer)
        this.historyTimer = setTimeout(() => {
          void this.save().then((d) => this.history.push(d))
        }, HISTORY_COALESCE_MS)
      }
    }, CHANGE_DEBOUNCE_MS)
  }

  async undo(): Promise<void> {
    const current = await this.save()
    const prev = this.history.undo(current)
    if (!prev) return
    this.applyingHistory = true
    this.render(prev)
    this.applyingHistory = false
    this.events.emit('change', prev)
    this.config.onChange?.(prev)
  }

  async redo(): Promise<void> {
    const current = await this.save()
    const next = this.history.redo(current)
    if (!next) return
    this.applyingHistory = true
    this.render(next)
    this.applyingHistory = false
    this.events.emit('change', next)
    this.config.onChange?.(next)
  }

  async save(): Promise<OutputData> {
    return this.manager.toData()
  }

  render(data: OutputData): void {
    this.manager.clearDom()
    if (data.blocks?.length) {
      for (const b of data.blocks) this.manager.append(b.type, b.data, b.id, b.tunes)
    } else {
      this.manager.ensureDefault()
    }
  }

  clear(): void {
    this.render({ time: Date.now(), blocks: [], version: EDITOR_VERSION })
    this.scheduleChange(true)
  }

  setReadOnly(value: boolean): void {
    this.readOnly = value
    this.root.classList.toggle('de-readonly', value)
    this.ui.setReadOnly(value)
    this.manager.setReadOnly(value)
    this.inlineToolbar?.setEnabled(!value && !!this.config.inlineToolbar)
  }

  isReadOnly(): boolean {
    return this.readOnly
  }

  isReady(): boolean {
    return this.ready
  }

  on<K extends EditorEventName>(event: K, handler: (payload: EditorEventMap[K]) => void): void {
    this.events.on(event, handler)
  }

  off<K extends EditorEventName>(event: K, handler: (payload: EditorEventMap[K]) => void): void {
    this.events.off(event, handler)
  }

  getAPI(): EditorAPI {
    return this.api
  }

  destroy(): void {
    document.removeEventListener('click', this.handleOutsideClick)
    if (this.changeTimer) clearTimeout(this.changeTimer)
    if (this.historyTimer) clearTimeout(this.historyTimer)
    this.inlineToolbar?.destroy()
    for (const cleanup of this.pluginCleanups) cleanup()
    this.manager.clearDom()
    this.events.clear()
    this.ui.closeMenus()
    this.root.remove()
  }

  private getBlockOutputSync(blockId: string): OutputBlockData | undefined {
    return this.manager.getById(blockId)?.saveSync()
  }

  private getBlockOutputSyncByIndex(index: number): OutputBlockData | undefined {
    return this.manager.getByIndex(index)?.saveSync()
  }

  private getBlocksOutputSync(): OutputBlockData[] {
    return this.manager.getAll().map((b) => b.saveSync())
  }

  static generateBlockId = generateBlockId
  static version = EDITOR_VERSION
}

// Re-export Block for advanced consumers
export { Block }
