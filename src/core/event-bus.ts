import type { EditorEventMap, EditorEventName } from '../types'

type Handler<K extends EditorEventName> = (payload: EditorEventMap[K]) => void

export class EventBus {
  private listeners = new Map<EditorEventName, Set<Handler<EditorEventName>>>()

  on<K extends EditorEventName>(event: K, handler: Handler<K>): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(handler as Handler<EditorEventName>)
  }

  off<K extends EditorEventName>(event: K, handler: Handler<K>): void {
    this.listeners.get(event)?.delete(handler as Handler<EditorEventName>)
  }

  emit<K extends EditorEventName>(event: K, payload: EditorEventMap[K]): void {
    const set = this.listeners.get(event)
    if (!set) return
    for (const handler of set) {
      try {
        ;(handler as Handler<K>)(payload)
      } catch (err) {
        console.error(`[doc-editor] event "${event}" handler error:`, err)
      }
    }
  }

  clear(): void {
    this.listeners.clear()
  }
}
