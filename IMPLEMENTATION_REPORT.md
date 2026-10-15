# Integrated Presentation Viewer — Implementation Notes

## Changes in this revision

- Connected the Editor's Present action to the existing React Presentation Viewer route, and preserved the selected slide index when moving from Viewer to Editor.
- Kept edit navigation on the native React Editor; no legacy `present.js` editor overlay is used.
- Added a strict `hasValidVisual` validator for reference-deck visuals, retained `visualHasContent` as a compatibility alias, and made no-visual content slides use the full-width text layout.
- Added filtering for empty, colorless left-side visual placeholders when importing/normalizing presentation JSON.
- Increased reference-deck and built-in editor layout paragraph line-height to `2.0`; added spacious Persian typography rules and a visible `؟` details indicator on interactive lines.
- Kept detail metadata embedded in line element names and speaker notes, and added dialog semantics (`data-details`, `aria-haspopup`, keyboard focus) to viewer detail targets.
- Replaced generated theme variables with the exact ten reference palette values, including chart palettes and highlight colors. Theme selection persists under `deck-theme`; the Viewer supports `D` and `Shift+D`.

## Verification status

- `npm test`: could not run because dependencies are not installed (`vitest: not found`).
- `npm run build`: TypeScript/Vite compilation could not complete because dependencies are not installed (`vite/client`, `vite`, and `@vitejs/plugin-react` missing).
- Installing dependencies was attempted, but the package registry was unreachable from this environment. Run `npm ci`, then `npm test` and `npm run build` in a network-enabled environment.


## Follow-up repair (2026-10-14)

- Corrected the `ViewerPage` import path in `src/App.tsx`.
- Moved `handlePresent` below the `commitNotes` declaration to avoid TypeScript use-before-declaration errors.
- Added runtime guards for optional QR-code and PPTX-export globals.
- Fixed theme CSS generation to pass each theme's string ID to `themeCss`.
- Kept `referenceLineDetails` strict to the canonical `details` key (as asserted by the existing unit test), while `lineDetails` and the viewer conversion continue to support `detail`, `tooltip`, `note`, `moreInfo`, and `description` aliases.
- Preserved `visual-frame` for slides with valid visuals, and removed empty placeholder frames only from slides without a valid visual.

Validation note: this environment could not complete `npm ci` because package installation did not finish, so the test suite and production build could not be rerun here. Run `npm ci && npm test && npm run build` in an environment with npm registry access.
