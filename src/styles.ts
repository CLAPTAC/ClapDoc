// Injected into the Web Component's shadow root (and available for
// non-shadow-DOM consumers) so the editor looks reasonable with zero setup.
// All colors respect the host's light/dark preference.
export const STYLES = /* css */ `
:host {
  display: block;
  color-scheme: light dark;
}
.de-root {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: #1a1a1a;
}
@media (prefers-color-scheme: dark) {
  .de-root { color: #e6e6e6; }
}
.de-blocks {
  display: flex;
  flex-direction: column;
}
.de-block {
  position: relative;
  padding: 4px 4px 4px 84px;
  border-radius: 6px;
}
.de-block:hover {
  background: rgba(120, 120, 120, 0.06);
}
.de-controls {
  position: absolute;
  left: 0;
  top: 4px;
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.12s ease;
}
.de-block:hover .de-controls,
.de-block:focus-within .de-controls {
  opacity: 1;
}
.de-btn {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.de-btn:hover {
  background: rgba(120, 120, 120, 0.15);
}
[contenteditable]:empty:before {
  content: attr(data-placeholder);
  color: #999;
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
  border-left: 3px solid #999;
}
.de-quote-caption {
  font-size: 0.85em;
  color: #888;
  margin-top: 4px;
}
.de-delimiter {
  text-align: center;
  letter-spacing: 0.3em;
  color: #999;
  padding: 8px 0;
  user-select: none;
}
.de-image-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px dashed #999;
  border-radius: 6px;
}
.de-image-url {
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: transparent;
  color: inherit;
}
.de-image-preview img {
  max-width: 100%;
  border-radius: 6px;
  display: block;
}
.de-image-caption {
  font-size: 0.85em;
  color: #888;
  text-align: center;
  margin-top: 4px;
  outline: none;
}
.de-menu {
  position: absolute;
  left: 84px;
  top: 100%;
  z-index: 10;
  display: flex;
  flex-direction: column;
  background: canvas;
  color: canvastext;
  border: 1px solid rgba(120,120,120,0.3);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  padding: 4px;
  min-width: 160px;
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
}
.de-menu-item:hover {
  background: rgba(120, 120, 120, 0.15);
}
.de-readonly .de-controls {
  display: none;
}
`
