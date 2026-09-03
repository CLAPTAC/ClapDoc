import type { BlockToolData, BlockTune, EditorAPI } from '../types'

export type Alignment = 'left' | 'center' | 'right'

interface AlignmentData extends BlockToolData {
  alignment?: Alignment
}

/**
 * Built-in tune: wraps block content with a text-align style.
 */
export class AlignmentTune implements BlockTune {
  static isTune = true as const

  private data: AlignmentData
  private wrapper: HTMLElement | null = null

  constructor(options: {
    api: EditorAPI
    blockId: string
    data: BlockToolData
    config?: Record<string, unknown>
  }) {
    this.data = options.data as AlignmentData
  }

  render(): HTMLElement {
    const el = document.createElement('div')
    el.className = 'de-tune-alignment'
    for (const align of ['left', 'center', 'right'] as Alignment[]) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.textContent = align[0]!.toUpperCase()
      btn.title = align
      btn.className =
        'de-tune-btn' + (this.data.alignment === align ? ' de-tune-active' : '')
      btn.addEventListener('click', () => {
        this.data.alignment = align
        if (this.wrapper) this.wrapper.style.textAlign = align
        el.querySelectorAll('.de-tune-btn').forEach((b) => b.classList.remove('de-tune-active'))
        btn.classList.add('de-tune-active')
      })
      el.appendChild(btn)
    }
    return el
  }

  wrap(blockContent: HTMLElement): HTMLElement {
    this.wrapper = document.createElement('div')
    this.wrapper.className = 'de-tune-wrap'
    this.wrapper.style.textAlign = this.data.alignment ?? 'left'
    this.wrapper.appendChild(blockContent)
    return this.wrapper
  }

  save(): AlignmentData {
    return { alignment: this.data.alignment ?? 'left' }
  }
}
