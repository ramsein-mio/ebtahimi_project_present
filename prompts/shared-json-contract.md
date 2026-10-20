# Shared JSON rendering contract

This is the single contract for every presentation-generation prompt. Presentation, teaching, and graphic prompts may differ in content strategy, but MUST emit the same root and slide structure. Do not invent alternate JSON formats.

## Canonical root object
The root object must contain exactly these keys:
- `presentation`: metadata object
- `slides`: non-empty array of slides
- `recapSlides`: array (may be empty)

Do not put `theme`, `canvas`, `mode`, or other extra keys at the root. Root-level extra keys are rejected by the canonical validator.

## Presentation metadata
`presentation` requires:
- `title`: non-empty string
- `subtitle`: string or null
- `language`: string
- `theme`: registered theme ID (for example `midnight`, `light`, `ocean`); legacy descriptive names remain accepted with a warning and use the compatible fallback theme
- `targetAudience`: string
- `estimatedTotalDurationSeconds`: positive finite number
- `learningObjectives`: string array
- `coverageChecklist`: array of `{ "item": string, "slideIds": string[] }`
- `teachingRoadmap`: array of `{ "section": string, "slideIds": string[], "purpose": string }`

The following render settings are optional and belong inside `presentation`, not at the root:
`design`, `canvas`, `background`, `direction`, `locale`, `fontScale`, `spacingScale`, `radiusScale`, `shadowStyle`, `contrast`, `palette`, `semanticColors`, `assets`, and `layoutDefaults`.
Valid bounds: `fontScale` and `spacingScale` are in `[0.5, 2]`; `radiusScale` is in `[0.25, 3]`; `shadowStyle` is `none | soft | medium | strong`; `contrast` is `normal | high`; `direction` is `rtl | ltr | auto`; and `locale` is a valid BCP 47 tag such as `fa-IR` or `en-US`. Canvas width and height, when supplied, are positive integers no larger than 8192; an aspect ratio must contain positive values on both sides. Omitted or null optional styling values use defaults; do not fail solely because an optional style was not provided.

## Shared render theme
Use `presentation.design` (or an optional slide-level `theme`) for render styling. Supported theme keys include:
```json
{
  "background": "#10131A",
  "foreground": "#F5F7FA",
  "muted": "#AAB2C0",
  "surface": "#202633",
  "border": "#3A4352",
  "highlight": "#F5C451",
  "primary": "#5B8DEF",
  "secondary": "#F08A5D",
  "accent": "#52B788",
  "palette": ["#5B8DEF", "#F08A5D", "#52B788", "#B18AE0"],
  "fontFamily": ["Vazirmatn", "Tahoma", "Arial"]
}
```
Color values must be strings; palette must be an array of strings; fontFamily may be a non-empty string or array of non-empty strings. Optional theme properties may be omitted. `presentation.theme` selects a registered base theme; `presentation.design` overrides the base theme, and a slide's `theme` overrides the shared design for that slide. Explicit slide background overrides theme backgrounds; a composition/canvas background takes precedence over theme background settings. Prefer a coherent 3–6 color palette with readable contrast. If the user supplies no registered theme, use `light` or specify explicit design colors.

Theme tokens supported in shape styles include `theme.background`, `theme.foreground` / `theme.text`, `theme.muted`, `theme.surface` / `theme.soft`, `theme.border` / `theme.soft2`, `theme.highlight`, `theme.primary`, `theme.secondary`, `theme.accent`, and `theme.palette.N` (zero-based palette index). The literal `"theme"` is supported as a shape-composition canvas background and resolves to the active theme background.

## Canvas and backgrounds
Canvas settings may be placed in `presentation.canvas` or `visual.data.canvas` (for shape compositions). Supported keys are `width`, `height`, `aspectRatio` (for example `"16:9"`), `background`, `fullscreen`, `mode` (`fullscreen | fit | fixed`) and `safeArea` (`top/right/bottom/left` insets). Dimensions are positive integers from 1 to 8192. If an aspect ratio is supplied, it is authoritative: width determines height when both width and height exist; otherwise an explicit height determines width; defaults are 1280×720. Without a ratio, explicit width and height are preserved. Insets are finite non-negative numbers no larger than 4096 and are clamped to the canvas at render time.

A slide may set `background` to a CSS color string or `{"color":"#RRGGBB"}`. It overrides the canvas/theme background. A fullscreen graphic slide uses `layout: "graphic-fullscreen"` and `visual.type: "shape-composition"`; it places elements on the entire canvas.

## Slide schema
Every slide must have the following fields. Optional slide fields are only `background`, `theme`, and `layoutConfig`.
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
`body.lead`, `body.emphasis`, and each bullet may be a string or exactly `{"text":"...","details":"..."}`, with a non-empty details string. Cognitive load must be `low`, `medium`, or `high`. Slide IDs must be unique and referenced IDs must exist. Orders are positive integers; durations are positive finite numbers.

## Supported layouts
Use only these current renderer layouts:
- `title`
- `content`
- `visual-right`
- `image-led-right`
- `asymmetric-editorial`
- `graphic-fullscreen`
- `full-bleed`
- `shape-composition`

Unknown layout names may trigger fallback warnings and render as standard content; do not invent layout names. For `layoutConfig`, use only `fullscreen` (boolean), `visualSide` (`left | right`), `visualWidthRatio` (inclusive `[0.1, 0.9]`), `padding` (0–4096), and `gap` (0–4096). A layout named `graphic-fullscreen`, `full-bleed`, or `shape-composition` must pair with `visual.type: "shape-composition"`; do not rely on a silent fallback.

