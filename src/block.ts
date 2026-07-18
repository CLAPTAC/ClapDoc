import type { BlockTool, BlockToolConstructable, BlockToolData, BlockToolConstructorOptions } from './types'

let idCounter = 0
export function generateBlockId(): string {
  idCounter += 1
  return `b${Date.now().toString(36)}${idCounter.toString(36)}`
}

/**
 * Wraps one Tool instance together with its DOM and hover controls
 * (move up/down, delete). The editor owns an ordered list of these.
 */
export class Block {
  readonly id: string
  readonly type: string
  readonly tool: BlockTool
  readonly wrapper: HTMLElement
  readonly content: HTMLElement

  constructor(
    type: string,
    ToolClass: BlockToolConstructable,
    data: BlockToolData,
    options: Omit<BlockToolConstructorOptions, 'data' | 'blockId'>,
    id?: string
  ) {
    this.id = id ?? generateBlockId()
    this.type = type
    this.tool = new ToolClass({ ...options, data, blockId: this.id })

    this.wrapper = document.createElement('div')
    this.wrapper.className = 'de-block'
    this.wrapper.dataset.blockId = this.id
    this.wrapper.dataset.blockType = type

    this.content = this.tool.render()
    this.content.classList.add('de-block-content')
    this.wrapper.appendChild(this.content)
  }

  async save(): Promise<BlockToolData> {
    const data = await this.tool.save(this.content)
    if (this.tool.validate && !this.tool.validate(data)) {
      return {}
    }
    return data
  }

  focus(): void {
    const editable = this.content.querySelector<HTMLElement>('[contenteditable="true"]') ?? this.content
    editable.focus()
    const range = document.createRange()
    const sel = window.getSelection()
    range.selectNodeContents(editable)
    range.collapse(false)
    sel?.removeAllRanges()
    sel?.addRange(range)
  }
}
