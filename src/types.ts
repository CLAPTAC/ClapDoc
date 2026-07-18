export interface BlockToolData {
  [key: string]: unknown
}

export interface OutputBlockData<T = BlockToolData> {
  id: string
  type: string
  data: T
}

export interface OutputData {
  time: number
  blocks: OutputBlockData[]
  version: string
}

export interface ToolboxConfig {
  title: string
  /** Inline SVG markup shown in the "add block" menu. */
  icon: string
}

export interface BlockToolConstructorOptions<T extends BlockToolData = BlockToolData> {
  data: T
  api: EditorAPI
  config?: Record<string, unknown>
  blockId: string
}

export interface BlockTool {
  /** Build and return the DOM for this block. Called once, on block creation. */
  render(): HTMLElement
  /** Extract this block's data from its (possibly user-edited) DOM. */
  save(blockContent: HTMLElement): BlockToolData | Promise<BlockToolData>
  /** Return false to reject the block's current data (e.g. empty required field). */
  validate?(data: BlockToolData): boolean
}

export interface BlockToolConstructable {
  new (options: BlockToolConstructorOptions): BlockTool
  /** Metadata shown in the "add block" menu. Omit to hide from the menu (e.g. internal tools). */
  toolbox?: ToolboxConfig
}

export interface EditorTools {
  [toolName: string]: BlockToolConstructable
}

export interface EditorAPI {
  blocks: {
    insertAfter(blockId: string, type?: string, data?: BlockToolData): string
    delete(blockId: string): void
    move(blockId: string, direction: 'up' | 'down'): void
    getCount(): number
  }
  caret: {
    focusBlock(blockId: string): void
  }
}

export interface EditorConfig {
  /** Element (or CSS selector) the editor mounts into. */
  holder: HTMLElement | string
  /** Registered block tools, keyed by the name used in saved `type` fields. */
  tools?: EditorTools
  /** Initial content. Omit to start with a single empty default block. */
  data?: OutputData
  /** Placeholder text shown in an empty first block. */
  placeholder?: string
  /** Tool name used for the initial empty block and for new blocks created via Enter. Default: "paragraph". */
  defaultBlock?: string
  /** Fires after any block is added, edited, removed, or reordered. */
  onChange?: (data: OutputData) => void
  /** Disables all editing UI when true. */
  readOnly?: boolean
}