## Supported visual types
Use only:
- `none`
- `icon-list`: `data.items[]` with `label`, optional `icon`, `description`
- `bar-chart`: `data.series[]` with optional `name`/`color` and non-empty `values[]` objects (`label`, finite `value`, optional `color`). Multiple series are supported; each series must use exactly the same category labels in the same order. Signed values are allowed and share a zero baseline. Optional `data.unit` is displayed with values (`%` attaches without a space; other units get a separating space).
- `line-chart`: `data.series[]` with `name`, optional `color`, and non-empty `points[]` (`x`, finite numeric `y`). All `x` values in the chart must consistently be either finite numbers (scaled to a numeric axis) or non-empty category strings (evenly spaced).
- `pie-chart`: `data.slices[]` with `label`, non-negative finite `value`, optional `color`; the total must be positive. Optional `data.unit` defaults to `%` and shows each slice's percentage of the total; another unit shows raw slice values.
- `comparison-grid`: `data.columns[]`, `data.rows[][]`
- `table`: non-empty `data.headers[]`, `data.rows[][]`; every row must have exactly one cell per header. Cells may be strings or finite numbers.
- `comparison-grid`: non-empty `data.columns[]`, `data.rows[][]`; every row must have exactly one cell per column. Cells may be strings or finite numbers.
- `shape-composition`: `data.version: 1`, optional `data.canvas`, and `data.elements[]`

Unknown visual types are rejected by validation rather than accepted as a warning-only, visually empty slide. Do not use unimplemented visual types.

## Shape composition
Coordinates `x`, `y`, `w`, and `h` are normalized fractions of the composition canvas. `x` and `y` must be in [0,1]. Area shapes require positive `w` and `h`; line-like shapes (`line`, `connector`, `arrow`) may use zero or signed `w`/`h` to express direction. Keep visible geometry inside the canvas. `zIndex` controls draw order (low first, high last). Every element has a unique `id` and explicit geometry; optional fields include `rotation`, `style`, `content`, and polygon `points`. Do not use duplicate IDs or unknown keys/types.

Supported types in the current renderer:
`rectangle`, `rounded-rectangle`, `pill`, `circle`, `ellipse`, `ring`, `triangle`, `diamond`, `line`, `connector`, `arrow`, `polygon`, `text`, `bracket`, `arc`.
Do not emit `image`, `group`, or `custom`: they are not supported by the current renderer.

Supported shape style keys:
`fill`, `stroke`, `strokeWidth`, `fontSize`, `color`, `textAlign`, `fontWeight`, `opacity`, `verticalAlign`, `radius`, `lineDash`, `dash`, `endArrow`, and `fontScale`.
Do not emit `shadow`, `gradient`, `blendMode`, `lineHeight`, or any undocumented key. Colors must be strings. When supplied, `strokeWidth` is in [0, 24] (0 explicitly removes the outline), `fontSize` is CSS pixels in [6, 512], `radius` is non-negative, and `fontScale` is in [0.25, 4]. Use `"none"` as a string to opt out of a fill or stroke; omit the key only to use the renderer's default. `textAlign` must be `left`, `center`, or `right`; `verticalAlign` must be `top`, `middle`, or `bottom`. `fontWeight` must be `"normal"`, `"bold"`, or a numeric integer from 100 to 900 in increments of 100. `opacity` must be within [0,1]. Dash patterns must be arrays of positive finite numbers. `endArrow` must be boolean.
Text is supplied through `content.text` or `content.value`; `content.side` supports `left`, `right`, `top`, or `bottom` for brackets. Content keys are limited to `text`, `value`, and `side`. Polygon `points` must be an array of at least three normalized objects, each exactly `{"x":0.5,"y":0.5}` with x/y in [0,1].

A graphic intended to occupy the entire slide MUST set `layout: "graphic-fullscreen"` or set `visual.data.canvas.fullscreen: true`. Normal `content` layouts reserve a split text/visual frame; do not use full-canvas coordinates there unless the split frame is intentional.

## Recap slides
Each recap entry must be exactly `{"afterSlideId":"slide-01","type":"retrieval","prompt":"Question"}`. Type is `retrieval` or `spaced-repetition`. Every `afterSlideId` must reference an existing slide. The array may be empty.

## Required behavior for missing optional input
- Missing/empty/null optional theme, background, palette, font, or canvas preferences must fall back to renderer defaults or a sensible theme.
- Do not require a user to specify every design option.
- Required structural fields and source content are not optional. If a required field is missing, the generator should repair it from available source/context when safe; if it cannot do so without inventing facts, return a clear validation error instead of fabricating content.
- Do not add unknown properties as a workaround. Normalize or default optional inputs before validation, and preserve the canonical output schema.

## Non-negotiable rules
1. Emit valid JSON only; no Markdown fences or commentary.
2. Use exactly the shared root, metadata, slide, visual, and recap schema in all three modes.
3. Never create a second schema for teaching or graphic mode.
4. Render design intent only through documented metadata, theme, canvas, slide background/theme, layout, visual, and shape-composition fields.
5. Use explicit, coherent colors where visual precision matters.
6. Never claim unsupported visual effects or assets.
7. Validate the complete JSON against the runtime validator before returning it.
