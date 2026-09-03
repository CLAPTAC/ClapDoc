import type { OutputData } from '../types'

export type HistorySnapshot = OutputData

/**
 * Simple snapshot-based undo/redo. Snapshots are deep-cloned OutputData.
 * Text input should be coalesced by the caller before pushing.
 */
export class History {
  private undoStack: HistorySnapshot[] = []
  private redoStack: HistorySnapshot[] = []
  private maxSize: number

  constructor(maxSize = 100) {
    this.maxSize = maxSize
  }

  push(snapshot: HistorySnapshot): void {
    this.undoStack.push(cloneSnapshot(snapshot))
    if (this.undoStack.length > this.maxSize) this.undoStack.shift()
    this.redoStack = []
  }

  /** Replace the top undo entry without clearing redo (for coalesced typing). */
  replaceTop(snapshot: HistorySnapshot): void {
    if (this.undoStack.length === 0) {
      this.push(snapshot)
      return
    }
    this.undoStack[this.undoStack.length - 1] = cloneSnapshot(snapshot)
  }

  canUndo(): boolean {
    return this.undoStack.length > 1
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /**
   * Undo: current state is on top. Pop it to redo, return previous.
   * Requires at least 2 snapshots (baseline + current).
   */
  undo(current: HistorySnapshot): HistorySnapshot | null {
    if (!this.canUndo()) return null
    const cur = this.undoStack.pop()!
    this.redoStack.push(cloneSnapshot(current))
    // Ensure we keep baseline; return the new top as the restore target
    void cur
    return cloneSnapshot(this.undoStack[this.undoStack.length - 1]!)
  }

  redo(current: HistorySnapshot): HistorySnapshot | null {
    if (!this.canRedo()) return null
    const next = this.redoStack.pop()!
    this.undoStack.push(cloneSnapshot(current))
    return cloneSnapshot(next)
  }

  clear(): void {
    this.undoStack = []
    this.redoStack = []
  }

  /** Seed with an initial baseline snapshot. */
  seed(snapshot: HistorySnapshot): void {
    this.clear()
    this.undoStack.push(cloneSnapshot(snapshot))
  }
}

function cloneSnapshot(data: HistorySnapshot): HistorySnapshot {
  return JSON.parse(JSON.stringify(data)) as HistorySnapshot
}
