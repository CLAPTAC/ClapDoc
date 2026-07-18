# ClapDoc

A framework-agnostic, block-based document editor — Editor.js's Tool API,
shipped as a `<doc-editor>` Web Component. Drop it into any app (React, Vue,
plain HTML, whatever) with a single script tag or `npm install`.

- **No framework lock-in.** The core `Editor` class and every built-in tool
  are plain TypeScript/DOM. The Web Component is a thin wrapper around it.
- **Pluggable tools.** Ship your own block types by implementing three
  methods: `render()`, `save()`, `validate?()`.
- **JSON output**, shaped like Editor.js's `OutputData` (`{ time, blocks,
  version }`), so it's easy to store, diff, or render elsewhere.
- Built-in tools: Paragraph, Header, List, Checklist, Quote, Divider, Image.

## Install

Not published to the npm registry — install directly from this repo:

```bash
npm install git+https://github.com/CLAPTAC/ClapDoc.git
```

`npm install` on this repo runs a `prepare` script that builds `dist/`
automatically, so the git install works out of the box. Pin to a release
instead of always tracking `main` with `...ClapDoc.git#v0.1.0`.

## Usage — Web Component (zero framework)

For plain HTML with no npm step, self-host the built file — clone this repo,
run `npm install && npm run build`, and serve `dist/doc-editor.global.js`
from your own static assets or CDN:

```html
<script src="/vendor/doc-editor.global.js"></script>

<doc-editor placeholder="Start writing…"></doc-editor>

<script>
  const el = document.querySelector('doc-editor')

  el.addEventListener('change', (e) => {
    console.log('current document:', e.detail) // OutputData
  })

  // Or pull it on demand:
  const data = await el.save()
</script>
```

See `demo/index.html` for a runnable version of this.

## Usage — as a module

```ts
import { Editor } from 'clapdoc'

const editor = new Editor({
  holder: document.getElementById('editor'),
  placeholder: 'Start writing…',
  onChange: (data) => saveToServer(data),
})

const data = await editor.save()
```

## Writing a custom tool

```ts
import type { BlockTool, BlockToolConstructorOptions } from 'clapdoc'

class CalloutTool implements BlockTool {
  static toolbox = { title: 'Callout', icon: '<svg>…</svg>' }

  constructor({ data }: BlockToolConstructorOptions) {
    this.data = data
  }

  render() {
    const el = document.createElement('div')
    el.contentEditable = 'true'
    el.className = 'my-callout'
    el.innerHTML = this.data.text ?? ''
    return el
  }

  save(blockContent) {
    return { text: blockContent.innerHTML }
  }
}

const editor = new Editor({
  holder: '#editor',
  tools: { callout: CalloutTool },
})
```

Register it on the Web Component the same way: `el.tools = { callout: CalloutTool }`.

## Exporting to Markdown

```ts
import { blocksToMarkdown } from 'clapdoc'

const markdown = blocksToMarkdown(await editor.save())
```

## Build

```bash
npm install
npm run build     # emits dist/{doc-editor.js, doc-editor.cjs, doc-editor.global.js, doc-editor.d.ts}
npm run dev       # watch mode
```

## Status / what's not done yet

This is a working v1 scaffold, not feature parity with a mature editor:

- No drag-and-drop reordering (up/down buttons only).
- No image upload endpoint by default (reads local files as data URLs; pass
  `config.uploader` to route to your own storage).
- No paste-handling / clipboard sanitization beyond what `sanitizeHtml`
  offers as a utility — wire it up in a custom paste handler if you need it.
- No undo/redo history.

These are natural next additions once the core API stabilizes.
