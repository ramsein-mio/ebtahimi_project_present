# Canonical JSON render contract

The canonical JSON root is always exactly `presentation`, `slides`, and `recapSlides`. A generation style is selected by the caller/prompt and is **not** serialized as a root-level `mode`. Presentation, teaching, visual-storytelling, and future styles share this contract.

## Compatibility rule

Core content fields remain required by the canonical validator. Rendering enhancements are optional: omit them or set supported optional fields to `null` and the compiler uses stable defaults. Unknown layout names produce a warning and fall back to the ordinary content layout; unknown visual types produce a warning and are omitted without preventing unrelated slide content from compiling. Unknown keys on canonical objects are rejected. Do not add style-specific root keys.

## Optional shared design settings

Within `presentation` (or `presentation.design` where applicable):

- `direction`: `rtl`, `ltr`, or `auto`; defaults to RTL for the current Persian-first renderer.
- `fontScale`, `spacingScale`, `radiusScale`: bounded positive scale factors; omitted/null values use renderer defaults.
- `shadowStyle`, `contrast`, `palette`, `semanticColors`: optional design-system hints; `contrast` is `normal` or `high`.
- `canvas`: optional `width`, `height`, `aspectRatio` (`W:H`), `background`, `fullscreen`, `mode`, and `safeArea` insets (`top`, `right`, `bottom`, `left`). Dimensions are integers from 1 to 8192.
- `design`: optional shared theme object with `background`, `foreground`, `muted`, `surface`, `border`, `highlight`, `palette`, `fontFamily`, and a bounded `fontSize` default for shape-composition text.
- `assets` is retained as opaque metadata; the current renderer does not dereference or draw assets from this array.

## Optional slide-level layout settings

A slide may provide `layoutConfig` to refine the common layout without changing the schema: `fullscreen`, `visualSide`, `visualWidthRatio`, `padding`, and `gap`. Unknown keys or invalid types/ranges are rejected; absent/null supported optional settings use defaults. Existing layout names remain strings so new styles can be introduced without changing the root contract. Layouts `graphic-fullscreen`, `full-bleed`, and `shape-composition` require a `shape-composition` visual because other visuals cannot occupy that renderer path.

## Shape-composition contract

Use `visual.type = "shape-composition"` and `visual.data = { "version": 1, "canvas": { "aspectRatio": "16:9", "background": "theme.background" }, "elements": [] }`. Element geometry `x`, `y`, `w`, and `h` is normalized to the composition canvas; `rotation` and `zIndex` are optional. For `line`, `connector`, and `arrow`, one of `w` or `h` may be zero or signed, but their vector cannot be `(0,0)`; area shapes require positive dimensions. A composition can contain at most 500 elements. Shape style/content are optional and may be null. Supported element vocabulary is `rectangle`, `rounded-rectangle`, `pill`, `circle`, `ellipse`, `ring`, `triangle`, `diamond`, `line`, `connector`, `arrow`, `polygon`, `text`, `bracket`, and `arc`. `image`, `group`, and `custom` are not implemented. Use theme tokens such as `theme.background`, `theme.surface`, `theme.text`, `theme.primary`, or `theme.palette.0`; unknown token names fall back to safe defaults.

The validator checks the schema for each supported visual, unique slide IDs and orders, referenced IDs, finite/bounded geometry and chart data, and exact nested keys. It emits warnings for geometry extending past the canvas. Theme color values must be usable CSS colors or supported theme tokens. Keep visible content source-faithful: do not fabricate metrics, relationships, citations, or image assets.
