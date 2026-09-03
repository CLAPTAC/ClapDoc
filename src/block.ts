import type {
  BlockTool,
  BlockToolData,
  BlockTune,
  BlockTuneConstructable,
  EditorAPI,
  OutputBlockData,
  ResolvedTool,
} from './types'

let idCounter = 0
export function generateBlockId(): string {
  idCounter += 1
  return `b${Date.now().toString(36)}${idCounter.toString(36)}`
}

export interface BlockCreateOptions {
  type: string
  tool: ResolvedTool
  data: BlockToolData
  api: EditorAPI
  id?: string
  readOnly?: boolean
  tunes?: Record<string, BlockToolData>
  tuneClasses?: Map<string, { class: BlockTuneConstructable; config: Record<string, unknown> }>
}

/**
 * Wraps one Tool instance together with its DOM and optional tunes.
 * The editor owns an ordered list of these.
 */
export class Block {
  readonly id: string
  readonly type: string
  readonly tool: BlockTool
  readonly resolved: ResolvedTool
  readonly wrapper: HTMLElement
  /** Outermost content node in the block (may be a tune wrap). */
  readonly content: HTMLElement
  /** Node returned by tool.render() — always what tool.save() should receive. */
  readonly toolContent: HTMLElement
  private tuneInstances: Map<string, BlockTune> = new Map()
  private tuneData: Record<string, BlockToolData>

  constructor(options: BlockCreateOptions) {
    this.id = options.id ?? generateBlockId()
    this.type = options.type
    this.resolved = options.tool
    this.tuneData = { ...(options.tunes ?? {}) }

    this.tool = new options.tool.class({
      data: options.data,
      api: options.api,
      config: options.tool.config,
      blockId: this.id,
      readOnly: options.readOnly,
    })

    this.wrapper = document.createElement('div')
    this.wrapper.className = 'de-block'
    this.wrapper.dataset.blockId = this.id
    this.wrapper.dataset.blockType = this.type
    this.wrapper.draggable = false

    const toolContent = this.tool.render()
    toolContent.classList.add('de-block-content')
    this.toolContent = toolContent

    let content: HTMLElement = toolContent

    // Apply tunes that wrap content
    if (options.tuneClasses) {
      for (const [name, entry] of options.tuneClasses) {
        const instance = new entry.class({
          api: options.api,
          blockId: this.id,
          data: this.tuneData[name] ?? {},
          config: entry.config,
        })
        this.tuneInstances.set(name, instance)
        if (instance.wrap) content = instance.wrap(content)
      }
    }

    this.content = content
    this.wrapper.appendChild(this.content)
  }

  private collectTunes(): Record<string, BlockToolData> {
    const tunes: Record<string, BlockToolData> = {}
    for (const [name, instance] of this.tuneInstances) {
      if (instance.save) tunes[name] = instance.save()
      else if (this.tuneData[name]) tunes[name] = this.tuneData[name]!
    }
    return tunes
  }

  private toOutput(data: BlockToolData): OutputBlockData {
    const validated = this.tool.validate && !this.tool.validate(data) ? {} : data
    const tunes = this.collectTunes()
    const out: OutputBlockData = { id: this.id, type: this.type, data: validated }
    if (Object.keys(tunes).length) out.tunes = tunes
    return out
  }

  async save(): Promise<OutputBlockData> {
    const data = await this.tool.save(this.toolContent)
    return this.toOutput(data)
  }

  /** Best-effort sync save for API getters; falls back to empty data if tool.save is async. */
  saveSync(): OutputBlockData {
    const result = this.tool.save(this.toolContent)
    if (result instanceof Promise) {
      return { id: this.id, type: this.type, data: {} }
    }
    return this.toOutput(result)
  }

  focus(): void {
    const editable =
      this.toolContent.matches?.('[contenteditable="true"]')
        ? this.toolContent
        : this.toolContent.querySelector<HTMLElement>('[contenteditable="true"]') ??
          this.content.querySelector<HTMLElement>('[contenteditable="true"]') ??
          this.toolContent
    editable.focus()
    const range = document.createRange()
    const sel = window.getSelection()
    range.selectNodeContents(editable)
    range.collapse(false)
    sel?.removeAllRanges()
    sel?.addRange(range)
  }

  callRendered(): void {
    this.tool.rendered?.()
  }

  callUpdated(): void {
    this.tool.updated?.()
  }

  destroy(): void {
    this.tool.destroy?.()
    for (const tune of this.tuneInstances.values()) tune.destroy?.()
  }

  hasSettings(): boolean {
    return typeof this.tool.renderSettings === 'function' || this.tuneInstances.size > 0
  }

  getSettingsElement(): HTMLElement | null {
    const bundle = document.createElement('div')
    bundle.className = 'de-settings-bundle'
    let has = false

    const toolSettings = this.tool.renderSettings?.()
    if (toolSettings) {
      bundle.appendChild(toolSettings)
      has = true
    }
    for (const tune of this.tuneInstances.values()) {
      const el = tune.render()
      if (el) {
        bundle.appendChild(el)
        has = true
      }
    }
    return has ? bundle : null
  }

  setReadOnly(readOnly: boolean): void {
    const seen = new Set<HTMLElement>()
    const apply = (el: HTMLElement | null | undefined) => {
      if (!el || seen.has(el)) return
      seen.add(el)
      if (el.getAttribute('contenteditable') != null || el.isContentEditable) {
        el.contentEditable = readOnly ? 'false' : 'true'
      }
    }
    apply(this.toolContent)
    apply(this.content)
    this.content.querySelectorAll<HTMLElement>('[contenteditable]').forEach(apply)
    this.toolContent.querySelectorAll<HTMLElement>('[contenteditable]').forEach(apply)
  }
}
