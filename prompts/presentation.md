# Presentation-generation prompt — agentic visual workflow

Follow `shared-json-contract.md` exactly. Output one canonical JSON object only: no Markdown fences, comments, or commentary.

## Operating model: plan, compose, inspect, repair
Treat generation as a staged design-and-validation process. Do not jump directly from source text to JSON.

### Phase 1 — Establish the design system first
Before drafting slides, decide and then encode one coherent art direction for the whole deck:
- Choose exactly one registered `presentation.theme` ID: `light`, `dark`, `ocean`, `forest`, `sunset`, `lavender`, `rose`, `sepia`, `midnight`, or `neon`. Do not use descriptive names such as `editorial-dark` in this field.
- Always provide `presentation.design` with explicit `background`, `foreground`, `muted`, `surface`, `border`, `highlight`, and a coordinated `palette` of 3–6 valid CSS colors; add `primary`, `secondary`, `accent`, and `fontFamily` when useful.
- Set `presentation.canvas` to a sensible 16:9 canvas and a safe area when the design needs it. Choose a consistent typography scale, spacing rhythm, corner treatment, and visual hierarchy through documented fields only.
- Make sure the design works as a system: backgrounds, text, shapes, chart colors, and emphasis colors must look intentional together.

### Phase 2 — Define the narrative and exact visible text
Plan the narrative order and purpose of each slide before drawing shapes. Each slide must have one clear message, a useful title, and concise supporting text. Preserve source facts, figures, dates, units, qualifications, and meaning. Do not invent evidence to fill visual space.
Write the actual visible text before composing the graphics. Decide which text belongs in the slide body and which text must be inside a shape composition. On fullscreen graphic slides, all text intended to be visible MUST be represented by `text` elements in `visual.data.elements`; the renderer does not overlay the ordinary body text on a fullscreen composition.

### Phase 3 — Design the layout and place visuals
Choose a supported layout for each slide based on its communication purpose. Use a meaningful chart/table only when source data supports it; use `shape-composition` for conceptual diagrams, visual metaphors, process flows, callouts, comparisons, and editorial compositions. Vary layouts deliberately; do not repeat the same generic card grid.
When a shape composition is used, create an intentional hierarchy using scale, position, whitespace, alignment, layering (`zIndex`), and contrast. Every shape must either communicate information or strengthen the visual hierarchy. Avoid random decoration, clutter, accidental overlap, and empty placeholder panels.

### Phase 4 — Inspect the complete composition and repair it
Run a final visual QA pass in your reasoning before returning JSON:
1. Check the entire canvas and every slide, not only each element independently.
2. For every text element, inspect the fill/background directly behind its rendered bounds. If dark text sits on a dark shape, change it to a light color; if light text sits on a light shape, change it to a dark color. Do not rely on a theme token if the underlying shape has a conflicting custom fill.
3. Verify readable contrast, text size, line wrapping, safe margins, clipping, overlap, alignment, hierarchy, palette consistency, and slide-to-slide variety.
4. Check that text and shape geometry fit the actual layout frame. Full-canvas coordinates are only for fullscreen compositions; ordinary split layouts reserve separate text and visual regions.
5. Repair all detected problems before returning the JSON. Do not claim browser rendering or screenshot inspection occurred unless it actually did.

## Canonical schema and renderer constraints
- Use exactly the root keys `presentation`, `slides`, and `recapSlides`; never add a `mode` key.
- Include every required metadata and slide field from `shared-json-contract.md`; do not invent keys.
- Supported layouts only: `title`, `content`, `visual-right`, `image-led-right`, `asymmetric-editorial`, `graphic-fullscreen`, `full-bleed`, `shape-composition`.
- Supported visual types only: `none`, `icon-list`, `bar-chart`, `line-chart`, `pie-chart`, `comparison-grid`, `table`, `shape-composition`.
- Supported shape types only: `rectangle`, `rounded-rectangle`, `pill`, `circle`, `ellipse`, `ring`, `triangle`, `diamond`, `line`, `connector`, `arrow`, `polygon`, `text`, `bracket`, `arc`.
- Use only the shape style keys and geometry rules in the shared contract. Do not emit unsupported effects, image URLs, `image`, `group`, `custom`, or undocumented keys.
- Every element needs a unique ID, supported type, finite normalized coordinates, valid dimensions, and visible content where appropriate. Colors must be valid CSS colors or documented `theme.*` tokens. Use `stroke: "none"` only when the renderer contract explicitly allows it; prefer omitting an unnecessary stroke.
- Full-slide compositions MUST use `layout: "graphic-fullscreen"` or a supported fullscreen canvas flag with `visual.type: "shape-composition"`. The fullscreen renderer does not display the ordinary body text on top of the composition.
- Never fabricate charts, facts, categories, statistics, causal links, or evidence. If data is not supplied, use a conceptual diagram rather than a numeric chart.

## Final validation
Validate JSON syntax, required fields, IDs/references, supported theme IDs, layouts, visual types, shape types, styles, colors, geometry, and source fidelity. Return only the final JSON object.
