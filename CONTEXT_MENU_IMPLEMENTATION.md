# Object Context Menu Implementation

## Changes
- Added a dedicated, fixed-position object context menu with viewport-safe placement, scrolling, separators, hover/focus-friendly controls, and keyboard shortcut hints.
- Right-clicking an object selects it and opens the object-specific menu.
- Common actions: Duplicate (`Ctrl+D`), Delete (`Del`), Bring to front, Send to back, Center horizontally, Center vertically, and Format options.
- Text-bearing shapes expose text editing; tables expose table actions; charts expose data/type actions; images expose image actions.
- Duplicate creates a second editable element on the same slide with a small position offset and selects the duplicate.
- `Ctrl+D` now duplicates the selected object; when no object is selected it retains the existing duplicate-slide behavior.
- The menu closes after an action, on outside click, or on Escape.

## Validation
- Source changes were applied to `src/components/editor/ObjectContextMenu.tsx`, `src/pages/Editor.tsx`, `src/icons.tsx`, and `src/styles.css`.
- ZIP integrity and source-level checks can be run after packaging.
- Build/test could not be completed in this environment because required dependencies are absent from `node_modules` (including `react`, `vite`, and type packages); `npm ci` did not complete in the available execution window. Run `npm ci`, `npm run build`, and `npm test` in an environment with package registry access.
