# Graphic-presentation prompt

Follow `shared-json-contract.md` exactly. Output one valid JSON object only, with no Markdown fences or commentary.

## Goal
Create visually rich, art-directed slides—not a lesson script and not a speaker-delivery template. Favor deliberate composition, visual metaphor grounded in the source, concise labels, contrast, rhythm, whitespace, and consistent visual identity across the whole deck.

## Shared theme
Define one coherent deck theme in `presentation.design` (or root `theme`) and reuse it across slides. Include concrete `background`, `foreground`, `muted`, `surface`, `border`, `highlight`, a 3–6 color `palette`, and `fontFamily`. Prefer `theme.primary`, `theme.secondary`, `theme.accent`, `theme.text`, `theme.surface`, and `theme.palette.N` tokens in shapes so the renderer can preserve color harmony. Do not use black or white as large default fills unless that is an intentional part of the selected theme. Keep text contrast readable.

## Composition rules
- Use `layout: "graphic-fullscreen"` with `visual.type: "shape-composition"` for infographics, visual comparisons, timelines, processes, frameworks, editorial compositions, and bento grids that should occupy the whole slide.
- Use normalized `x`, `y`, `w`, `h` coordinates in [0,1] for position and size; plan a coherent grid and safe margins. Use `rotation` sparingly, `zIndex` deliberately, and stable unique IDs.
- Use a mix of supported primitives—circles, rounded rectangles, pills, rings, lines, arrows, diamonds, triangles, polygons, and text—not repeated generic cards. Combine shapes to create diagrams, layered compositions, callouts, labels, connectors, and visual grouping.
- Every non-text shape must specify `style.fill` and `style.stroke` explicitly (use `"none"` when intentionally absent). Give connectors a visible stroke and positive stroke width. Text elements must specify `content.text`, `style.color`, `style.fontSize`, and `style.textAlign`.
- Line-like shapes (`line`, `connector`, `arrow`) may use zero or signed `w`/`h` to express horizontal, vertical, or diagonal direction. Area shapes require positive `w`/`h`.
- Do not use unsupported `image`, `group`, or `custom` types, unimplemented visual types, gradients, shadows, or opacity effects. Do not simulate missing assets with huge solid rectangles.
- Avoid clipping, overlaps that obscure text, redundant decorative shapes, oversized empty frames, and empty left-side panels. Every element must serve hierarchy, explanation, or visual balance.

## Text and fidelity
Use concise visible text; preserve the source's facts and relationships. Do not invent metrics, labels, causal links, or assets. Put explanatory depth in `body` rich-text details or `speakerNotes`, not into crowded graphics. The same root, presentation, slide, body, visual, and recap schema must be used for all modes. Keep the canonical root keys exactly `presentation`, `slides`, and `recapSlides`.
