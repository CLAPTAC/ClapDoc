import type { ControlName, EditorUIConfig, ResolvedTool } from '../types'
import type { Block } from '../block'

/** Primary gutter shows drag + add; everything else lives in the ⋯ menu. */
const DEFAULT_CONTROLS: ControlName[] = ['drag', 'add', 'up', 'down', 'settings', 'delete']

export interface UICallbacks {
  onAdd: (blockId: string, wrapper: HTMLElement) => void
  onUp: (blockId: string) => void
  onDown: (blockId: string) => void
  onDelete: (blockId: string) => void
  onSettings: (blockId: string, wrapper: HTMLElement) => void
  onDragStart: (blockId: string, e: DragEvent) => void
  onDragOver: (blockId: string, e: DragEvent) => void
  onDrop: (blockId: string, e: DragEvent) => void
  onDragEnd: () => void
  t: (key: string, fallback: string) => string
}

/**
 * Decorates blocks with hover controls and manages toolbox / settings / slash menus.
 */
export class UIController {
  private config: EditorUIConfig
  private menuEl: HTMLElement | null = null
  private settingsEl: HTMLElement | null = null
  private slashEl: HTMLElement | null = null
  private moreEl: HTMLElement | null = null
  private slashIndex = 0
  private callbacks: UICallbacks
  private readOnly = false

  constructor(config: EditorUIConfig | undefined, callbacks: UICallbacks) {
    this.config = {
      showControls: config?.showControls !== false,
      showToolbox: config?.showToolbox !== false,
      controls: config?.controls ?? DEFAULT_CONTROLS,
    }
    this.callbacks = callbacks
  }

  setReadOnly(value: boolean): void {
    this.readOnly = value
  }

  get showToolbox(): boolean {
    return this.config.showToolbox !== false && !this.readOnly
  }

  decorate(block: Block): HTMLElement {
    // Always create controls; visibility is gated by .de-readonly CSS so toggling
    // read-only later does not leave blocks without a gutter.
    if (!this.config.showControls) return block.wrapper

    const list = this.config.controls ?? DEFAULT_CONTROLS
    const controls = document.createElement('div')
    controls.className = 'de-controls'

    if (list.includes('drag')) {
      controls.appendChild(
        this.btn('de-drag', this.callbacks.t('ui.drag', 'Drag to reorder'), '⠿', true)
      )
    }
    if (list.includes('add')) {
      controls.appendChild(this.btn('de-add', this.callbacks.t('ui.add', 'Add block below'), '+'))
    }

    const overflow = list.filter((c) => c === 'up' || c === 'down' || c === 'settings' || c === 'delete')
    const hasSettings = block.hasSettings()
    const overflowVisible = overflow.filter((c) => c !== 'settings' || hasSettings)

    if (overflowVisible.length) {
      const more = this.btn('de-more', this.callbacks.t('ui.more', 'More actions'), '⋯')
      more.dataset.hasSettings = hasSettings ? '1' : '0'
      controls.appendChild(more)
    }

    block.wrapper.prepend(controls)

    const dragHandle = controls.querySelector('.de-drag') as HTMLElement | null
    if (dragHandle) {
      const resetDraggable = () => {
        block.wrapper.draggable = false
      }
      block.wrapper.addEventListener('dragstart', (e) => {
        if (!(e.target as HTMLElement).closest('.de-drag')) {
          e.preventDefault()
          return
        }
        this.callbacks.onDragStart(block.id, e)
      })
      block.wrapper.addEventListener('dragover', (e) => this.callbacks.onDragOver(block.id, e))
      block.wrapper.addEventListener('drop', (e) => this.callbacks.onDrop(block.id, e))
      block.wrapper.addEventListener('dragend', () => {
        resetDraggable()
        this.callbacks.onDragEnd()
      })
      dragHandle.addEventListener('mousedown', () => {
        block.wrapper.draggable = true
        // Real drags often skip handle mouseup; clear on the next pointerup/dragend.
        window.addEventListener('pointerup', resetDraggable, { once: true })
      })
    }

    return block.wrapper
  }

