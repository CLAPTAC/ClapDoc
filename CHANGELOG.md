# Changelog

## 1.0.0

Stable public API freeze for the controllable block editor.

### Added
- Expanded `EditorConfig`: `ui`, `shortcuts`, `sanitize`, `i18n`, `minHeight`, `autofocus`, `tunes`, `plugins`, `inlineToolbar`
- Per-tool config via `{ class, config }` (e.g. Image `uploader` / `endpoints`)
- Rich `EditorAPI`: insert/update/convert/moveTo/get*, undo/redo, events, setReadOnly
- Tool lifecycle: `renderSettings`, `destroy`, `rendered`, `updated`, `onPaste`, `pasteConfig`, `conversionConfig`
- Block tunes (`AlignmentTune`) and editor plugins
- Theme CSS variables (`--de-*`) for host theming
- Undo/redo history, drag-and-drop reorder, paste pipeline, slash-command toolbox
- Optional inline toolbar (bold/italic/link)
- React helper: `clapdoc/react` (`ClapDoc`, `useClapDoc`)
- Vitest suite for history, paste, markdown, and Editor API

### Changed
- Package version and `OutputData.version` are `1.0.0`
- Core split into `src/core/*` modules behind the `Editor` facade
- Breaking: `tools` entries may be `{ class, config }` objects (bare classes still work)

## 0.1.0

Initial scaffold: Web Component `<doc-editor>`, built-in tools, markdown export.
