# Graphic-presentation prompt

Follow `shared-json-contract.md` and the runtime validator exactly. Return one JSON object only: no Markdown fences, comments, or prose.

## Goal
Create a colorful, polished, visually expressive presentation—not a lesson script and not a speaker-delivery template. Use deliberate art direction: strong focal points, geometric shapes, layered composition, typography, contrast, whitespace, diagrams, and varied layouts. The deck should feel designed, not like repeated generic cards.

## Shared contract is mandatory
- Use exactly the canonical root keys: `presentation`, `slides`, `recapSlides`. Never add a `mode` key.
- Choose a registered `presentation.theme` ID where possible (`light`, `dark`, `ocean`, `forest`, `sunset`, `lavender`, `rose`, `sepia`, `midnight`, `neon`). Treat it as the base theme; use `presentation.design` for shared overrides and `slide.theme` for local overrides.
- Use exactly the required metadata, slide, body, visual, and recap fields from `shared-json-contract.md`. Do not add arbitrary fields.
- Select only validator-supported layouts: `title`, `content`, `visual-right`, `image-led-right`, `asymmetric-editorial`, `graphic-fullscreen`, `full-bleed`, `shape-composition`.
- Select only supported visual types: `none`, `icon-list`, `bar-chart`, `line-chart`, `pie-chart`, `comparison-grid`, `table`, `shape-composition`.
- For a full-slide composition, use `layout: "graphic-fullscreen"` with `visual.type: "shape-composition"`. Do not place full-canvas coordinates inside a normal split content layout.
- Do not use unsupported shape types such as `image`, `group`, or `custom`. The current shape types are `rectangle`, `rounded-rectangle`, `pill`, `circle`, `ellipse`, `ring`, `triangle`, `diamond`, `line`, `connector`, `arrow`, `polygon`, `text`, `bracket`, and `arc`.
- Shape `style` may contain only the keys documented in the shared contract. Do not emit `shadow`, `gradient`, `blendMode`, `lineHeight`, or undocumented style/content properties.
- To avoid validator incompatibilities, omit `fontWeight` unless necessary; when used, use only the named values `"normal"` or `"bold"`; numeric weights are not supported by the current renderer. Use `textAlign` values `left`, `center`, or `right`; `verticalAlign` values `top`, `middle`, or `bottom`.
- Every element must have a unique `id`, supported `type`, finite normalized `x` and `y` in [0,1], and valid dimensions. Area shapes require positive dimensions no larger than the normalized canvas; `line`, `connector`, and `arrow` may use signed dimensions but cannot have both dimensions equal to zero. Keep visible content within the canvas.
- Text shapes use `content.text` and supported style fields such as `color`, `fontSize`, and `textAlign`. `fontSize` is CSS pixels (6–512); use `fontScale` as a separate multiplier (0.25–4), never a fractional normalized canvas height as font size. `strokeWidth: 0` explicitly removes a shape outline. Use only `fill`, `stroke`, `strokeWidth`, `fontSize`, `color`, `textAlign`, `fontWeight`, `opacity`, `verticalAlign`, `radius`, `lineDash`, `dash`, `endArrow`, and `fontScale` in `style`.
- Do not claim unsupported effects or assets. Do not create image URLs. Use a supported visual or `none` when an actual asset/data source is unavailable.

## Theme and optional settings
Use `presentation.design` for a coherent render theme when desired. It may define supported theme values such as `background`, `foreground`, `muted`, `surface`, `border`, `highlight`, `palette`, and `fontFamily`. Use a coordinated palette of 3–6 colors and preserve readable contrast. Reuse theme tokens and colors consistently instead of assigning random colors to every shape.

If a non-essential user preference—theme, palette, background, font preference, or other visual customization—is missing, empty, or null, choose a tasteful default and continue. Never fail or omit the presentation merely because optional design preferences were not supplied. Required source material and required canonical fields must still be present. If the source is too empty to support meaningful slides, do not invent facts; return the best valid minimal deck the available source supports.

## Composition
- Use shapes frequently when they communicate hierarchy, group related ideas, frame a message, or explain a source-supported relationship.
- Mix circles, rings, pills, rounded rectangles, polygons, lines, arrows, and text where appropriate. Avoid repeating the same card grid on every slide.
- Every significant shape must serve a visual or semantic purpose. Use intentional scale, spacing, layering, alignment, and contrast.
- Use a strong opening, meaningful variation between slides, and a source-supported ending. Each slide needs a clear focal point.
- Avoid blank oversized panels, useless empty shapes, accidental overlaps, clipped text, and decorative elements that consume space without communicating anything.
- Use colorful compositions, but maintain a consistent visual identity and readable text. Do not use large solid shapes as fake image placeholders.
- Use charts and diagrams only when the source supports their values and relationships. Never invent statistics, categories, rankings, steps, dates, causal links, or evidence to make a slide look more impressive.

## Source fidelity and text
The provided source is the factual foundation for visible slide content. Preserve important names, numbers, units, dates, qualifications, and distinctions. You may reorganize the source visually but must not change its meaning or introduce unsupported claims.
Keep visible text concise but not misleadingly incomplete. Put additional explanation in permitted `body.lead`, `body.bullets[]`, or `body.emphasis` objects using exactly `{"text":"Visible text","details":"Non-empty additional explanation"}`; otherwise use plain strings. Never add details fields to other objects. Do not use external research unless it is available and citations can be supplied accurately inside More Details.

## Final validation checklist
Before returning JSON, verify:
1. JSON parses directly with `JSON.parse()`.
2. Root keys are exactly `presentation`, `slides`, and `recapSlides`.
3. Every required field exists and has the correct type.
4. No unsupported layout, visual type, shape type, or style/content key appears.
5. All slide IDs are unique; all recap and metadata slide references exist.
6. All geometry, colors, dimensions, enum values, and rich-text objects conform to the shared contract.
7. Empty optional visual preferences use defaults rather than causing failure.
8. No unsupported facts, statistics, relationships, URLs, or rendering effects are invented.

Do not claim that the actual rendered slides were tested unless they were rendered and inspected.
