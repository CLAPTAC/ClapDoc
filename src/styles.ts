// Injected into the Web Component's shadow root (and available for
// non-shadow-DOM consumers) so the editor looks reasonable with zero setup.
// Hosts can override any --de-* token on :host or .de-root.
export const STYLES = /* css */ `
:host {
  display: block;
  color-scheme: light dark;
  --de-fg: #1a1a1a;
  --de-bg: #ffffff;
  --de-muted: #6b7280;
  --de-placeholder: #9ca3af;
  --de-hover: rgba(15, 23, 42, 0.04);
  --de-hover-strong: rgba(15, 23, 42, 0.08);
  --de-border: rgba(15, 23, 42, 0.12);
  --de-radius: 6px;
  --de-control-width: 72px;
  --de-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  --de-font-size: 16px;
  --de-line-height: 1.6;
  --de-menu-bg: #ffffff;
  --de-menu-fg: #1a1a1a;
  --de-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  --de-accent: #2563eb;
  background: var(--de-bg);
  color: var(--de-fg);
}
@media (prefers-color-scheme: dark) {
  :host {
    --de-fg: #f3f4f6;
    --de-bg: #111827;
    --de-muted: #9ca3af;
    --de-placeholder: #6b7280;
    --de-hover: rgba(255, 255, 255, 0.06);
    --de-hover-strong: rgba(255, 255, 255, 0.12);
    --de-border: rgba(255, 255, 255, 0.14);
    --de-menu-bg: #1f2937;
    --de-menu-fg: #f3f4f6;
    --de-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  }
}
.de-root {
  font-family: var(--de-font);
  font-size: var(--de-font-size);
  line-height: var(--de-line-height);
  color: var(--de-fg);
  background: var(--de-bg);
  position: relative;
}
.de-blocks {
  display: flex;
  flex-direction: column;
}
.de-block {
  position: relative;
  display: grid;
  grid-template-columns: var(--de-control-width) minmax(0, 1fr);
  column-gap: 4px;
  align-items: start;
  padding: 2px 4px;
  border-radius: var(--de-radius);
  min-height: 1.8em;
}
.de-block:hover,
.de-block.de-drag-over {
  background: var(--de-hover);
}
.de-block.de-dragging {
  opacity: 0.5;
}
.de-controls {
  grid-column: 1;
  grid-row: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1px;
  width: 100%;
  min-height: 28px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s ease;
}
.de-block:hover .de-controls,
.de-block:focus-within .de-controls,
.de-block.de-menu-open .de-controls {
  opacity: 1;
  pointer-events: auto;
}
.de-block-content,
.de-tune-wrap {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
}
.de-btn {
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--de-muted);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.de-btn:hover {
  background: var(--de-hover-strong);
  color: var(--de-fg);
}
.de-btn.de-drag {
  cursor: grab;
  letter-spacing: -1px;
}
[contenteditable]:empty:before {
  content: attr(data-placeholder);
  color: var(--de-placeholder);
  pointer-events: none;
}
.de-paragraph, .de-header, .de-quote-text, .de-quote-caption, .de-checklist-text {
  outline: none;
  min-height: 1.4em;
}
.de-header[data-level="1"] { font-size: 2em; font-weight: 700; }
.de-header[data-level="2"] { font-size: 1.5em; font-weight: 700; }
.de-header[data-level="3"] { font-size: 1.2em; font-weight: 600; }
.de-list {
  outline: none;
  padding-left: 1.5em;
  margin: 0;
}
.de-checklist-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 4px 0;
}
.de-checklist-row input[type="checkbox"] {
  margin-top: 5px;
}
.de-quote {
  margin: 0;
  padding-left: 1em;
  border-left: 3px solid var(--de-placeholder);
}
.de-quote-caption {
  font-size: 0.85em;
  color: var(--de-muted);
  margin-top: 4px;
}
.de-delimiter {
  text-align: center;
  letter-spacing: 0.3em;
  color: var(--de-placeholder);
  padding: 8px 0;
  user-select: none;
}
.de-image-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px dashed var(--de-placeholder);
  border-radius: var(--de-radius);
}
.de-image-url {
  padding: 6px 8px;
  border: 1px solid var(--de-border);
  border-radius: 4px;
  background: transparent;
  color: inherit;
}
.de-image-preview img {
  max-width: 100%;
  border-radius: var(--de-radius);
  display: block;
}
.de-image-caption {
  font-size: 0.85em;
  color: var(--de-muted);
  text-align: center;
  margin-top: 4px;
  outline: none;
}
.de-menu, .de-settings {
  position: absolute;
  left: 0;
  top: calc(100% + 4px);
  z-index: 30;
  display: flex;
  flex-direction: column;
  background: var(--de-menu-bg);
  color: var(--de-menu-fg);
  border: 1px solid var(--de-border);
  border-radius: 8px;
  box-shadow: var(--de-shadow);
  padding: 4px;
  min-width: 160px;
}
.de-slash-menu {
  left: 0;
  top: calc(100% + 2px);
}
.de-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}
.de-menu-item:hover,
.de-menu-item.de-menu-active {
  background: var(--de-hover-strong);
}
.de-menu-empty {
  padding: 8px;
  color: var(--de-muted);
  font-size: 13px;
}
.de-settings {
  flex-direction: row;
  flex-wrap: wrap;
  gap: 4px;
  min-width: auto;
}
.de-settings-btn, .de-tune-btn {
  border: 1px solid var(--de-border);
  background: transparent;
  color: inherit;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 13px;
}
.de-settings-btn.de-settings-active,
.de-tune-btn.de-tune-active {
  border-color: var(--de-accent);
  color: var(--de-accent);
}
.de-inline-toolbar {
  position: absolute;
  transform: translateX(-50%);
  display: none;
  gap: 2px;
  padding: 4px;
  background: var(--de-menu-bg);
  color: var(--de-menu-fg);
  border: 1px solid var(--de-border);
  border-radius: 6px;
  box-shadow: var(--de-shadow);
  z-index: 20;
}
.de-inline-toolbar button {
  border: none;
  background: transparent;
  color: inherit;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
}
.de-inline-toolbar button:hover {
  background: var(--de-hover-strong);
}
.de-readonly .de-controls {
  display: none;
}
.de-readonly .de-block,
.de-block:not(:has(.de-controls)) {
  grid-template-columns: minmax(0, 1fr);
}
.de-readonly .de-block-content,
.de-readonly .de-tune-wrap,
.de-block:not(:has(.de-controls)) .de-block-content,
.de-block:not(:has(.de-controls)) .de-tune-wrap {
  grid-column: 1;
}
`
