import type { BlockTool, BlockToolConstructorOptions, BlockToolData, ConversionConfig, PasteConfig } from '../types'

interface QuoteData extends BlockToolData {
  text?: string
  caption?: string
}

export class QuoteTool implements BlockTool {
  static toolbox = {
    title: 'Quote',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21c3-2 4-4 4-8V7h6v6H7m8 8c3-2 4-4 4-8V7h6v6h-6"/></svg>',
  }

  static pasteConfig: PasteConfig = {
    tags: ['BLOCKQUOTE'],
  }

  static conversionConfig: ConversionConfig = {
    export: (data) => String((data as QuoteData).text ?? ''),
    import: (text) => ({ text, caption: '' }),
  }

  static isReadOnlySupported = true

  private data: QuoteData
  private readOnly: boolean

  constructor({ data, readOnly }: BlockToolConstructorOptions<QuoteData>) {
    this.data = data
    this.readOnly = !!readOnly
  }

  render(): HTMLElement {
    const wrap = document.createElement('blockquote')
    wrap.className = 'de-quote'

    const text = document.createElement('div')
    text.contentEditable = this.readOnly ? 'false' : 'true'
    text.className = 'de-quote-text'
    text.dataset.placeholder = 'Quote'
    text.innerHTML = this.data.text ?? ''

    const caption = document.createElement('div')
    caption.contentEditable = this.readOnly ? 'false' : 'true'
    caption.className = 'de-quote-caption'
    caption.dataset.placeholder = 'Author'
    caption.innerHTML = this.data.caption ?? ''

    wrap.append(text, caption)
    return wrap
  }

  save(blockContent: HTMLElement): QuoteData {
    return {
      text: blockContent.querySelector('.de-quote-text')?.innerHTML ?? '',
      caption: blockContent.querySelector('.de-quote-caption')?.innerHTML ?? '',
    }
  }
}
