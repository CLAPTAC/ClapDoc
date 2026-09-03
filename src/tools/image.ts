import type { BlockTool, BlockToolConstructorOptions, BlockToolData, PasteConfig } from '../types'

interface ImageData extends BlockToolData {
  url?: string
  caption?: string
}

export interface ImageToolConfig {
  uploader?: (file: File) => Promise<string>
  byUrl?: boolean
  endpoints?: {
    byFile?: string
    byUrl?: string
  }
}

/**
 * Ships with no upload backend: it reads local files as data URLs so the
 * block works standalone. Pass `config.uploader` via tool settings:
 *   tools: { image: { class: ImageTool, config: { uploader } } }
 */
export class ImageTool implements BlockTool {
  static toolbox = {
    title: 'Image',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
  }

  static pasteConfig: PasteConfig = {
    tags: ['IMG'],
  }

  static isReadOnlySupported = true

  private data: ImageData
  private config: ImageToolConfig
  private readOnly: boolean
  private wrapper!: HTMLElement

  constructor({ data, config, readOnly }: BlockToolConstructorOptions<ImageData>) {
    this.data = data
    this.config = (config ?? {}) as ImageToolConfig
    this.readOnly = !!readOnly
  }

  private async handleFile(file: File): Promise<string> {
    if (this.config.uploader) return this.config.uploader(file)
    if (this.config.endpoints?.byFile) {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch(this.config.endpoints.byFile, { method: 'POST', body })
      const json = (await res.json()) as { url?: string; file?: { url?: string } }
      const url = json.url ?? json.file?.url
      if (!url) throw new Error('[doc-editor] image upload response missing url')
      return url
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  private async handleUrl(url: string): Promise<string> {
    if (this.config.endpoints?.byUrl) {
      const res = await fetch(this.config.endpoints.byUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const json = (await res.json()) as { url?: string; file?: { url?: string } }
      return json.url ?? json.file?.url ?? url
    }
    return url
  }

  private renderPicker(): HTMLElement {
    const picker = document.createElement('div')
    picker.className = 'de-image-picker'

    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'image/*'
    fileInput.className = 'de-image-file'

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0]
      if (!file) return
      const url = await this.handleFile(file)
      this.setImage(url)
    })

    picker.appendChild(fileInput)

    const byUrl = this.config.byUrl !== false
    if (byUrl) {
      const urlInput = document.createElement('input')
      urlInput.type = 'text'
      urlInput.placeholder = 'Paste an image URL…'
      urlInput.className = 'de-image-url'
      urlInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          if (urlInput.value.trim()) {
            const url = await this.handleUrl(urlInput.value.trim())
            this.setImage(url)
          }
        }
      })
      picker.appendChild(urlInput)
    }

    return picker
  }

  private setImage(url: string): void {
    this.data.url = url
    this.wrapper.innerHTML = ''
    this.wrapper.appendChild(this.renderPreview(url))
  }

  private renderPreview(url: string): HTMLElement {
    const frag = document.createElement('div')
    frag.className = 'de-image-preview'
    const img = document.createElement('img')
    img.src = url
    img.alt = this.data.caption ?? ''
    const caption = document.createElement('div')
    caption.contentEditable = this.readOnly ? 'false' : 'true'
    caption.className = 'de-image-caption'
    caption.dataset.placeholder = 'Caption'
    caption.innerHTML = this.data.caption ?? ''
    frag.append(img, caption)
    return frag
  }

  render(): HTMLElement {
    this.wrapper = document.createElement('div')
    this.wrapper.className = 'de-image'
    if (this.data.url) {
      this.wrapper.appendChild(this.renderPreview(this.data.url))
    } else if (this.readOnly) {
      this.wrapper.textContent = ''
    } else {
      this.wrapper.appendChild(this.renderPicker())
    }
    return this.wrapper
  }

  save(): ImageData {
    const caption = this.wrapper.querySelector('.de-image-caption')?.innerHTML ?? ''
    return { url: this.data.url, caption }
  }
}
