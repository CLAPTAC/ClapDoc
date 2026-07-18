import { Editor } from './editor'
import { STYLES } from './styles'
import type { EditorTools, OutputData } from './types'

/**
 * `<doc-editor>` — the zero-JS-framework way to use this library: drop the
 * tag in HTML (or create it with `document.createElement`), optionally set
 * `.tools` / `.data` as properties (attributes can't carry objects), and
 * listen for the `change` event.
 *
 *   const el = document.querySelector('doc-editor')
 *   el.tools = { paragraph: ParagraphTool, image: MyImageTool }
 *   el.addEventListener('change', (e) => console.log(e.detail))
 */
export class DocEditorElement extends HTMLElement {
  private editor: Editor | null = null
  private mountPoint: HTMLElement
  private _tools: EditorTools = {}
  private _data?: OutputData

  static get observedAttributes(): string[] {
    return ['placeholder', 'readonly', 'default-block']
  }

  constructor() {
    super()
    const shadow = this.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    style.textContent = STYLES
    this.mountPoint = document.createElement('div')
    shadow.append(style, this.mountPoint)
  }

  connectedCallback(): void {
    this.mount()
  }

  disconnectedCallback(): void {
    this.editor?.destroy()
    this.editor = null
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.mount()
  }

  /** Custom tool registry to merge with the built-ins. Set before the element connects, or after to remount. */
  set tools(tools: EditorTools) {
    this._tools = tools
    if (this.isConnected) this.mount()
  }

  get tools(): EditorTools {
    return this._tools
  }

  /** Initial content. Setting this after connect re-renders the editor with the new content. */
  set data(data: OutputData | undefined) {
    this._data = data
    if (this.editor && data) this.editor.render(data)
    else if (this.isConnected) this.mount()
  }

  get data(): OutputData | undefined {
    return this._data
  }

  private mount(): void {
    this.editor?.destroy()
    this.mountPoint.innerHTML = ''
    this.editor = new Editor({
      holder: this.mountPoint,
      tools: this._tools,
      data: this._data,
      placeholder: this.getAttribute('placeholder') ?? undefined,
      defaultBlock: this.getAttribute('default-block') ?? undefined,
      readOnly: this.hasAttribute('readonly'),
      onChange: (data) => {
        this._data = data
        this.dispatchEvent(new CustomEvent<OutputData>('change', { detail: data, bubbles: true, composed: true }))
      },
    })
  }

  /** Returns the current document as block data. */
  save(): Promise<OutputData> {
    if (!this.editor) throw new Error('[doc-editor] not mounted yet')
    return this.editor.save()
  }

  /** Resets to a single empty block. */
  clear(): void {
    this.editor?.clear()
  }
}

/** Registers the `<doc-editor>` custom element (or a custom tag name) if not already defined. */
export function defineDocEditor(tagName = 'doc-editor'): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, DocEditorElement)
  }
}
