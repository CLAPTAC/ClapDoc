import type {
  BlockToolConstructable,
  EditorTools,
  ResolvedTool,
  ToolSettings,
  EditorTunes,
  TuneSettings,
  BlockTuneConstructable,
} from '../types'

function isToolClass(entry: ToolSettings): entry is BlockToolConstructable {
  return typeof entry === 'function'
}

function isTuneClass(entry: TuneSettings): entry is BlockTuneConstructable {
  return typeof entry === 'function'
}

export function resolveTools(tools: EditorTools): Map<string, ResolvedTool> {
  const map = new Map<string, ResolvedTool>()
  for (const [name, entry] of Object.entries(tools)) {
    if (isToolClass(entry)) {
      map.set(name, {
        name,
        class: entry,
        config: {},
        toolbox: entry.toolbox,
        shortcut: entry.shortcut,
      })
    } else {
      map.set(name, {
        name,
        class: entry.class,
        config: entry.config ?? {},
        toolbox: entry.toolbox ?? entry.class.toolbox,
        shortcut: entry.shortcut ?? entry.class.shortcut,
      })
    }
  }
  return map
}

export function resolveTunes(
  tunes: EditorTunes
): Map<string, { class: BlockTuneConstructable; config: Record<string, unknown> }> {
  const map = new Map<string, { class: BlockTuneConstructable; config: Record<string, unknown> }>()
  for (const [name, entry] of Object.entries(tunes)) {
    if (isTuneClass(entry)) {
      map.set(name, { class: entry, config: {} })
    } else {
      map.set(name, { class: entry.class, config: entry.config ?? {} })
    }
  }
  return map
}
