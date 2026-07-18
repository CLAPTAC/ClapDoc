export { Editor, DEFAULT_TOOLS } from './editor'
export { DocEditorElement, defineDocEditor } from './web-component'
export { blocksToMarkdown, sanitizeHtml } from './utils/markdown'
export { ParagraphTool } from './tools/paragraph'
export { HeaderTool } from './tools/header'
export { ListTool } from './tools/list'
export { ChecklistTool } from './tools/checklist'
export { QuoteTool } from './tools/quote'
export { DelimiterTool } from './tools/delimiter'
export { ImageTool } from './tools/image'
export type {
  BlockTool,
  BlockToolConstructable,
  BlockToolConstructorOptions,
  BlockToolData,
  EditorAPI,
  EditorConfig,
  EditorTools,
  OutputBlockData,
  OutputData,
  ToolboxConfig,
} from './types'

import { defineDocEditor } from './web-component'

// Auto-register <doc-editor> so a plain <script> tag include (or the IIFE
// build) works with zero setup. Consumers who want a different tag name (or
// to defer registration) can call defineDocEditor(name) themselves — the
// customElements.get guard inside it makes this a no-op if already defined.
if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  defineDocEditor()
}
