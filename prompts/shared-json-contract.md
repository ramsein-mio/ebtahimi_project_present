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
- `theme`: descriptive theme name (string)
- `targetAudience`: string
- `estimatedTotalDurationSeconds`: positive finite number
- `learningObjectives`: string array
- `coverageChecklist`: array of `{ "item": string, "slideIds": string[] }`
- `teachingRoadmap`: array of `{ "section": string, "slideIds": string[], "purpose": string }`

The following render settings are optional and belong inside `presentation`, not at the root:
`design`, `canvas`, `background`, `direction`, `locale`, `fontScale`, `spacingScale`, `radiusScale`, `shadowStyle`, `contrast`, `palette`, `semanticColors`, `assets`, and `layoutDefaults`.
Only use these optional settings when their values conform to the validator. If absent or null, use renderer defaults. `assets` is retained as opaque metadata; the current SVG renderer does not fetch or draw assets from it. Never fail solely because optional styling input was not provided.

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
Color values must be non-empty CSS color strings or supported `theme.*` tokens; palette must contain 1–12 such strings; fontFamily may be a non-empty string or non-empty string array. `fontSize` (when supplied) is a bounded pixel-size default for text shapes in a composition; `fontScale` and `radiusScale` are positive scale factors up to 4. `contrast` may be `normal` or `high`; `direction` may be `ltr`, `rtl`, or `auto`. Optional theme properties may be omitted. Prefer a coherent 3–6 color palette with readable contrast. If the user supplies no theme, choose a consistent default.

Theme tokens supported in shape styles include `theme.background`, `theme.foreground` / `theme.text`, `theme.muted`, `theme.surface` / `theme.soft`, `theme.border` / `theme.soft2`, `theme.highlight`, `theme.primary`, `theme.secondary`, `theme.accent`, and `theme.palette.N` (zero-based palette index). The literal `"theme"` is supported as a shape-composition canvas background and resolves to the active theme background.

## Canvas and backgrounds
Canvas settings may be placed in `presentation.canvas` or `visual.data.canvas` (for shape compositions). Supported keys are `width`, `height`, `aspectRatio` (for example `"16:9"`), `background`, `fullscreen`, `mode` (`standard` or `fullscreen`), and `safeArea` (`top`, `right`, `bottom`, `left` numeric insets). Use integer dimensions from 1 to 8192. If both width and height are supplied, they define the ratio; otherwise `aspectRatio` defines the shape-composition viewport ratio. Default slide canvas is 1280×720. Insets are non-negative pixel values in the specified canvas coordinate system: horizontal edges are bounded to 25% of canvas width and vertical edges to 25% of canvas height. Insets are scaled to the fitted viewport; the renderer clamps defensively.

A slide may set `background` to a CSS color string or `{"color":"#RRGGBB"}`. It overrides the canvas/theme background. The `title` layout does not render a side visual, so use `visual.type: "none"` for title slides. `graphic-fullscreen`, `full-bleed`, and `shape-composition` layouts—and layout/canvas fullscreen flags—require `visual.type: "shape-composition"`; other combinations are rejected rather than silently rendered with a different layout. Unknown layout names warn and fall back to the standard content layout. Unknown visual types warn and are omitted while the rest of the slide remains available.

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

Unknown layout names may trigger fallback warnings; do not invent layout names.

## Supported visual types
Use only:
- `none`
- `icon-list`: `data.items[]` with `label`, optional `icon`, `description`
- `bar-chart`: `data.series[]` (1–12 series) with `values[]` objects (`label`, non-negative finite `value` up to 1e12, optional `color`); each series may set `name` and `color`. If multiple series are provided, each must use the same category labels in the same order. Optional data fields: `xAxisLabel`, `yAxisLabel`, `unit`, and `valueFormat: "number" | "percent"`.
- `line-chart`: `data.series[]` (1–12 series) with `name`, optional `color`, and `points[]` (1–250 points; each `{ "x": string | number, "y": number }`). Numeric X values are scaled numerically; category labels must align across series. Numeric values must be finite and bounded to ±1e12. Optional fields: `xAxisLabel`, `yAxisLabel`, `unit`.
- `pie-chart`: `data.slices[]` (1–100 entries) with non-empty `label`, non-negative finite `value` up to 1e12, optional `color`; the total must be greater than zero. Optional `unit` and `valueFormat: "number" | "percent"`.
- `comparison-grid`: `data.columns[]`, `data.rows[][]`
- `table`: `data.headers[]`, `data.rows[][]`
- `shape-composition`: `data.version: 1`, optional `data.canvas`, and `data.elements[]`

Do not use unimplemented visual types.

## Shape composition
Coordinates `x`, `y`, `w`, and `h` are normalized fractions of the composition canvas. `x` and `y` must be in [0,1]. Area shapes require positive `w` and `h`; line-like shapes (`line`, `connector`, `arrow`) may use zero or signed `w`/`h` to express direction. Keep visible geometry inside the canvas. `zIndex` controls draw order (low first, high last). Every element has a unique `id` and explicit geometry; optional fields include `rotation`, `style`, `content`, and polygon `points`. Do not use duplicate IDs or unknown keys/types.

Supported types in the current renderer:
`rectangle`, `rounded-rectangle`, `pill`, `circle`, `ellipse`, `ring`, `triangle`, `diamond`, `line`, `connector`, `arrow`, `polygon`, `text`, `bracket`, `arc`.
Do not emit `image`, `group`, or `custom`: they are not supported by the current renderer.

Supported shape style keys:
`fill`, `stroke`, `strokeWidth`, `fontSize`, `fontSizeUnit`, `color`, `textAlign`, `fontWeight`, `opacity`, `verticalAlign`, `radius`, `lineDash`, `dash`, `endArrow`, and `fontScale`.
Do not emit `shadow`, `gradient`, `blendMode`, `lineHeight`, or any undocumented key. Colors must be non-empty CSS color strings or `theme.*` tokens; `fill` and `stroke` may also be `"none"`. `strokeWidth` is in [0,24], `fontSize` is bounded and positive, `radius` is in [0,1000], and `fontScale` is in (0,4]. Use `fontSizeUnit: "px"` for pixel sizes or `"canvas-ratio"` for a fraction of canvas height; if omitted, legacy values in (0,1] keep the old canvas-ratio interpretation. `textAlign` must be `left`, `center`, or `right`; `verticalAlign` must be `top`, `middle`, or `bottom`. `fontWeight` must be `"normal"`, `"bold"`, or a numeric integer from 100 to 900 in increments of 100. `opacity` must be finite and within [0,1]. Dash patterns must be arrays of positive finite numbers. `endArrow` must be boolean. A composition may contain at most 500 elements; use polygon point arrays of 3–1000 normalized points.
Text is supplied through `content.text` or `content.value`; `content.side` supports `left`, `right`, `top`, or `bottom` for brackets. Content keys are limited to `text`, `value`, and `side`. Polygon `points` must be an array of at least three normalized objects, each exactly `{"x":0.5,"y":0.5}` with x/y in [0,1].

A graphic intended to occupy the entire slide MUST set `layout: "graphic-fullscreen"` or set `visual.data.canvas.fullscreen: true`, and its visual must be `shape-composition`. Normal `content` layouts reserve a split text/visual frame; do not use full-canvas coordinates there unless the split frame is intentional.

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
