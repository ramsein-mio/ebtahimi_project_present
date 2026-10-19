# Canonical JSON render contract

The canonical JSON root is always exactly `presentation`, `slides`, and `recapSlides`. A generation style is selected by the caller/prompt and is **not** serialized as a root-level `mode`. Presentation, teaching, visual-storytelling, and future styles share this contract.

## Compatibility rule

Core content fields remain required by the canonical validator. Rendering enhancements are optional: omit them or set supported optional fields to `null` and the compiler uses stable defaults. Unknown layout names produce the ordinary content layout; unknown visual types produce a warning and should not prevent unrelated slides from compiling. Do not add style-specific root keys.

## Optional shared design settings

Within `presentation` (or `presentation.design` where applicable):

- `direction`: `rtl`, `ltr`, or `auto`; defaults to RTL for the current Persian-first renderer.
- `fontScale`, `spacingScale`, `radiusScale`: positive scale factors; omitted/null values use renderer defaults.
- `shadowStyle`, `contrast`, `palette`, `semanticColors`: optional design-system hints.
- `canvas`: optional `width`, `height`, `aspectRatio` (`W:H`), `background`, `fullscreen`, `mode`, and `safeArea`.
- `design`: optional shared theme object with `background`, `foreground`, `muted`, `surface`, `border`, `highlight`, `palette`, and `fontFamily`.

## Optional slide-level layout settings

A slide may provide `layoutConfig` to refine the common layout without changing the schema: `fullscreen`, `visualSide`, `visualWidthRatio`, `padding`, and `gap`. If absent/null, the compiler chooses defaults. Existing layout names remain strings so new styles can be introduced without changing the root contract.

## Shape-composition contract

Use `visual.type = "shape-composition"` and `visual.data = { "version": 1, "canvas": { "aspectRatio": "16:9", "background": "theme.background" }, "elements": [] }`. Element geometry `x`, `y`, `w`, and `h` is normalized to the canvas; `rotation` and `zIndex` are optional. For `line`, `connector`, and `arrow`, `h: 0` is valid and represents a horizontal line (use a non-zero `w`); all other shape types require positive `w` and `h`. Shape style/content are optional and may be null. Supported element vocabulary includes rectangles, rounded rectangles, pills, circles, ellipses, rings, triangles, diamonds, lines, connectors, arrows, polygons, text, images, brackets, arcs, groups, and custom elements. Use theme tokens such as `theme.background`, `theme.surface`, `theme.text`, `theme.primary`, or `theme.palette.0`; unresolved tokens fall back safely.

The validator rejects malformed core structure and duplicate IDs, and emits warnings for geometry extending past the canvas. Keep visible content source-faithful: do not fabricate metrics, relationships, citations, or image assets.
