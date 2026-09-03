import { Editor } from './editor'
import { STYLES } from './styles'
import type {
  EditorEventName,
  EditorTools,
  EditorTunes,
  EditorPlugin,
  OutputData,
  EditorUIConfig,
  ShortcutMap,
  SanitizeConfig,
  EditorI18n,
} from './types'

/**
 * `<doc-editor>` — drop the tag in HTML, set properties for objects, listen for events.
 */
export class DocEditorElement extends HTMLElement {
  private editor: Editor | null = null
  private mountPoint: HTMLElement
  private _tools: EditorTools = {}
  private _tunes: EditorTunes = {}
  private _plugins: EditorPlugin[] = []
  private _data?: OutputData
  private _ui?: EditorUIConfig
  private _shortcuts?: ShortcutMap
  private _sanitize?: SanitizeConfig
  private _i18n?: EditorI18n
  private _inlineToolbar = false
  private syncingReadonly = false
  private boundHandlers = new Map<string, (payload: unknown) => void>()

  static get observedAttributes(): string[] {
    return ['placeholder', 'readonly', 'default-block', 'autofocus', 'min-height', 'inline-toolbar']
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
    this.teardownEditor()
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return
    if (name === 'readonly') {
      // Flip in place — do not remount (would wipe caret + history).
      if (!this.syncingReadonly) this.editor?.setReadOnly(this.hasAttribute('readonly'))
      return
    }
    this.mount()
  }

  set tools(tools: EditorTools) {
    this._tools = tools
    if (this.isConnected) this.mount()
  }
  get tools(): EditorTools {
    return this._tools
  }

  set tunes(tunes: EditorTunes) {
    this._tunes = tunes
    if (this.isConnected) this.mount()
  }
  get tunes(): EditorTunes {
    return this._tunes
  }

  set plugins(plugins: EditorPlugin[]) {
    this._plugins = plugins
    if (this.isConnected) this.mount()
  }
  get plugins(): EditorPlugin[] {
    return this._plugins
  }

  set data(data: OutputData | undefined) {
    this._data = data
    if (this.editor && data) this.editor.render(data)
    else if (this.isConnected) this.mount()
  }
  get data(): OutputData | undefined {
    return this._data
  }

  set ui(ui: EditorUIConfig | undefined) {
    this._ui = ui
    if (this.isConnected) this.mount()
  }
  get ui(): EditorUIConfig | undefined {
    return this._ui
  }

  set shortcuts(shortcuts: ShortcutMap | undefined) {
    this._shortcuts = shortcuts
    if (this.isConnected) this.mount()
  }
  get shortcuts(): ShortcutMap | undefined {
    return this._shortcuts
  }

  set sanitize(sanitize: SanitizeConfig | undefined) {
    this._sanitize = sanitize
    if (this.isConnected) this.mount()
  }
  get sanitize(): SanitizeConfig | undefined {
    return this._sanitize
  }

  set i18n(i18n: EditorI18n | undefined) {
    this._i18n = i18n
    if (this.isConnected) this.mount()
  }
  get i18n(): EditorI18n | undefined {
    return this._i18n
  }

  set inlineToolbar(value: boolean) {
    this._inlineToolbar = value
    if (value) this.setAttribute('inline-toolbar', '')
    else this.removeAttribute('inline-toolbar')
  }
  get inlineToolbar(): boolean {
    return this._inlineToolbar || this.hasAttribute('inline-toolbar')
  }

  private teardownEditor(): void {
    if (this.editor) {
      for (const [event, handler] of this.boundHandlers) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.editor.off(event as EditorEventName, handler as any)
      }
      this.boundHandlers.clear()
      this.editor.destroy()
      this.editor = null
    }
  }

  private mount(): void {
    this.teardownEditor()
    this.mountPoint.innerHTML = ''
    this.editor = new Editor({
      holder: this.mountPoint,
      tools: this._tools,
      tunes: this._tunes,
      plugins: this._plugins,
      data: this._data,
      placeholder: this.getAttribute('placeholder') ?? undefined,
      defaultBlock: this.getAttribute('default-block') ?? undefined,
      readOnly: this.hasAttribute('readonly'),
      autofocus: this.hasAttribute('autofocus'),
      minHeight: this.getAttribute('min-height') ?? undefined,
      ui: this._ui,
      shortcuts: this._shortcuts,
      sanitize: this._sanitize,
      i18n: this._i18n,
      inlineToolbar: this.inlineToolbar,
      onChange: (data) => {
        this._data = data
      },
    })

    const forward = (event: EditorEventName) => {
      const handler = (payload: unknown) => {
        this.dispatchEvent(
          new CustomEvent(event, { detail: payload, bubbles: true, composed: true })
        )
      }
      this.boundHandlers.set(event, handler)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.editor!.on(event, handler as any)
    }

    forward('ready')
    forward('change')
    forward('block-added')
    forward('block-removed')
    forward('block-moved')
    forward('block-changed')
    forward('focus')
    forward('blur')
  }

  save(): Promise<OutputData> {
    if (!this.editor) throw new Error('[doc-editor] not mounted yet')
    return this.editor.save()
  }

  clear(): void {
    this.editor?.clear()
  }

  render(data: OutputData): void {
    this._data = data
    this.editor?.render(data)
  }

  undo(): Promise<void> {
    return this.editor?.undo() ?? Promise.resolve()
  }

  redo(): Promise<void> {
    return this.editor?.redo() ?? Promise.resolve()
  }

  setReadOnly(value: boolean): void {
    this.syncingReadonly = true
    if (value) this.setAttribute('readonly', '')
    else this.removeAttribute('readonly')
    this.syncingReadonly = false
    this.editor?.setReadOnly(value)
  }

  isReady(): boolean {
    return this.editor?.isReady() ?? false
  }

  getAPI() {
    return this.editor?.getAPI() ?? null
  }
}

/** Registers the `<doc-editor>` custom element (or a custom tag name) if not already defined. */
export function defineDocEditor(tagName = 'doc-editor'): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, DocEditorElement)
  }
}
