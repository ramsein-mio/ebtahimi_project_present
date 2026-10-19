# Shared JSON rendering contract

This is the single contract for every presentation-generation prompt. Presentation, teaching, and graphic prompts may differ in content strategy, but MUST emit the same root and slide structure. Do not invent alternate JSON formats.

## Root object

Required:
- `presentation`: metadata object
- `slides`: non-empty array of slides
- `recapSlides`: array (may be empty)

Optional render settings:
- `theme`: shared visual theme
- `canvas`: dimensions and aspect ratio

`presentation` requires `title`, `subtitle` (string or null), `language`, `theme` (a descriptive theme name), `targetAudience`, `estimatedTotalDurationSeconds` (>0), `learningObjectives` (string array), `coverageChecklist` (array of `{item, slideIds}`), and `teachingRoadmap` (array of `{section, slideIds, purpose}`). It may include `design` (render theme), `canvas`, and `background`.

## Shared render theme

All color values are CSS color strings (prefer hex). Supported keys:
```json
{
  "background": "#10131A",
  "foreground": "#F5F7FA",
  "muted": "#AAB2C0",
  "surface": "#202633",
  "border": "#3A4352",
  "highlight": "#F5C451",
  "palette": ["#5B8DEF", "#F08A5D", "#52B788", "#B18AE0"],
  "fontFamily": ["Vazirmatn", "Tahoma", "Arial"]
}
```
Use the same object shape for root `theme`, `presentation.design`, or a slide-level `theme`. Precedence is slide-level, then `presentation.design` / `presentation.theme` when it is an object, then root `theme`, then renderer defaults.

## Canvas and backgrounds

Root `canvas`, `presentation.canvas`, or `visual.data.canvas` may contain `width`, `height`, `aspectRatio` (for example `"16:9"`), `background`, and where applicable `fullscreen` / `mode`. Use positive dimensions. If both width and height are supplied, they define the canvas. Otherwise the renderer derives height from width and aspect ratio. Default canvas is 1280×720.

A slide may set `background` to a CSS color string or `{"color":"#RRGGBB"}`. It overrides canvas/theme background. A fullscreen graphic slide uses `layout: "graphic-fullscreen"` and `visual.type: "shape-composition"`; it omits the normal title/body framing and places elements on the entire canvas.

## Slide schema

Every slide must have:
```json
{
  "id": "slide-01",
  "order": 1,
  "section": "Introduction",
  "layout": "content",
  "title": "Slide title",
  "subtitle": null,
  "body": {
    "lead": "Main point",
    "bullets": [{"text": "Key point", "details": "Expanded explanation"}],
    "emphasis": "Takeaway"
  },
  "visual": {"type": "none", "data": {}, "caption": null},
  "speakerNotes": "",
  "durationSeconds": 45,
  "psychologicalPurpose": "orient",
  "cognitiveLoad": "low",
  "sourceReference": ""
}
```
`body.lead`, `body.emphasis`, and each bullet may be a string or `{"text":"...","details":"..."}`. Valid cognitive loads: `low`, `medium`, `high`. Slide IDs must be unique and referenced IDs must exist.

Optional slide fields: `background`, `theme`.

## Visual types

- `none`
- `icon-list`: `data.items[]` with `label`, optional `icon`, `description`
- `bar-chart`: `data.series[]` with `values[]` objects (`label`, `value`, optional `color`); series may also set `color`
- `line-chart`: `data.series[]` with `name`, optional `color`, and `points[]` (`x`, `y`)
- `pie-chart`: `data.slices[]` with `label`, `value`, optional `color`
- `comparison-grid`: `data.columns[]`, `data.rows[][]`
- `table`: `data.headers[]`, `data.rows[][]`
- `shape-composition`: `data.version: 1`, optional `data.canvas`, and `data.elements[]`

## Shape composition

Coordinates `x`, `y`, `w`, `h` are normalized fractions of the composition canvas. `x` and `y` must be in [0,1]. Area shapes require positive `w` and `h`; line-like shapes (`line`, `connector`, `arrow`) may use zero or signed `w`/`h` to express direction. Keep visible geometry inside the canvas. `zIndex` controls draw order (low first, high last). Every element has a unique `id` and explicit geometry; optional fields include `rotation`, `style`, `content`, and polygon `points`. Do not use duplicate IDs or emit unknown keys/types.

Supported types in the current renderer: `rectangle`, `rounded-rectangle`, `pill`, `circle`, `ellipse`, `ring`, `triangle`, `diamond`, `line`, `connector`, `arrow`, `polygon`, `text`, `bracket`, `arc`. Do not emit `image`, `group`, or `custom`: they are not rendered as actual images or nested/custom shapes. Do not approximate unsupported elements with giant rectangles.

Supported style keys: `fill` (CSS color, `"none"`, or a theme token), `stroke` (CSS color, `"none"`, or a theme token), `strokeWidth` (positive number), `fontSize` (positive number; values in (0,1] are normalized to canvas height, larger values are pixels), `color` (text color/theme token), `textAlign` (`left`, `center`, `right`), `verticalAlign` (`top`, `middle`, `bottom`), `fontWeight` (`normal`, `bold`, or numeric 100–900 in steps of 100), `opacity` (number in [0,1], applied to fill/stroke/text), `radius` (positive number for rounded shapes), `lineDash`/`dash` (array of positive numbers), `endArrow` (boolean), and `fontScale` (positive number). Text is supplied through `content.text` or `content.value`; `content.side` supports `left`, `right`, `top`, or `bottom` for brackets. Polygon `points` must be an array of at least three normalized objects, each exactly `{ "x": 0.5, "y": 0.5 }` with x/y in [0,1]. For arrows, use type `arrow`; line/connector elements may set `style.endArrow: true`.

Theme tokens include `theme.background`, `theme.foreground`/`theme.text`, `theme.muted`, `theme.surface`/`theme.soft`, `theme.border`/`theme.soft2`, `theme.highlight`, `theme.primary`, `theme.secondary`, `theme.accent`, and `theme.palette.N` (zero-based palette index). These aliases may also be provided as concrete colors in the shared theme object. Use explicit theme tokens rather than hard-coded near-black fills when the composition should adapt to the deck theme. The literal `"theme"` is supported for canvas backgrounds and resolves to the active theme background.

A graphic intended to occupy the entire slide MUST set `layout: "graphic-fullscreen"` or set `visual.data.canvas.fullscreen: true`. Normal `content` layouts reserve a split text/visual frame; normalized full-canvas coordinates must not be used there unless the split frame is intentional.

## Recap slides

Each recap entry must be `{"afterSlideId":"slide-01","type":"retrieval","prompt":"Question"}`. Type is `retrieval` or `spaced-repetition`.

## Non-negotiable rules

1. Emit valid JSON only; no Markdown fences or commentary.
2. Use exactly the shared field names and nesting above for all three modes.
3. Never create a second schema for teaching or graphic mode.
4. Design intent is expressed only through `theme`, `canvas`, slide `background` / `theme`, `layout`, `visual`, and `shape-composition` fields.
5. Use colors explicitly where visual precision matters; do not rely on renderer guesses.
6. Do not claim unsupported visual effects (gradients, shadows, or image assets). `opacity` is supported as a per-element alpha value from 0 to 1.