  handleClick(e: MouseEvent): boolean {
    if (this.readOnly) return false
    const target = e.target as HTMLElement
    const wrapper = target.closest<HTMLElement>('.de-block')
    if (!wrapper) return false
    const blockId = wrapper.dataset.blockId
    if (!blockId) return false

    if (target.closest('.de-add')) {
      e.preventDefault()
      e.stopPropagation()
      this.callbacks.onAdd(blockId, wrapper)
      return true
    }
    if (target.closest('.de-more')) {
      e.preventDefault()
      e.stopPropagation()
      this.openMoreMenu(wrapper, blockId, target.closest('.de-more') as HTMLElement)
      return true
    }
    if (target.closest('.de-up')) {
      this.closeMenus()
      this.callbacks.onUp(blockId)
      return true
    }
    if (target.closest('.de-down')) {
      this.closeMenus()
      this.callbacks.onDown(blockId)
      return true
    }
    if (target.closest('.de-delete')) {
      this.closeMenus()
      this.callbacks.onDelete(blockId)
      return true
    }
    if (target.closest('.de-settings')) {
      e.preventDefault()
      e.stopPropagation()
      this.closeMenus()
      this.callbacks.onSettings(blockId, wrapper)
      return true
    }
    return false
  }

  private markMenuOpen(wrapper: HTMLElement | null): void {
    const scope = wrapper?.closest('.de-blocks') ?? wrapper?.parentElement
    scope?.querySelectorAll('.de-menu-open').forEach((el) => el.classList.remove('de-menu-open'))
    wrapper?.classList.add('de-menu-open')
  }

  private clearMenuOpen(): void {
    const scope =
      this.menuEl?.closest('.de-blocks') ??
      this.moreEl?.closest('.de-blocks') ??
      this.settingsEl?.closest('.de-blocks') ??
      this.slashEl?.closest('.de-blocks')
    scope?.querySelectorAll('.de-menu-open').forEach((el) => el.classList.remove('de-menu-open'))
  }

  private openMoreMenu(wrapper: HTMLElement, blockId: string, trigger: HTMLElement): void {
    this.closeMenus()
    const list = this.config.controls ?? DEFAULT_CONTROLS
    const hasSettings = trigger.dataset.hasSettings === '1'

    const menu = document.createElement('div')
    menu.className = 'de-menu de-more-menu'
    menu.setAttribute('role', 'menu')

    const addItem = (cls: string, label: string, action: () => void) => {
      const item = document.createElement('button')
      item.type = 'button'
      item.className = `de-menu-item ${cls}`
      item.setAttribute('role', 'menuitem')
      item.textContent = label
      item.addEventListener('click', (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        action()
      })
      menu.appendChild(item)
    }

    if (list.includes('up')) {
      addItem('de-up', this.callbacks.t('ui.up', 'Move up'), () => {
        this.closeMenus()
        this.callbacks.onUp(blockId)
      })
    }
    if (list.includes('down')) {
      addItem('de-down', this.callbacks.t('ui.down', 'Move down'), () => {
        this.closeMenus()
        this.callbacks.onDown(blockId)
      })
    }
    if (list.includes('settings') && hasSettings) {
      addItem('de-settings', this.callbacks.t('ui.settings', 'Settings'), () => {
        this.closeMenus()
        this.callbacks.onSettings(blockId, wrapper)
      })
    }
    if (list.includes('delete')) {
      addItem('de-delete', this.callbacks.t('ui.delete', 'Delete'), () => {
        this.closeMenus()
        this.callbacks.onDelete(blockId)
      })
    }

    const controls = wrapper.querySelector('.de-controls')
    ;(controls ?? wrapper).appendChild(menu)
    this.moreEl = menu
    this.markMenuOpen(wrapper)
  }

