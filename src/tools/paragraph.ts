import type { BlockTool, BlockToolConstructorOptions, BlockToolData, ConversionConfig, PasteConfig } from '../types'

interface ParagraphData extends BlockToolData {
  text?: string
}

export class ParagraphTool implements BlockTool {
  static toolbox = {
    title: 'Text',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
  }

  static pasteConfig: PasteConfig = {
    tags: ['P'],
  }

  static conversionConfig: ConversionConfig = {
    export: (data) => String((data as ParagraphData).text ?? ''),
    import: (text) => ({ text }),
  }

  static isReadOnlySupported = true

  private data: ParagraphData
  private placeholder?: string
  private readOnly: boolean

  constructor({ data, config, readOnly }: BlockToolConstructorOptions<ParagraphData>) {
    this.data = data
    this.placeholder = (config?.placeholder as string) ?? 'Type something…'
    this.readOnly = !!readOnly
  }

  render(): HTMLElement {
    const el = document.createElement('div')
    el.contentEditable = this.readOnly ? 'false' : 'true'
    el.className = 'de-paragraph'
    el.dataset.placeholder = this.placeholder ?? ''
    el.innerHTML = this.data.text ?? ''
    return el
  }

  save(blockContent: HTMLElement): ParagraphData {
    return { text: blockContent.innerHTML }
  }
}
