import { Block } from '../block'
import type {
  BlockToolData,
  BlockTuneConstructable,
  EditorAPI,
  OutputBlockData,
  OutputData,
  ResolvedTool,
} from '../types'
import { EDITOR_VERSION } from '../types'

export interface BlockManagerOptions {
  tools: Map<string, ResolvedTool>
  tuneClasses: Map<string, { class: BlockTuneConstructable; config: Record<string, unknown> }>
  defaultBlock: string
  api: EditorAPI
  blocksEl: HTMLElement
  decorate: (block: Block) => HTMLElement
  readOnly: boolean
}

/**
 * Owns the ordered list of Block instances and DOM insertion/removal.
 */
export class BlockManager {
  private blocks: Block[] = []
  private options: BlockManagerOptions

  constructor(options: BlockManagerOptions) {
    this.options = options
  }

  get length(): number {
    return this.blocks.length
  }

  getAll(): Block[] {
    return [...this.blocks]
  }

  getById(id: string): Block | undefined {
    return this.blocks.find((b) => b.id === id)
  }

  getByIndex(index: number): Block | undefined {
    return this.blocks[index]
  }

  indexOf(id: string): number {
    return this.blocks.findIndex((b) => b.id === id)
  }

  create(
    type: string,
    data: BlockToolData = {},
    id?: string,
    tunes?: Record<string, BlockToolData>
  ): Block {
    const tool =
      this.options.tools.get(type) ??
      this.options.tools.get(this.options.defaultBlock)
    if (!tool) throw new Error(`[doc-editor] unknown tool "${type}"`)

    const block = new Block({
      type: this.options.tools.has(type) ? type : this.options.defaultBlock,
      tool,
      data,
      api: this.options.api,
      id,
      readOnly: this.options.readOnly,
      tunes,
      tuneClasses: this.options.tuneClasses,
    })
    return block
  }

  append(
    type: string,
    data: BlockToolData = {},
    id?: string,
    tunes?: Record<string, BlockToolData>
  ): Block {
    const block = this.create(type, data, id, tunes)
    this.blocks.push(block)
    this.options.blocksEl.appendChild(this.options.decorate(block))
    block.callRendered()
    return block
  }

  insertAt(
    index: number,
    type: string,
    data: BlockToolData = {},
    id?: string,
    tunes?: Record<string, BlockToolData>
  ): Block {
    const block = this.create(type, data, id, tunes)
    const decorated = this.options.decorate(block)

    if (index < 0) index = 0
    if (index >= this.blocks.length) {
      this.blocks.push(block)
      this.options.blocksEl.appendChild(decorated)
    } else {
      this.blocks.splice(index, 0, block)
      const ref = this.blocks[index + 1]
      if (ref) this.options.blocksEl.insertBefore(decorated, ref.wrapper)
      else this.options.blocksEl.appendChild(decorated)
    }
    block.callRendered()
    return block
  }

  insertAfter(
    afterBlockId: string,
    type: string,
    data: BlockToolData = {}
  ): Block {
    const idx = this.indexOf(afterBlockId)
    if (idx === -1) return this.append(type, data)
    return this.insertAt(idx + 1, type, data)
  }

  remove(blockId: string): { removed: Block; index: number } | null {
    const idx = this.indexOf(blockId)
    if (idx === -1) return null
    const [removed] = this.blocks.splice(idx, 1)
    removed!.destroy()
    removed!.wrapper.remove()
    return { removed: removed!, index: idx }
  }

  move(blockId: string, direction: 'up' | 'down'): { from: number; to: number } | null {
    const idx = this.indexOf(blockId)
    if (idx === -1) return null
    const target = direction === 'up' ? idx - 1 : idx + 1
    if (target < 0 || target >= this.blocks.length) return null
    return this.moveTo(blockId, target)
  }

  moveTo(blockId: string, toIndex: number): { from: number; to: number } | null {
    const from = this.indexOf(blockId)
    if (from === -1) return null
    if (toIndex < 0 || toIndex >= this.blocks.length) return null
    if (from === toIndex) return null

    const [block] = this.blocks.splice(from, 1)
    const moved = block!
    this.blocks.splice(toIndex, 0, moved)

    moved.wrapper.remove()
    const ref = this.blocks[toIndex + 1]
    if (ref) this.options.blocksEl.insertBefore(moved.wrapper, ref.wrapper)
    else this.options.blocksEl.appendChild(moved.wrapper)

    return { from, to: toIndex }
  }

  async replace(
    blockId: string,
    type: string,
    data: BlockToolData
  ): Promise<Block | null> {
    const idx = this.indexOf(blockId)
    if (idx === -1) return null
    const old = this.blocks[idx]!
    const tunes = (await old.save()).tunes
    old.destroy()
    old.wrapper.remove()

    const block = this.create(type, data, blockId, tunes)
    this.blocks[idx] = block
    const decorated = this.options.decorate(block)
    const ref = this.blocks[idx + 1]
    if (ref) this.options.blocksEl.insertBefore(decorated, ref.wrapper)
    else this.options.blocksEl.appendChild(decorated)
    block.callRendered()
    return block
  }

  async toOutput(): Promise<OutputBlockData[]> {
    return Promise.all(this.blocks.map((b) => b.save()))
  }

  async toData(): Promise<OutputData> {
    return {
      time: Date.now(),
      blocks: await this.toOutput(),
      version: EDITOR_VERSION,
    }
  }

  clearDom(): void {
    for (const b of this.blocks) b.destroy()
    this.blocks = []
    this.options.blocksEl.innerHTML = ''
  }

  setReadOnly(value: boolean): void {
    this.options.readOnly = value
    for (const b of this.blocks) b.setReadOnly(value)
  }

  ensureDefault(): Block {
    if (this.blocks.length === 0) {
      return this.append(this.options.defaultBlock, {})
    }
    return this.blocks[0]!
  }
}