  openToolbox(
    afterWrapper: HTMLElement,
    tools: ResolvedTool[],
    onSelect: (name: string) => void
  ): void {
    this.closeMenus()
    if (!this.showToolbox) return

    const menu = document.createElement('div')
    menu.className = 'de-menu'
    menu.setAttribute('role', 'menu')

    for (const tool of tools) {
      if (!tool.toolbox) continue
      const item = document.createElement('button')
      item.type = 'button'
      item.className = 'de-menu-item'
      item.setAttribute('role', 'menuitem')
      item.innerHTML = `<span class="de-menu-icon">${tool.toolbox.icon}</span><span>${tool.toolbox.title}</span>`
      item.addEventListener('click', () => {
        onSelect(tool.name)
        this.closeMenus()
      })
      menu.appendChild(item)
    }

    const controls = afterWrapper.querySelector('.de-controls')
    ;(controls ?? afterWrapper).appendChild(menu)
    this.menuEl = menu
    this.markMenuOpen(afterWrapper)
  }

  openSettings(wrapper: HTMLElement, settingsEl: HTMLElement): void {
    this.closeMenus()
    const panel = document.createElement('div')
    panel.className = 'de-settings'
    panel.appendChild(settingsEl)
    const controls = wrapper.querySelector('.de-controls')
    ;(controls ?? wrapper).appendChild(panel)
    this.settingsEl = panel
    this.markMenuOpen(wrapper)
  }

  openSlashMenu(
    anchor: HTMLElement,
    tools: ResolvedTool[],
    filter: string,
    onSelect: (name: string) => void
  ): void {
    this.closeMenus()
    const q = filter.toLowerCase()
    const filtered = tools.filter(
      (t) =>
        t.toolbox &&
        (!q ||
          t.toolbox.title.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q))
    )

    const menu = document.createElement('div')
    menu.className = 'de-menu de-slash-menu'
    menu.setAttribute('role', 'listbox')

    if (filtered.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'de-menu-empty'
      empty.textContent = this.callbacks.t('ui.noResults', 'No matching blocks')
      menu.appendChild(empty)
    } else {
      filtered.forEach((tool, i) => {
        const item = document.createElement('button')
        item.type = 'button'
        item.className = 'de-menu-item' + (i === 0 ? ' de-menu-active' : '')
        item.dataset.toolName = tool.name
        item.innerHTML = `<span class="de-menu-icon">${tool.toolbox!.icon}</span><span>${tool.toolbox!.title}</span>`
        item.addEventListener('click', () => {
          onSelect(tool.name)
          this.closeMenus()
        })
        menu.appendChild(item)
      })
    }

    anchor.appendChild(menu)
    this.slashEl = menu
    this.slashIndex = 0
    this.markMenuOpen(anchor)
  }

  navigateSlash(direction: 1 | -1): void {
    if (!this.slashEl) return
    const items = Array.from(this.slashEl.querySelectorAll<HTMLElement>('.de-menu-item'))
    if (!items.length) return
    items[this.slashIndex]?.classList.remove('de-menu-active')
    this.slashIndex = (this.slashIndex + direction + items.length) % items.length
    items[this.slashIndex]?.classList.add('de-menu-active')
    items[this.slashIndex]?.scrollIntoView({ block: 'nearest' })
  }

  confirmSlash(): string | null {
    if (!this.slashEl) return null
    const active = this.slashEl.querySelector<HTMLElement>('.de-menu-item.de-menu-active')
    return active?.dataset.toolName ?? null
  }

  isSlashOpen(): boolean {
    return !!this.slashEl
  }

  closeMenus(): void {
    this.clearMenuOpen()
    this.menuEl?.remove()
    this.menuEl = null
    this.settingsEl?.remove()
    this.settingsEl = null
    this.slashEl?.remove()
    this.slashEl = null
    this.moreEl?.remove()
    this.moreEl = null
  }

  handleOutsideClick(e: MouseEvent): void {
    const path = e.composedPath()
    const inside =
      (this.menuEl && path.includes(this.menuEl)) ||
      (this.settingsEl && path.includes(this.settingsEl)) ||
      (this.slashEl && path.includes(this.slashEl)) ||
      (this.moreEl && path.includes(this.moreEl))
    if (!inside) this.closeMenus()
  }

  private btn(cls: string, title: string, label: string, drag = false): HTMLButtonElement {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = `de-btn ${cls}`
    b.title = title
    b.setAttribute('aria-label', title)
    b.textContent = label
    if (drag) {
      b.draggable = true
      b.style.cursor = 'grab'
    }
    return b
  }
}
