# Canonical JSON render contract

The canonical JSON root is always exactly `presentation`, `slides`, and `recapSlides`. A generation style is selected by the caller/prompt and is **not** serialized as a root-level `mode`. Presentation, teaching, visual-storytelling, and future styles share this contract.

## Compatibility rule

Core content fields remain required by the canonical validator. Rendering enhancements are optional: omit them or set supported optional fields to `null` and the compiler uses stable defaults. Unknown layout names produce a warning and use standard content layout. Unknown visual types are rejected because the canonical visual registry requires an implemented schema and renderer. Do not add style-specific root keys.

## Optional shared design settings

Within `presentation` (or `presentation.design` where applicable):

- `direction`: `rtl`, `ltr`, or `auto`; defaults to RTL for the current Persian-first renderer.
- `fontScale`: [0.5, 2], `spacingScale`: [0.5, 2], `radiusScale`: [0.25, 3]; omitted/null values use renderer defaults.
- `shadowStyle`: `none | soft | medium | strong`; `contrast`: `normal | high`.
- Theme precedence: registered `presentation.theme` ID → shared `presentation.design` overrides → slide `theme` overrides. Explicit `slide.background` overrides a theme background; canvas background settings take precedence over theme backgrounds.
- `shadowStyle`, `contrast`, `palette`, `semanticColors`: optional design-system hints.
`canvas`: optional `width`, `height`, `aspectRatio` (`W:H`), `background`, `fullscreen`, `mode` (`fullscreen | fit | fixed`), and `safeArea` insets. Dimensions are positive integers up to 8192; an explicit positive aspect ratio is authoritative and derives the other dimension from width (or height if width is absent).
- `design`: optional shared theme object with `background`, `foreground`, `muted`, `surface`, `border`, `highlight`, `palette`, and `fontFamily`.

## Optional slide-level layout settings

A slide may provide `layoutConfig` to refine the common layout without changing the schema: `fullscreen` (boolean), `visualSide` (`left | right`), `visualWidthRatio` (inclusive [0.1, 0.9]), `padding`, and `gap` (non-negative bounded numbers). Unknown layoutConfig keys are validation errors. The same keys may be used in `presentation.layoutDefaults`; slide values override defaults. Existing layout names remain strings so new styles can be introduced without changing the root contract.

## Chart contract

Bar charts support multiple series with matching category labels, negative and positive finite values, and an optional unit. Line chart X values are consistently numeric (scaled to the numeric domain) or categorical strings; Y values must be finite. Pie values are non-negative with a positive total; the optional unit defaults to percentage-of-total labels.

## Shape-composition contract

Use `visual.type = "shape-composition"` and `visual.data = { "version": 1, "canvas": { "aspectRatio": "16:9", "background": "theme.background" }, "elements": [] }`. Element geometry `x`, `y`, `w`, and `h` is normalized to the canvas; `rotation` and `zIndex` are optional. For `line`, `connector`, and `arrow`, `h: 0` is valid and represents a horizontal line (use a non-zero `w`); all other shape types require positive `w` and `h`. Shape style/content are optional and may be null. Supported element vocabulary includes rectangles, rounded rectangles, pills, circles, ellipses, rings, triangles, diamonds, lines, connectors, arrows, polygons, text, brackets, and arcs. `image`, `group`, and `custom` have no registered renderer and are rejected; add both a schema and a renderer before documenting such types as supported. Use theme tokens such as `theme.background`, `theme.surface`, `theme.text`, `theme.primary`, or `theme.palette.0`; unresolved tokens fall back safely.

The validator rejects malformed core structure, duplicate slide/element IDs, duplicate slide order values, unknown visual types, invalid chart/table data, and geometry/style values outside renderer bounds. Geometry extending past the canvas emits warnings rather than being silently changed. Keep visible content source-faithful: do not fabricate metrics, relationships, citations, or image assets.
