import type { BlockTool, BlockToolConstructorOptions, BlockToolData } from '../types'

interface ImageData extends BlockToolData {
  url?: string
  caption?: string
}

/**
 * Ships with no upload backend: it reads local files as data URLs so the
 * block works standalone. Pass a `config.uploader(file) => Promise<url>` in
 * EditorConfig.tools.image to route uploads to your own storage instead.
 */
export class ImageTool implements BlockTool {
  static toolbox = {
    title: 'Image',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
  }

  private data: ImageData
  private uploader?: (file: File) => Promise<string>
  private wrapper!: HTMLElement

  constructor({ data, config }: BlockToolConstructorOptions<ImageData>) {
    this.data = data
    this.uploader = config?.uploader as ((file: File) => Promise<string>) | undefined
  }

  private async handleFile(file: File): Promise<string> {
    if (this.uploader) return this.uploader(file)
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  private renderPicker(): HTMLElement {
    const picker = document.createElement('div')
    picker.className = 'de-image-picker'

    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'image/*'
    fileInput.className = 'de-image-file'

    const urlInput = document.createElement('input')
    urlInput.type = 'text'
    urlInput.placeholder = 'Paste an image URL…'
    urlInput.className = 'de-image-url'

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0]
      if (!file) return
      const url = await this.handleFile(file)
      this.setImage(url)
    })
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (urlInput.value.trim()) this.setImage(urlInput.value.trim())
      }
    })

    picker.append(fileInput, urlInput)
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
    caption.contentEditable = 'true'
    caption.className = 'de-image-caption'
    caption.dataset.placeholder = 'Caption'
    caption.innerHTML = this.data.caption ?? ''
    frag.append(img, caption)
    return frag
  }

  render(): HTMLElement {
    this.wrapper = document.createElement('div')
    this.wrapper.className = 'de-image'
    this.wrapper.appendChild(this.data.url ? this.renderPreview(this.data.url) : this.renderPicker())
    return this.wrapper
  }

  save(): ImageData {
    const caption = this.wrapper.querySelector('.de-image-caption')?.innerHTML ?? ''
    return { url: this.data.url, caption }
  }
}
