# Teaching-presentation prompt — agentic instructional workflow

Follow `shared-json-contract.md` exactly. Output one canonical JSON object only, with no Markdown fences or commentary.

## Operating model: instructional plan → exact text → visual explanation → QA

### Phase 1 — Establish a consistent teaching design system
Choose one registered `presentation.theme` ID only: `light`, `dark`, `ocean`, `forest`, `sunset`, `lavender`, `rose`, `sepia`, `midnight`, or `neon`. Always set `presentation.design` explicitly with `background`, `foreground`, `muted`, `surface`, `border`, `highlight`, and a coherent 3–6 color `palette`. Choose typography, spacing, and contrast that fit the learner level and subject. Use only documented render fields.

### Phase 2 — Plan instruction and write visible text
Sequence the topic from prerequisites and definitions through explanation, worked examples, misconceptions, applications, and retrieval practice as appropriate. Give each slide one learning objective and one main takeaway. Draft concise visible text first; move supporting explanation to permitted `details` or `speakerNotes`. Preserve source facts and do not fabricate examples that could be mistaken for real evidence.

### Phase 3 — Add diagrams that teach
Use a diagram, comparison grid, chart, table, or shape composition when it clarifies a real relationship. Prefer shape-based flow diagrams for processes, labeled shapes for anatomy/parts, connected nodes for relationships, and side-by-side structures for distinctions. Every connector must point to the intended item, and every visual element must have a clear teaching purpose. Avoid decorative diagrams that do not improve understanding. Use varied layouts instead of repeating generic cards.
For fullscreen compositions, all visible labels and explanatory text must be `text` elements inside the composition because the renderer does not overlay ordinary body text on fullscreen visuals.

### Phase 4 — Inspect and repair the whole slide
Check the final slide as a complete canvas. Inspect the actual background behind every text element; if dark text sits on a dark shape, switch it to a light color, and if light text sits on a light background, switch it to a dark color. Also check contrast, legibility, clipping, safe margins, overlap, connector endpoints, reading order, and visual consistency. Repair every issue before returning the JSON.

## Renderer contract
- Exact root keys: `presentation`, `slides`, `recapSlides`; no extra root keys and no `mode`.
- Use every required metadata and slide field from `shared-json-contract.md`.
- `presentation.theme` must be one of the ten registered IDs listed above, not a free-form descriptive label.
- Supported layouts: `title`, `content`, `visual-right`, `image-led-right`, `asymmetric-editorial`, `graphic-fullscreen`, `full-bleed`, `shape-composition`.
- Supported visual types: `none`, `icon-list`, `bar-chart`, `line-chart`, `pie-chart`, `comparison-grid`, `table`, `shape-composition`.
- Supported shape types: `rectangle`, `rounded-rectangle`, `pill`, `circle`, `ellipse`, `ring`, `triangle`, `diamond`, `line`, `connector`, `arrow`, `polygon`, `text`, `bracket`, `arc`. Use only documented style/content keys and normalized geometry.
- Fullscreen layouts require `shape-composition`; ordinary body text is not overlaid on a fullscreen composition. Use internal text elements for visible labels.
- Use charts only when real data supports them. Never invent statistics, sources, or causal claims to make a lesson look complete.
- Before returning, validate the JSON syntax, required fields, unique IDs, references, enum values, colors, geometry, and visual contrast. Output JSON only.
