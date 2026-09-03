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
  const onChangeRef = useRef(props.onChange)
  const onReadyRef = useRef(props.onReady)
  const onApiRef = useRef(props.onApi)
  const lastEmittedJson = useRef<string | null>(null)
  const configured = useRef(false)

  onChangeRef.current = props.onChange
  onReadyRef.current = props.onReady
  onApiRef.current = props.onApi

  // One-time structural config (tools/tunes/etc). Remounting these mid-edit is intentional
  // only when the host identity of those objects changes — not on every render.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (props.tools) el.tools = props.tools
    if (props.tunes) el.tunes = props.tunes
    if (props.plugins) el.plugins = props.plugins
    if (props.ui) el.ui = props.ui
    if (props.shortcuts) el.shortcuts = props.shortcuts
    if (props.sanitize) el.sanitize = props.sanitize
    if (props.i18n) el.i18n = props.i18n
    el.inlineToolbar = !!props.inlineToolbar
    if (!configured.current && props.data) {
      el.data = props.data
      lastEmittedJson.current = JSON.stringify(props.data)
    }
    configured.current = true
    onApiRef.current?.(el.getAPI())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount / identity changes only
  }, [props.tools, props.tunes, props.plugins, props.ui, props.shortcuts, props.sanitize, props.i18n, props.inlineToolbar])

  // Apply external data only when it differs from the last editor-emitted snapshot
  // (avoids wiping the caret on controlled onChange loops).
  useEffect(() => {
    const el = ref.current
    if (!el || !props.data) return
    const json = JSON.stringify(props.data)
    if (json === lastEmittedJson.current) return
    lastEmittedJson.current = json
    el.render(props.data)
  }, [props.data])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handleChange = (e: Event) => {
      const detail = (e as CustomEvent<OutputData>).detail
      lastEmittedJson.current = JSON.stringify(detail)
      onChangeRef.current?.(detail)
    }
    const handleReady = () => onReadyRef.current?.()
    el.addEventListener('change', handleChange)
    el.addEventListener('ready', handleReady)
    return () => {
      el.removeEventListener('change', handleChange)
      el.removeEventListener('ready', handleReady)
    }
  }, [])

  useEffect(() => {
    ref.current?.setReadOnly(!!props.readOnly)
  }, [props.readOnly])

  return createElement('doc-editor', {
    ref,
    className: props.className,
    style: props.style,
    placeholder: props.placeholder,
    'default-block': props.defaultBlock,
    readonly: props.readOnly ? true : undefined,
    autofocus: props.autofocus ? true : undefined,
    'min-height': props.minHeight != null ? String(props.minHeight) : undefined,
    'inline-toolbar': props.inlineToolbar ? true : undefined,
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
