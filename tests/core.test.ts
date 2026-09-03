import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Editor } from '../src/editor'
import { History } from '../src/core/history'
import { blocksToMarkdown, sanitizeHtml } from '../src/utils/markdown'
import { processPaste } from '../src/core/paste'
import { resolveTools } from '../src/core/tools-registry'
import { DEFAULT_TOOLS } from '../src/editor'
import { EDITOR_VERSION } from '../src/types'

describe('sanitizeHtml', () => {
  it('strips script tags and event handlers', () => {
    const dirty = `<p onclick="alert(1)">hi</p><script>evil()</script>`
    const clean = sanitizeHtml(dirty)
    expect(clean).not.toMatch(/script/i)
    expect(clean).not.toMatch(/onclick/i)
    expect(clean).toContain('hi')
  })

  it('neutralizes javascript: URLs and unquoted handlers', () => {
    expect(sanitizeHtml(`<a href="javascript:alert(1)">x</a>`)).toMatch(/href="#"/)
    expect(sanitizeHtml(`<img src=x onerror=alert(1)>`)).not.toMatch(/onerror/i)
  })
})

describe('blocksToMarkdown', () => {
  it('serializes common block types', () => {
    const md = blocksToMarkdown({
      time: 0,
      version: EDITOR_VERSION,
      blocks: [
        { id: '1', type: 'header', data: { text: 'Title', level: 1 } },
        { id: '2', type: 'paragraph', data: { text: 'Hello <b>world</b>' } },
        { id: '3', type: 'list', data: { style: 'unordered', items: ['a', 'b'] } },
        { id: '4', type: 'checklist', data: { items: [{ text: 'todo', checked: true }] } },
        { id: '5', type: 'delimiter', data: {} },
        { id: '6', type: 'image', data: { url: 'https://x.test/a.png', caption: 'cap' } },
        { id: '7', type: 'quote', data: { text: 'q', caption: 'a' } },
      ],
    })
    expect(md).toContain('# Title')
    expect(md).toContain('Hello world')
    expect(md).toContain('- a')
    expect(md).toContain('- [x] todo')
    expect(md).toContain('---')
    expect(md).toContain('![cap](https://x.test/a.png)')
    expect(md).toContain('> q')
  })
})

describe('History', () => {
  it('undoes and redoes snapshots', () => {
    const h = new History()
    const a = { time: 1, version: '1', blocks: [{ id: 'a', type: 'paragraph', data: { text: 'a' } }] }
    const b = { time: 2, version: '1', blocks: [{ id: 'b', type: 'paragraph', data: { text: 'b' } }] }
    const c = { time: 3, version: '1', blocks: [{ id: 'c', type: 'paragraph', data: { text: 'c' } }] }
    h.seed(a)
    h.push(b)
    h.push(c)
    expect(h.canUndo()).toBe(true)
    const prev = h.undo(c)
    expect(prev?.blocks[0]?.id).toBe('b')
    const next = h.redo(prev!)
    expect(next?.blocks[0]?.id).toBe('c')
  })
})

describe('resolveTools', () => {
  it('accepts bare classes and { class, config } entries', () => {
    const map = resolveTools({
      paragraph: DEFAULT_TOOLS.paragraph!,
      image: { class: DEFAULT_TOOLS.image as never, config: { byUrl: false } },
    })
    expect(map.get('paragraph')?.config).toEqual({})
    expect(map.get('image')?.config).toEqual({ byUrl: false })
  })
})

describe('processPaste', () => {
  it('splits plain text into paragraph blocks', () => {
    const tools = resolveTools(DEFAULT_TOOLS)
    const event = {
      clipboardData: {
        getData: (type: string) => (type === 'text/plain' ? 'one\n\ntwo' : ''),
      },
    } as unknown as ClipboardEvent

    const result = processPaste(event, { tools, defaultBlock: 'paragraph' })
    expect(result).toHaveLength(2)
    expect(result?.[0]?.data).toEqual({ text: 'one' })
    expect(result?.[1]?.data).toEqual({ text: 'two' })
  })

  it('parses markdown-ish headers', () => {
    const tools = resolveTools(DEFAULT_TOOLS)
    const event = {
      clipboardData: {
        getData: (type: string) => (type === 'text/plain' ? '## Hello' : ''),
      },
    } as unknown as ClipboardEvent
    const result = processPaste(event, { tools, defaultBlock: 'paragraph' })
    expect(result?.[0]?.type).toBe('header')
    expect(result?.[0]?.data).toMatchObject({ level: 2, text: 'Hello' })
  })

  it('parses HTML lists into list items (not raw li markup)', () => {
    const tools = resolveTools(DEFAULT_TOOLS)
    const event = {
      clipboardData: {
        getData: (type: string) =>
          type === 'text/html' ? '<ul><li>one</li><li>two</li></ul>' : '',
      },
    } as unknown as ClipboardEvent
    const result = processPaste(event, { tools, defaultBlock: 'paragraph' })
    expect(result?.[0]?.type).toBe('list')
    expect(result?.[0]?.data).toEqual({ style: 'unordered', items: ['one', 'two'] })
  })
})

describe('Editor', () => {
  let holder: HTMLElement

  beforeEach(() => {
    holder = document.createElement('div')
    document.body.appendChild(holder)
  })

  afterEach(() => {
    holder.remove()
  })

  it('mounts with a default paragraph and saves OutputData', async () => {
    const editor = new Editor({ holder })
    await new Promise((r) => setTimeout(r, 50))
    expect(editor.isReady()).toBe(true)
    const data = await editor.save()
    expect(data.version).toBe(EDITOR_VERSION)
    expect(data.blocks.length).toBe(1)
    expect(data.blocks[0]?.type).toBe('paragraph')
    editor.destroy()
  })

  it('inserts, moves, and deletes via API', async () => {
    const editor = new Editor({ holder })
    await new Promise((r) => setTimeout(r, 50))
    const api = editor.getAPI()
    const firstId = api.blocks.getBlocks()[0]!.id
    const secondId = api.blocks.insertAfter(firstId, 'header', { text: 'Hi', level: 2 })
    expect(api.blocks.getCount()).toBe(2)
    api.blocks.move(secondId, 'up')
    expect(api.blocks.getBlockByIndex(0)?.id).toBe(secondId)
    api.blocks.delete(secondId)
    expect(api.blocks.getCount()).toBe(1)
    editor.destroy()
  })

  it('respects ui.showControls = false', async () => {
    const editor = new Editor({ holder, ui: { showControls: false } })
    await new Promise((r) => setTimeout(r, 20))
    expect(holder.querySelector('.de-controls')).toBeNull()
    editor.destroy()
  })

  it('supports undo after structural change', async () => {
    const editor = new Editor({ holder })
    await new Promise((r) => setTimeout(r, 50))
    const api = editor.getAPI()
    const id = api.blocks.getBlocks()[0]!.id
    api.blocks.insertAfter(id, 'paragraph', { text: 'x' })
    await new Promise((r) => setTimeout(r, 400))
    expect(api.blocks.getCount()).toBe(2)
    await editor.undo()
    expect(api.blocks.getCount()).toBe(1)
    editor.destroy()
  })
})
