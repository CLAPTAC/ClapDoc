import {
  useEffect,
  useRef,
  useCallback,
  createElement,
  type CSSProperties,
  type ReactElement,
  type RefObject,
} from 'react'
import type {
  EditorAPI,
  EditorTools,
  EditorTunes,
  EditorPlugin,
  EditorUIConfig,
  OutputData,
  ShortcutMap,
  SanitizeConfig,
  EditorI18n,
} from '../types'

export interface ClapDocProps {
  data?: OutputData
  tools?: EditorTools
  tunes?: EditorTunes
  plugins?: EditorPlugin[]
  ui?: EditorUIConfig
  shortcuts?: ShortcutMap
  sanitize?: SanitizeConfig
  i18n?: EditorI18n
  placeholder?: string
  defaultBlock?: string
  readOnly?: boolean
  autofocus?: boolean
  minHeight?: number | string
  inlineToolbar?: boolean
  className?: string
  style?: CSSProperties
  onChange?: (data: OutputData) => void
  onReady?: () => void
  onApi?: (api: EditorAPI | null) => void
}

type DocEditorEl = HTMLElement & {
  tools: EditorTools
  tunes: EditorTunes
  plugins: EditorPlugin[]
  data?: OutputData
  ui?: EditorUIConfig
  shortcuts?: ShortcutMap
  sanitize?: SanitizeConfig
  i18n?: EditorI18n
  inlineToolbar: boolean
  save(): Promise<OutputData>
  clear(): void
  render(data: OutputData): void
  undo(): Promise<void>
  redo(): Promise<void>
  setReadOnly(value: boolean): void
  getAPI(): EditorAPI | null
}

/**
 * Thin React wrapper around `<doc-editor>`.
 * Import `clapdoc` once in your app so the custom element is registered:
 *   import 'clapdoc'
 *   import { ClapDoc } from 'clapdoc/react'
 */
export function ClapDoc(props: ClapDocProps): ReactElement {
  const ref = useRef<DocEditorEl | null>(null)
  const {
    data,
    tools,
    tunes,
    plugins,
    ui,
    shortcuts,
    sanitize,
    i18n,
    placeholder,
    defaultBlock,
    readOnly,
    autofocus,
    minHeight,
    inlineToolbar,
    className,
    style,
    onChange,
    onReady,
    onApi,
  } = props

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (tools) el.tools = tools
    if (tunes) el.tunes = tunes
    if (plugins) el.plugins = plugins
    if (ui) el.ui = ui
    if (shortcuts) el.shortcuts = shortcuts
    if (sanitize) el.sanitize = sanitize
    if (i18n) el.i18n = i18n
    el.inlineToolbar = !!inlineToolbar
    if (data) el.data = data
    onApi?.(el.getAPI())
  }, [tools, tunes, plugins, ui, shortcuts, sanitize, i18n, inlineToolbar, data, onApi])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handleChange = (e: Event) => {
      onChange?.((e as CustomEvent<OutputData>).detail)
    }
    const handleReady = () => onReady?.()
    el.addEventListener('change', handleChange)
    el.addEventListener('ready', handleReady)
    return () => {
      el.removeEventListener('change', handleChange)
      el.removeEventListener('ready', handleReady)
    }
  }, [onChange, onReady])

  useEffect(() => {
    ref.current?.setReadOnly(!!readOnly)
  }, [readOnly])

  return createElement('doc-editor', {
    ref,
    className,
    style,
    placeholder,
    'default-block': defaultBlock,
    readonly: readOnly ? true : undefined,
    autofocus: autofocus ? true : undefined,
    'min-height': minHeight != null ? String(minHeight) : undefined,
    'inline-toolbar': inlineToolbar ? true : undefined,
  })
}

export function useClapDoc(): {
  ref: RefObject<DocEditorEl | null>
  save: () => Promise<OutputData | null>
  clear: () => void
  undo: () => Promise<void>
  redo: () => Promise<void>
  getAPI: () => EditorAPI | null
} {
  const ref = useRef<DocEditorEl | null>(null)

  const save = useCallback(async () => {
    if (!ref.current) return null
    return ref.current.save()
  }, [])

  const clear = useCallback(() => {
    ref.current?.clear()
  }, [])

  const undo = useCallback(async () => {
    await ref.current?.undo()
  }, [])

  const redo = useCallback(async () => {
    await ref.current?.redo()
  }, [])

  const getAPI = useCallback(() => ref.current?.getAPI() ?? null, [])

  return { ref, save, clear, undo, redo, getAPI }
}
