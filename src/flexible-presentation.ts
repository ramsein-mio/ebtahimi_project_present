/**
 * Tolerant input normalization for presentation JSON/YAML.
 *
 * The renderer still receives the existing web-ppt Presentation model, but
 * authoring inputs may omit optional fields, use shorthand strings, or include
 * custom layout/visual metadata. Unknown fields are retained; unsafe/missing
 * render primitives receive deterministic fallbacks instead of aborting import.
 */
type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function textValue(value: unknown, fallback = ''): string {
  if (value == null) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try { return JSON.stringify(value); } catch { return fallback; }
}

function richLine(value: unknown): unknown {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (isRecord(value)) {
    const text = textValue(value.text ?? value.main ?? value.label ?? value.value ?? value.title);
    const details = textValue(value.details ?? value.detail ?? value.description ?? value.note ?? value.tooltip);
    return details.trim() ? { text, details } : text;
  }
  return textValue(value);
}

function safeNumber(value: unknown, fallback: number, min = 0): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isFinite(n) && n >= min ? n : fallback;
}

function slideIdsFor(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((id) => textValue(id)).filter(Boolean);
  return [];
}

function normalizeShapeComposition(data: RecordValue): RecordValue {
  const elements = Array.isArray(data.elements) ? data.elements : [];
  const ids = new Set<string>();
  const normalized = elements.filter(isRecord).map((item, index) => {
    let id = textValue(item.id, `element-${index + 1}`).trim() || `element-${index + 1}`;
    while (ids.has(id)) id = `${id}-${index + 1}`;
    ids.add(id);
    const type = textValue(item.type, 'rounded-rectangle');
    const linear = ['line', 'connector', 'arrow'].includes(type);
    const x = Math.min(1, safeNumber(item.x, 0.05));
    const y = Math.min(1, safeNumber(item.y, 0.05));
    const w = linear ? safeNumber(item.w, 0.1) : Math.min(1 - x, Math.max(0.001, safeNumber(item.w, 0.25, 0.001)));
    const h = linear ? safeNumber(item.h, 0) : Math.min(1 - y, Math.max(0.001, safeNumber(item.h, 0.12, 0.001)));
    const knownTypes = ['rectangle','rounded-rectangle','pill','circle','ellipse','ring','triangle','diamond','line','connector','arrow','polygon','text','bracket','arc'];
    const content = isRecord(item.content) ? item.content : {};
    const style = isRecord(item.style) ? item.style : {};
    const normalizedContent: RecordValue = { ...content };
    for (const key of ['text', 'value', 'side']) {
      if (key in normalizedContent && normalizedContent[key] != null && typeof normalizedContent[key] !== 'string') {
        normalizedContent[key] = textValue(normalizedContent[key]);
      }
    }
    if (!knownTypes.includes(type)) {
      normalizedContent.text = textValue(content.text ?? content.value ?? item.label ?? item.name, type);
      return { ...item, id, type: 'rounded-rectangle', x, y, w, h, style, content: normalizedContent };
    }
    const points = Array.isArray(item.points) ? item.points.filter(isRecord).map((point) => ({
      x: Math.max(0, Math.min(1, safeNumber(point.x, 0.5))),
      y: Math.max(0, Math.min(1, safeNumber(point.y, 0.5))),
    })) : undefined;
    const fixedType = type === 'polygon' && (!points || points.length < 3) ? 'diamond' : type;
    return {
      ...item, id, type: fixedType, x, y, w, h, style, content: normalizedContent,
      ...(points ? { points } : {}),
      ...(typeof item.zIndex === 'number' && Number.isFinite(item.zIndex) ? {} : { zIndex: index }),
      ...(typeof item.rotation === 'number' && Number.isFinite(item.rotation) ? {} : { rotation: 0 }),
    };
  });
  return { ...data, version: 1, elements: normalized };
}

function normalizeVisual(value: unknown): RecordValue {
  if (typeof value === 'string') return { type: 'custom', data: { value }, caption: null };
  if (!isRecord(value)) return { type: 'none', data: {}, caption: null };
  const type = textValue(value.type, 'custom').trim() || 'custom';
  const rawData = value.data;
  const data = isRecord(rawData) ? rawData : rawData == null ? {} : { value: rawData };
  const normalizedData = type === 'shape-composition' ? normalizeShapeComposition(data) : data;
  return {
    ...value,
    type,
    data: normalizedData,
    caption: value.caption == null || value.caption === '' ? null : textValue(value.caption),
  };
}

function normalizeSlide(value: unknown, index: number): RecordValue {
  const source = isRecord(value) ? value : { body: { lead: textValue(value) } };
  const bodySource = isRecord(source.body) ? source.body : {};
  const rawBullets = bodySource.bullets;
  const bullets = Array.isArray(rawBullets)
    ? rawBullets.map(richLine)
    : rawBullets == null || rawBullets === '' ? [] : [richLine(rawBullets)];
  const rawEmphasis = bodySource.emphasis;
  const emphasis = Array.isArray(rawEmphasis)
    ? rawEmphasis.map((item) => {
      const line = richLine(item);
      return isRecord(line) ? textValue(line.text) : textValue(line);
    }).filter(Boolean).join(' · ')
    : richLine(rawEmphasis);
  const cognitive = textValue(source.cognitiveLoad, 'medium').toLowerCase();
  const cognitiveLoad = ['low', 'medium', 'high'].includes(cognitive) ? cognitive : 'medium';
  const durationSeconds = safeNumber(source.durationSeconds, 45, 0.001);
  const layout = textValue(source.layout, index === 0 ? 'title' : 'content') || 'content';
  return {
    ...source,
    id: textValue(source.id, `slide-${String(index + 1).padStart(2, '0')}`) || `slide-${String(index + 1).padStart(2, '0')}`,
    order: Number.isInteger(source.order) && Number(source.order) >= 1 ? Number(source.order) : index + 1,
    section: textValue(source.section, 'محتوا') || 'محتوا',
    layout,
    title: textValue(source.title ?? source.heading, `اسلاید ${index + 1}`) || `اسلاید ${index + 1}`,
    subtitle: source.subtitle == null || source.subtitle === '' ? null : textValue(source.subtitle),
    body: {
      ...bodySource,
      lead: richLine(bodySource.lead ?? source.content ?? source.text),
      bullets,
      emphasis,
    },
    visual: normalizeVisual(source.visual),
    speakerNotes: textValue(source.speakerNotes ?? source.notes),
    durationSeconds,
    psychologicalPurpose: textValue(source.psychologicalPurpose ?? source.purpose, 'ارائه و توضیح مفهوم'),
    cognitiveLoad,
    sourceReference: textValue(source.sourceReference ?? source.source),
  };
}

