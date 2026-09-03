export { Editor, DEFAULT_TOOLS, Block } from './editor'
export { DocEditorElement, defineDocEditor } from './web-component'
export { blocksToMarkdown, sanitizeHtml, isSafeHref } from './utils/markdown'
export { ParagraphTool } from './tools/paragraph'
export { HeaderTool } from './tools/header'
export { ListTool } from './tools/list'
export { ChecklistTool } from './tools/checklist'
export { QuoteTool } from './tools/quote'
export { DelimiterTool } from './tools/delimiter'
export { ImageTool } from './tools/image'
export type { ImageToolConfig } from './tools/image'
export { AlignmentTune } from './tunes/alignment'
export { InlineToolbar, createInlineToolbarPlugin } from './plugins/inline-toolbar'
export { STYLES } from './styles'
export { EDITOR_VERSION } from './types'
export type {
  BlockTool,
  BlockToolConstructable,
  BlockToolConstructorOptions,
  BlockToolData,
  BlockTune,
  BlockTuneConstructable,
  ControlName,
  ConversionConfig,
  EditorAPI,
  EditorConfig,
  EditorEventMap,
  EditorEventName,
  EditorI18n,
  EditorPlugin,
  EditorTools,
  EditorTunes,
  EditorUIConfig,
  OutputBlockData,
  OutputData,
  PasteConfig,
  PasteEventDetail,
  ResolvedTool,
  SanitizeConfig,
  ShortcutAction,
  ShortcutMap,
  ToolboxConfig,
  ToolSettings,
  TuneSettings,
} from './types'

import { defineDocEditor } from './web-component'

// Auto-register <doc-editor> so a plain <script> tag include (or the IIFE
// build) works with zero setup.
if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  defineDocEditor()
}
