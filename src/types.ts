export interface BlockToolData {
  [key: string]: unknown
}

export interface OutputBlockData<T = BlockToolData> {
  id: string
  type: string
  data: T
  tunes?: Record<string, BlockToolData>
}

export interface OutputData {
  time: number
  blocks: OutputBlockData[]
  version: string
}

export const EDITOR_VERSION = '1.0.0'

export interface ToolboxConfig {
  title: string
  /** Inline SVG markup shown in the "add block" menu. */
  icon: string
}

export interface PasteConfig {
  /** HTML tags this tool can handle on paste (e.g. ['H1','H2']). */
  tags?: string[]
  /** Match patterns for plain-text paste. */
  patterns?: RegExp[]
}

export interface ConversionConfig {
  /** Export this tool's data as a string for conversion. */
  export?: (data: BlockToolData) => string
  /** Import a string into this tool's data shape. */
  import?: (text: string) => BlockToolData
}

export interface BlockToolConstructorOptions<T extends BlockToolData = BlockToolData> {
  data: T
  api: EditorAPI
  config?: Record<string, unknown>
  blockId: string
  readOnly?: boolean
}

export interface BlockTool {
  /** Build and return the DOM for this block. Called once, on block creation. */
  render(): HTMLElement
  /** Extract this block's data from its (possibly user-edited) DOM. */
  save(blockContent: HTMLElement): BlockToolData | Promise<BlockToolData>
  /** Return false to reject the block's current data (e.g. empty required field). */
  validate?(data: BlockToolData): boolean
  /** Optional settings panel (e.g. header level picker). */
  renderSettings?(): HTMLElement
  /** Called after the block DOM is attached. */
  rendered?(): void
  /** Called when block data is programmatically updated. */
  updated?(): void
  /** Cleanup listeners / timers. */
  destroy?(): void
  /** Handle a paste event targeted at this tool. Return true if handled. */
  onPaste?(event: ClipboardEvent | PasteEventDetail): boolean | void
  /** Tool-level keyboard shortcut hint (e.g. "CMD+SHIFT+H"). */
  shortcut?: string
}

export interface PasteEventDetail {
  type: 'tag' | 'pattern' | 'file'
  data: string | HTMLElement | File
}

export interface BlockToolConstructable {
  new (options: BlockToolConstructorOptions): BlockTool
  /** Metadata shown in the "add block" menu. Omit to hide from the menu. */
  toolbox?: ToolboxConfig
  pasteConfig?: PasteConfig
  conversionConfig?: ConversionConfig
  isReadOnlySupported?: boolean
  shortcut?: string
}

/** Bare class or `{ class, config }` entry. */
export type ToolSettings = BlockToolConstructable | {
  class: BlockToolConstructable
  config?: Record<string, unknown>
  shortcut?: string
  toolbox?: ToolboxConfig
}

export interface EditorTools {
  [toolName: string]: ToolSettings
}

export interface ResolvedTool {
  name: string
  class: BlockToolConstructable
  config: Record<string, unknown>
  shortcut?: string
  toolbox?: ToolboxConfig
}

export interface BlockTune {
  render(): HTMLElement
  wrap?(blockContent: HTMLElement): HTMLElement
  save?(): BlockToolData
  destroy?(): void
}

export interface BlockTuneConstructable {
  new (options: {
    api: EditorAPI
    blockId: string
    data: BlockToolData
    config?: Record<string, unknown>
  }): BlockTune
  isTune: true
}

export type TuneSettings = BlockTuneConstructable | {
  class: BlockTuneConstructable
  config?: Record<string, unknown>
}

export interface EditorTunes {
  [tuneName: string]: TuneSettings
}

export type ControlName = 'add' | 'up' | 'down' | 'delete' | 'settings' | 'drag'

export interface EditorUIConfig {
  showControls?: boolean
  showToolbox?: boolean
  controls?: ControlName[]
}

export interface SanitizeConfig {
  enabled?: boolean
  /** Extra tags to strip beyond the built-in sanitizer. */
  forbidTags?: string[]
}

export type ShortcutAction =
  | 'undo'
  | 'redo'
  | 'slash'
  | 'deleteEmpty'
  | 'newBlock'

export type ShortcutMap = Partial<Record<ShortcutAction, string>>

export interface EditorI18n {
  messages?: Record<string, string>
}

export type EditorEventMap = {
  ready: void
  change: OutputData
  'block-added': { id: string; type: string; index: number }
  'block-removed': { id: string; index: number }
  'block-moved': { id: string; from: number; to: number }
  'block-changed': { id: string; type: string }
  focus: { id: string }
  blur: { id: string }
}

export type EditorEventName = keyof EditorEventMap

export interface EditorAPI {
  blocks: {
    insertAfter(blockId: string, type?: string, data?: BlockToolData): string
    insert(options: {
      type?: string
      data?: BlockToolData
      index?: number
      id?: string
      focus?: boolean
    }): string
    delete(blockId: string): void
    move(blockId: string, direction: 'up' | 'down'): void
    moveTo(blockId: string, toIndex: number): void
    getById(blockId: string): OutputBlockData | undefined
    getBlockByIndex(index: number): OutputBlockData | undefined
    getBlocks(): OutputBlockData[]
    getCount(): number
    update(blockId: string, data: BlockToolData): void
    convert(blockId: string, newType: string): void
    clear(): void
  }
  caret: {
    focusBlock(blockId: string): void
  }
  events: {
    on<K extends EditorEventName>(event: K, handler: (payload: EditorEventMap[K]) => void): void
    off<K extends EditorEventName>(event: K, handler: (payload: EditorEventMap[K]) => void): void
    emit<K extends EditorEventName>(event: K, payload: EditorEventMap[K]): void
  }
  i18n: {
    t(key: string, fallback?: string): string
  }
  undo(): void
  redo(): void
  setReadOnly(value: boolean): void
  isReadOnly(): boolean
  isReady(): boolean
  save(): Promise<OutputData>
  destroy(): void
}

export interface EditorPlugin {
  install(api: EditorAPI): void | (() => void)
}

export interface EditorConfig {
  /** Element (or CSS selector) the editor mounts into. */
  holder: HTMLElement | string
  /** Registered block tools, keyed by the name used in saved `type` fields. */
  tools?: EditorTools
  /** Block tunes applied to every block (or selected via per-block data). */
  tunes?: EditorTunes
  /** Cross-cutting plugins (autosave, analytics, inline toolbar, …). */
  plugins?: EditorPlugin[]
  /** Initial content. Omit to start with a single empty default block. */
  data?: OutputData
  /** Placeholder text shown in an empty first block. */
  placeholder?: string
  /** Tool name used for the initial empty block and for new blocks created via Enter. Default: "paragraph". */
  defaultBlock?: string
  /** Fires after any block is added, edited, removed, or reordered. */
  onChange?: (data: OutputData) => void
  /** Fires once after the editor is mounted and initial blocks are rendered. */
  onReady?: () => void
  /** Disables all editing UI when true. */
  readOnly?: boolean
  /** Minimum height of the editor root. */
  minHeight?: number | string
  /** Focus the first block on mount. */
  autofocus?: boolean
  /** UI chrome toggles. */
  ui?: EditorUIConfig
  /** Keyboard shortcut overrides. */
  shortcuts?: ShortcutMap
  /** HTML sanitize options for paste / import. */
  sanitize?: SanitizeConfig
  /** Message overrides. */
  i18n?: EditorI18n
  /** Enable the optional selection inline toolbar (bold/italic/link). */
  inlineToolbar?: boolean
}