function normalizeChecklist(value: unknown): RecordValue[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    if (typeof entry === 'string' || typeof entry === 'number') return { item: String(entry), slideIds: [] };
    if (!isRecord(entry)) return { item: textValue(entry), slideIds: [] };
    return {
      ...entry,
      item: textValue(entry.item ?? entry.title ?? entry.label ?? entry.section, 'موضوع'),
      slideIds: slideIdsFor(entry.slideIds ?? entry.slides),
    };
  });
}

function normalizeRoadmap(value: unknown): RecordValue[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    if (typeof entry === 'string' || typeof entry === 'number') {
      return { section: String(entry), slideIds: [], purpose: 'راهنمای مسیر ارائه' };
    }
    if (!isRecord(entry)) return { section: textValue(entry, 'بخش'), slideIds: [], purpose: 'راهنمای مسیر ارائه' };
    return {
      ...entry,
      section: textValue(entry.section ?? entry.title ?? entry.name, 'بخش'),
      slideIds: Array.isArray(entry.slideIds) ? entry.slideIds.map((id) => textValue(id)).filter(Boolean) : [],
      purpose: textValue(entry.purpose ?? entry.description ?? entry.goal, 'راهنمای مسیر ارائه'),
    };
  });
}

/**
 * Accept canonical-ish JSON/YAML and shorthand content while preserving custom
 * fields for downstream rendering. Native web-ppt documents are left untouched.
 */
export function normalizeFlexiblePresentation(value: unknown): unknown {
  if (!isRecord(value) || !Array.isArray(value.slides)) return value;
  if ((value.source === 'ppt' || value.source === 'pptx') && 'width' in value && 'height' in value) return value;
  const rawSlides = value.slides.map((slide, index) => normalizeSlide(slide, index));
  const ids = new Set<string>();
  rawSlides.forEach((slide, index) => {
    let id = textValue(slide.id, `slide-${index + 1}`);
    while (ids.has(id)) id = `${id}-${index + 1}`;
    ids.add(id);
    slide.id = id;
  });
  const rawMeta = isRecord(value.presentation) ? value.presentation : {};
  const total = rawSlides.reduce((sum, slide) => sum + safeNumber(slide.durationSeconds, 45, 0.001), 0);
  const metadata: RecordValue = {
    ...rawMeta,
    title: textValue(rawMeta.title ?? value.title, 'ارائه') || 'ارائه',
    subtitle: rawMeta.subtitle == null || rawMeta.subtitle === '' ? null : textValue(rawMeta.subtitle),
    language: textValue(rawMeta.language, 'fa'),
    theme: textValue(rawMeta.theme, 'modern'),
    targetAudience: textValue(rawMeta.targetAudience, 'مخاطبان عمومی'),
    estimatedTotalDurationSeconds: safeNumber(rawMeta.estimatedTotalDurationSeconds, Math.max(1, total), 1),
    learningObjectives: Array.isArray(rawMeta.learningObjectives) ? rawMeta.learningObjectives.map((item) => textValue(item)) : [],
    coverageChecklist: normalizeChecklist(rawMeta.coverageChecklist),
    teachingRoadmap: normalizeRoadmap(rawMeta.teachingRoadmap),
  };
  const slideIds = new Set(rawSlides.map((slide) => textValue(slide.id)));
  metadata.coverageChecklist = (metadata.coverageChecklist as RecordValue[]).map((item) => ({
    ...item,
    slideIds: (item.slideIds as string[]).filter((id) => slideIds.has(id)),
  }));
  metadata.teachingRoadmap = (metadata.teachingRoadmap as RecordValue[]).map((item) => ({
    ...item,
    slideIds: (item.slideIds as string[]).filter((id) => slideIds.has(id)),
  }));
  const recap = Array.isArray(value.recapSlides) ? value.recapSlides : [];
  const recapSlides = recap.map((entry) => {
    if (!isRecord(entry)) return { afterSlideId: textValue(rawSlides[0]?.id), type: 'retrieval', prompt: textValue(entry) };
    const requestedId = textValue(entry.afterSlideId);
    return {
      ...entry,
      afterSlideId: slideIds.has(requestedId) ? requestedId : textValue(rawSlides[0]?.id),
      type: entry.type === 'spaced-repetition' ? 'spaced-repetition' : 'retrieval',
      prompt: textValue(entry.prompt ?? entry.question ?? entry.text, 'نکتهٔ اصلی این بخش چه بود؟'),
    };
  });
  return { ...value, presentation: metadata, slides: rawSlides, recapSlides };
}
