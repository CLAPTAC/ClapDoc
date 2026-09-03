import type { EditorAPI } from '../types'
import { isSafeHref } from '../utils/markdown'

/**
 * Opt-in selection toolbar: bold / italic / link on contenteditable selection.
 */
export class InlineToolbar {
  private bar: HTMLElement | null = null
  private root: HTMLElement
  private api: EditorAPI
  private enabled: boolean

  constructor(root: HTMLElement, api: EditorAPI, enabled: boolean) {
    this.root = root
    this.api = api
    this.enabled = enabled
    if (enabled) {
      document.addEventListener('selectionchange', this.onSelectionChange)
      this.root.addEventListener('mousedown', this.onRootMouseDown)
    }
  }

  destroy(): void {
    document.removeEventListener('selectionchange', this.onSelectionChange)
    this.root.removeEventListener('mousedown', this.onRootMouseDown)
    this.hide()
  }

  setEnabled(value: boolean): void {
    this.enabled = value
    if (!value) this.hide()
  }

  private onRootMouseDown = (): void => {
    // Allow toolbar buttons to work; hide happens on empty selection
  }

  private onSelectionChange = (): void => {
    if (!this.enabled || this.api.isReadOnly()) {
      this.hide()
      return
    }
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      this.hide()
      return
    }
    const range = sel.getRangeAt(0)
    if (!this.root.contains(range.commonAncestorContainer)) {
      this.hide()
      return
    }
    this.show(range)
  }

  private show(range: Range): void {
    if (!this.bar) {
      this.bar = document.createElement('div')
      this.bar.className = 'de-inline-toolbar'
      this.bar.innerHTML = `
        <button type="button" data-cmd="bold" title="Bold"><b>B</b></button>
        <button type="button" data-cmd="italic" title="Italic"><i>I</i></button>
        <button type="button" data-cmd="createLink" title="Link">🔗</button>
      `
      this.bar.addEventListener('mousedown', (e) => {
        e.preventDefault()
        const btn = (e.target as HTMLElement).closest('button')
        if (!btn) return
        const cmd = btn.dataset.cmd
        if (cmd === 'createLink') {
          const url = window.prompt(this.api.i18n.t('inline.linkPrompt', 'Link URL'), 'https://')
          if (url && isSafeHref(url)) {
            document.execCommand('createLink', false, url.trim())
          }
        } else if (cmd) {
          document.execCommand(cmd, false)
        }
      })
      this.root.appendChild(this.bar)
    }

    const rect = range.getBoundingClientRect()
    const rootRect = this.root.getBoundingClientRect()
    this.bar.style.display = 'flex'
    this.bar.style.top = `${rect.top - rootRect.top - 36}px`
    this.bar.style.left = `${rect.left - rootRect.left + rect.width / 2}px`
  }

  private hide(): void {
    if (this.bar) this.bar.style.display = 'none'
  }
}

/** Plugin wrapper so hosts can pass `plugins: [inlineToolbarPlugin()]`. */
export function createInlineToolbarPlugin(): {
  install(api: EditorAPI): void
  _attach?(root: HTMLElement, api: EditorAPI): InlineToolbar
} {
  return {
    install() {
      // Actual attachment happens in Editor when inlineToolbar config is set.
    },
    _attach(root, api) {
      return new InlineToolbar(root, api, true)
    },
  }
}
