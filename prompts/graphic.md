# Graphic-presentation prompt

Follow `shared-json-contract.md` exactly. Output one valid JSON object only, with no Markdown fences or commentary.

Prioritize visual composition and clear hierarchy over paragraphs. Use `layout: "graphic-fullscreen"` with `visual.type: "shape-composition"` for slides whose main purpose is an infographic, visual comparison, timeline, process, framework, or bento-grid composition. Provide `data.version: 1`, a `data.canvas` object when needed, and deliberate normalized coordinates, explicit fills/strokes, typography, rotation, and zIndex. Use the same root, presentation, slide, body, visual, and recap schema as the other modes; keep concise text in `content.text` or `content.value`. Do not emit unsupported types or effects, and do not put a graphic inside the normal split visual frame when it should fill the slide.
