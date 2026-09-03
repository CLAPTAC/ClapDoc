# ClapDoc

[![version](https://img.shields.io/badge/version-1.0.0-0f766e)](./CHANGELOG.md)

A framework-agnostic, block-based document editor — Editor.js-inspired Tool API,
shipped as a `<doc-editor>` Web Component. Drop it into any app (React, Vue,
plain HTML) with a script tag or `npm install`.

- **Controllable.** UI chrome, shortcuts, sanitize, i18n, events, and a full block API.
- **Pluggable tools & tunes.** Custom block types, settings panels, paste/conversion hooks, and alignment tunes.
- **JSON output** shaped like Editor.js `OutputData` (`{ time, blocks, version }`).
- Built-in tools: Paragraph, Header, List, Checklist, Quote, Divider, Image.
- Undo/redo, drag-and-drop, slash commands (`/`), paste pipeline, optional inline toolbar.

## Install

```bash
npm install git+https://github.com/CLAPTAC/ClapDoc.git
```

`npm install` runs `prepare` → builds `dist/`. Pin a release with `#v1.0.0`.

## Usage — Web Component

```html
<script src="/vendor/doc-editor.global.js"></script>

<doc-editor placeholder="Start writing…" inline-toolbar></doc-editor>

<script>
  const el = document.querySelector('doc-editor')

  el.ui = { controls: ['add', 'drag', 'settings', 'delete'] }
  el.addEventListener('change', (e) => console.log(e.detail))
  el.addEventListener('block-added', (e) => console.log(e.detail))

  const data = await el.save()
  await el.undo()
</script>
```

See `demo/index.html` for a runnable example.

## Usage — module

```ts
import { Editor, ImageTool, AlignmentTune, blocksToMarkdown } from 'clapdoc'

const editor = new Editor({
  holder: '#editor',
  placeholder: 'Start writing…',
  autofocus: true,
  inlineToolbar: true,
  ui: { showControls: true, controls: ['add', 'drag', 'up', 'down', 'settings', 'delete'] },
  tools: {
    image: {
      class: ImageTool,
      config: {
        uploader: async (file) => uploadToMyStorage(file),
      },
    },
  },
  tunes: { alignment: AlignmentTune },
  onChange: (data) => saveToServer(data),
  onReady: () => console.log('ready'),
})

const api = editor.getAPI()
api.blocks.insert({ type: 'header', data: { text: 'Hello', level: 2 } })
api.events.on('block-moved', ({ id, from, to }) => console.log(id, from, to))

const markdown = blocksToMarkdown(await editor.save())
```

## Theming

Override CSS variables on `:host` or `.de-root`:

```css
doc-editor {
  --de-fg: #111;
  --de-accent: #0d9488;
  --de-control-width: 96px;
  --de-radius: 8px;
}
```

## Custom tool

```ts
import type { BlockTool, BlockToolConstructorOptions } from 'clapdoc'

class CalloutTool implements BlockTool {
  static toolbox = { title: 'Callout', icon: '<svg>…</svg>' }
  static pasteConfig = { tags: ['ASIDE'] }
  static conversionConfig = {
    export: (data) => String(data.text ?? ''),
    import: (text) => ({ text }),
  }

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

  renderSettings() {
    const panel = document.createElement('div')
    // …gear UI
    return panel
  }

  save(blockContent) {
    return { text: blockContent.innerHTML }
  }
}
```

## React

```tsx
import 'clapdoc'
import { ClapDoc } from 'clapdoc/react'

export function Page() {
  return (
    <ClapDoc
      placeholder="Start writing…"
      inlineToolbar
      onChange={(data) => console.log(data)}
    />
  )
}
```

## Build & test

```bash
npm install
npm run build
npm test
npm run typecheck
```

## Status

v1.0 freezes the public types in `src/types.ts`. Still not a full Editor.js clone — no collaborative editing / CRDT.
