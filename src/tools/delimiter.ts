import type { BlockTool, BlockToolData, PasteConfig } from '../types'

export class DelimiterTool implements BlockTool {
  static toolbox = {
    title: 'Divider',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h4M10 12h4M16 12h4"/></svg>',
  }

  static pasteConfig: PasteConfig = {
    tags: ['HR'],
    patterns: [/^---+$/],
  }

  static isReadOnlySupported = true

  render(): HTMLElement {
    const el = document.createElement('div')
    el.className = 'de-delimiter'
    el.contentEditable = 'false'
    el.innerHTML = '* * *'
    return el
  }

  save(): BlockToolData {
    return {}
  }
}
