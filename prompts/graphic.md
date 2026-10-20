# Graphic-presentation prompt — mandatory agentic art-direction workflow

Follow `shared-json-contract.md` and the runtime validator exactly. Return one canonical JSON object only: no Markdown fences, comments, or prose.

The objective is a polished, visually expressive, contemporary graphic presentation—not a plain text deck. Graphic design is mandatory, but every element must be purposeful, balanced, and beautiful. Never interpret “use more graphics” as permission to add random decoration.

## Phase 1 — Lock the visual system before writing slides
First define the deck-wide design system and encode it in the JSON:
- Choose exactly one registered theme ID for `presentation.theme`: `light`, `dark`, `ocean`, `forest`, `sunset`, `lavender`, `rose`, `sepia`, `midnight`, or `neon`. Descriptive names such as `editorial-dark` are not valid theme IDs.
- `presentation.design` is REQUIRED in graphic mode. Explicitly provide valid CSS colors for `background`, `foreground`, `muted`, `surface`, `border`, `highlight`, `primary`, `secondary`, `accent`, and a coordinated `palette` of 4–6 colors. Include `fontFamily` and suitable `fontSize` where supported.
- Decide on a clear art direction: palette relationships, typography hierarchy, spacing rhythm, geometry language, corner style, density, and the visual mood. Keep this system consistent while allowing slide-level variety.
- Prefer the explicit `presentation.design` values over relying on defaults. Do not assume `presentation.palette` alone defines the full visual theme.

## Phase 2 — Plan the message and specify visible text
Before drawing, write a slide-by-slide message plan. Each slide needs one central idea and a deliberate visual reading order. Preserve the source's facts, names, values, dates, units, qualifications, and intended meaning.
Write all visible text precisely and concisely before composing graphics. Determine whether each text item belongs in the normal body area or inside the composition. On fullscreen slides, the normal `body` text is not drawn over the graphic: every visible headline, label, annotation, and callout MUST be a `text` element in `visual.data.elements`.

## Phase 3 — Compose the graphics over the design system
Graphic use is mandatory:
- Every non-title slide MUST contain a meaningful visual. Use `shape-composition` on at least 80% of non-title slides. On remaining slides, use a meaningful supported chart/table/grid only when the source supports its data; add shape composition instead whenever needed to preserve the graphic-led style.
- For each `shape-composition`, use at least 6 purposeful elements when the message can support them; complex concept/process slides commonly use 8–16. This is a quality target, not a reason to invent content or fill space with meaningless shapes. Simple source material may justify fewer elements, but still needs a strong visual focal point.
- Use a deliberate mix of shape primitives when appropriate: large framing geometry, circles/rings, pills, polygons, connectors/arrows, dividers, labels, and text. Use layering with `zIndex` to establish foreground/background order. Do not repeat the same composition template across consecutive slides.
- Use `graphic-fullscreen` for a genuine full-canvas editorial composition. Use `visual-right`, `asymmetric-editorial`, or another appropriate split layout when ordinary body text and the composition should occupy separate regions. Do not place full-canvas coordinates into a split visual frame.
- For fullscreen slides, put all visible text inside the shape composition as text elements. Use `visual.data.canvas.background: "theme"` or a valid CSS color when the canvas needs a defined background.
- Every shape must contribute to meaning, hierarchy, grouping, direction, rhythm, emphasis, or visual balance. Do not add meaningless circles, lines, cards, or labels just to satisfy the element count.
- Never create fake image placeholders. Use a diagram instead of an unsupported image. Charts must reflect source-supported data; never invent values, categories, rankings, steps, or causal relationships.

## Phase 4 — Full-canvas visual QA and automatic repair
Before returning the JSON, inspect the entire designed slide as if reviewing a finished artboard:
1. **Text/background contrast:** for every text element, identify the exact visible shape/background behind it. If black/dark text sits on a black/dark shape, change the text to white or another light palette color. If white/light text sits on a white/light shape, change it to a dark palette color. Recheck after every fill or background change. Do not assume `theme.foreground` contrasts with every custom-colored shape.
2. **Layout and geometry:** check the composition against the actual frame and canvas. Keep text, shapes, and connectors within safe areas. Check that arrows point to their targets and that layers do not accidentally hide important content.
3. **Typography:** ensure labels are legible at presentation size, text fits its boxes, hierarchy is obvious, and no text is clipped or crowded.
4. **Art direction:** verify consistent palette, deliberate color distribution, whitespace, balanced visual weight, and meaningful variation between slides.
5. **Repair:** if any text is low-contrast, any shape is redundant, or any element is clipped, overlapping unintentionally, visually unbalanced, or semantically unclear, edit the JSON and inspect again. Do not claim an actual browser render or screenshot test occurred unless it did.

## Strict renderer/schema rules
- Exactly the canonical root keys: `presentation`, `slides`, `recapSlides`. Never add a `mode` key.
- Use all required metadata, slide, visual, and recap fields from `shared-json-contract.md`; no arbitrary keys.
- Supported layouts: `title`, `content`, `visual-right`, `image-led-right`, `asymmetric-editorial`, `graphic-fullscreen`, `full-bleed`, `shape-composition`.
- Supported visual types: `none`, `icon-list`, `bar-chart`, `line-chart`, `pie-chart`, `comparison-grid`, `table`, `shape-composition`.
- Supported shape types: `rectangle`, `rounded-rectangle`, `pill`, `circle`, `ellipse`, `ring`, `triangle`, `diamond`, `line`, `connector`, `arrow`, `polygon`, `text`, `bracket`, `arc`. Do not use `image`, `group`, or `custom`.
- Only documented style keys are allowed. Do not emit `shadow`, `gradient`, `blendMode`, `lineHeight`, or undocumented style/content fields. Use valid CSS colors or supported `theme.*` tokens. Do not use unverified names such as `editorial-dark` as theme IDs.
- Every element must have a unique ID, finite normalized coordinates, valid dimensions, and supported types. Keep visible content inside the canvas.
- Fullscreen compositions must use `visual.type: "shape-composition"`; body text is not rendered over that composition.
- Do not fabricate source facts or numeric data. A valid, attractive conceptual diagram is better than a fabricated chart.
- Validate JSON syntax and all required schema, theme, layout, visual, color, geometry, contrast, and reference constraints. Return JSON only.
