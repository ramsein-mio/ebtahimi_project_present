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
    const rawStyle = isRecord(item.style) ? item.style : {};
    const style: RecordValue = { ...rawStyle };
    for (const key of ['fill', 'stroke', 'color']) {
      const rawColor = style[key];
      if (rawColor == null || typeof rawColor === 'string') continue;
      if (isRecord(rawColor) && typeof rawColor.color === 'string') style[key] = rawColor.color;
      else if (isRecord(rawColor) && Array.isArray(rawColor.stops)) {
        const firstStop = rawColor.stops.find(isRecord);
        style[key] = firstStop ? textValue(firstStop.color ?? firstStop.value, key === 'fill' ? '#e5e7eb' : '#374151') : (key === 'fill' ? '#e5e7eb' : '#374151');
      } else style[key] = key === 'fill' ? '#e5e7eb' : key === 'stroke' ? '#374151' : '#111827';
    }
    for (const key of ['strokeWidth', 'fontSize', 'radius', 'fontScale']) {
      if (key in style && !(typeof style[key] === 'number' && Number.isFinite(style[key]) && Number(style[key]) > 0)) {
        const parsed = typeof style[key] === 'string' ? Number(style[key]) : NaN;
        if (Number.isFinite(parsed) && parsed > 0) style[key] = parsed;
        else delete style[key];
      }
    }
    if ('opacity' in style) {
      const opacity = typeof style.opacity === 'number' ? style.opacity : Number(style.opacity);
      style.opacity = Number.isFinite(opacity) ? Math.max(0, Math.min(1, opacity)) : 1;
    }
    if ('fontWeight' in style) {
      const weight = style.fontWeight;
      const numeric = typeof weight === 'string' ? Number(weight) : weight;
      style.fontWeight = weight === 'bold' || weight === 'normal' ? weight
        : typeof numeric === 'number' && Number.isInteger(numeric) && numeric >= 100 && numeric <= 900 && numeric % 100 === 0 ? numeric : 'normal';
    }
    if ('textAlign' in style && !['left', 'center', 'right'].includes(String(style.textAlign))) style.textAlign = 'right';
    if ('verticalAlign' in style && !['top', 'middle', 'bottom'].includes(String(style.verticalAlign))) style.verticalAlign = 'middle';
    for (const key of ['lineDash', 'dash']) {
      if (key in style && (!Array.isArray(style[key]) || style[key].some((n) => typeof n !== 'number' || !Number.isFinite(n) || n <= 0))) {
        style[key] = Array.isArray(style[key]) ? style[key].filter((n) => typeof n === 'number' && Number.isFinite(n) && n > 0) : [];
      }
    }
    if ('endArrow' in style && typeof style.endArrow !== 'boolean') style.endArrow = Boolean(style.endArrow);
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
  return { ...data, ...(data.canvas != null ? { canvas: normalizeCanvas(data.canvas) } : {}), version: 1, elements: normalized };
}

function normalizeTheme(value: unknown): unknown {
  if (typeof value === 'string') return { themeName: value };
  if (!isRecord(value)) return value == null ? value : {};
  const theme: RecordValue = { ...value };
  for (const key of ['background','foreground','text','muted','surface','soft','border','soft2','highlight','primary','secondary','accent']) {
    if (key in theme && typeof theme[key] !== 'string') {
      const raw = theme[key];
      theme[key] = isRecord(raw) && typeof raw.color === 'string' ? raw.color : '#64748b';
    }
  }
  if ('palette' in theme && (!Array.isArray(theme.palette) || theme.palette.some((color) => typeof color !== 'string'))) {
    theme.palette = Array.isArray(theme.palette) ? theme.palette.map((color) => textValue(color, '#64748b')) : [];
  }
  if ('semanticColors' in theme && isRecord(theme.semanticColors)) {
    theme.semanticColors = Object.fromEntries(Object.entries(theme.semanticColors).map(([key, color]) => [
      key, typeof color === 'string' ? color : isRecord(color) && typeof color.color === 'string' ? color.color : '#64748b',
    ]));
  }
  if ('fontFamily' in theme && !(typeof theme.fontFamily === 'string' || Array.isArray(theme.fontFamily) && theme.fontFamily.every((font) => typeof font === 'string'))) {
    theme.fontFamily = Array.isArray(theme.fontFamily) ? theme.fontFamily.map((font) => textValue(font)).filter(Boolean) : 'Vazirmatn';
  }
  return theme;
}

function normalizeCanvas(value: unknown): unknown {
  if (!isRecord(value)) return value == null ? value : {};
  const canvas: RecordValue = { ...value };
  for (const key of ['width', 'height']) {
    if (key in canvas) {
      const n = typeof canvas[key] === 'number' ? canvas[key] : Number(canvas[key]);
      if (Number.isFinite(n) && n > 0) canvas[key] = n;
      else delete canvas[key];
    }
  }
  if ('aspectRatio' in canvas && (typeof canvas.aspectRatio !== 'string' || !/^\d+(?:\.\d+)?\s*:\s*\d+(?:\.\d+)?$/.test(canvas.aspectRatio))) delete canvas.aspectRatio;
  if ('background' in canvas && typeof canvas.background !== 'string') canvas.background = '#ffffff';
  if ('fullscreen' in canvas && typeof canvas.fullscreen !== 'boolean') canvas.fullscreen = Boolean(canvas.fullscreen);
  return canvas;
}

function normalizeVisual(value: unknown): RecordValue {
  if (typeof value === 'string') return { type: 'custom', data: { value }, caption: null };
  if (value == null) return { type: 'none', data: {}, caption: null };
  if (!isRecord(value)) return { type: 'custom', data: { value }, caption: null };
  const type = textValue(value.type, 'custom').trim() || 'custom';
  const rawData = value.data;
  const data = type === 'shape-composition' && Array.isArray(rawData)
    ? { elements: rawData }
    : isRecord(rawData) ? rawData : rawData == null ? {} : { value: rawData };
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
  const bodySource = isRecord(source.body) ? source.body : source.body == null ? {} : { lead: textValue(source.body) };
  const rawBullets = bodySource.bullets;
  const bullets = Array.isArray(rawBullets)
    ? rawBullets.map(richLine)
    : rawBullets == null || rawBullets === '' ? [] : [richLine(rawBullets)];
  const extraBodyBullets = Object.entries(bodySource)
    .filter(([key, item]) => !['lead', 'bullets', 'emphasis'].includes(key) && item != null)
    .map(([key, item]) => ({ text: key, details: textValue(item) }))
    .filter((item) => item.details.trim().length > 0);
  bullets.push(...extraBodyBullets);
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
  const knownSlideKeys = new Set([
    'id','order','section','layout','layoutConfig','background','theme','canvas','title','heading','subtitle',
    'body','visual','speakerNotes','notes','durationSeconds','psychologicalPurpose','purpose','cognitiveLoad',
    'sourceReference','source','data','content','text','description','summary',
  ]);
  const looseFields = Object.fromEntries(Object.entries(source).filter(([key, item]) => !knownSlideKeys.has(key) && item != null));
  const fallbackContent = source.data ?? (Object.keys(looseFields).length ? looseFields : '');
  return {
    ...source,
    id: textValue(source.id, `slide-${String(index + 1).padStart(2, '0')}`) || `slide-${String(index + 1).padStart(2, '0')}`,
    order: Number.isInteger(source.order) && Number(source.order) >= 1 ? Number(source.order) : index + 1,
    section: textValue(source.section, 'محتوا') || 'محتوا',
    layout,
    title: textValue(source.title ?? source.heading, `اسلاید ${index + 1}`) || `اسلاید ${index + 1}`,
    subtitle: source.subtitle == null || source.subtitle === '' ? null : textValue(source.subtitle),
    ...(source.background != null ? { background: typeof source.background === 'string' ? source.background : isRecord(source.background) && typeof source.background.color === 'string' ? source.background : { color: '#ffffff' } } : {}),
    ...(source.layoutConfig != null ? { layoutConfig: isRecord(source.layoutConfig) ? source.layoutConfig : { value: source.layoutConfig } } : {}),
    body: {
        ...bodySource,
      lead: richLine(bodySource.lead ?? source.content ?? source.text ?? source.description ?? source.summary ?? (fallbackContent !== '' ? textValue(fallbackContent) : '')),
      bullets,
      emphasis,
    },
    visual: normalizeVisual(source.visual),
    ...(source.theme != null ? { theme: normalizeTheme(source.theme) } : {}),
    ...(source.canvas != null ? { canvas: normalizeCanvas(source.canvas) } : {}),
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
  if (isRecord(value) && (value.source === 'ppt' || value.source === 'pptx')
      && 'width' in value && 'height' in value && Array.isArray(value.slides)
      && value.slides.some((slide) => isRecord(slide) && Array.isArray(slide.elements))) return value;

  // Accept any valid JSON/YAML root. If it is not already a deck, wrap it into
  // one slide (or one slide per array item) so information remains viewable.
  if (!isRecord(value)) {
    const entries = Array.isArray(value) ? value : [value];
    return normalizeFlexiblePresentation({
      presentation: { title: Array.isArray(value) ? 'داده‌های ورودی' : 'محتوای ورودی', language: 'fa', theme: 'modern' },
      slides: entries.map((entry, index) => isRecord(entry)
        && ('title' in entry || 'heading' in entry || 'body' in entry || 'content' in entry || 'visual' in entry)
        ? entry
        : { title: `مورد ${index + 1}`, body: { lead: textValue(entry) } }),
      recapSlides: [],
    });
  }
  if (!Array.isArray(value.slides)) {
    const rawMeta = isRecord(value.presentation) ? value.presentation : {};
    const items = Array.isArray(value.items) ? value.items
      : Array.isArray(value.sections) ? value.sections
      : Array.isArray(value.data) ? value.data
      : [value];
    const slides = items.map((entry, index) => {
      if (isRecord(entry) && ('title' in entry || 'heading' in entry || 'body' in entry || 'content' in entry || 'visual' in entry)) return entry;
      return { title: `مورد ${index + 1}`, body: { lead: textValue(entry) } };
    });
    value = {
      ...value,
      presentation: {
        ...rawMeta,
        title: rawMeta.title ?? value.title ?? 'محتوای ورودی',
        language: rawMeta.language ?? value.language ?? 'fa',
        theme: rawMeta.theme ?? value.theme ?? 'modern',
      },
      slides,
      recapSlides: Array.isArray(value.recapSlides) ? value.recapSlides : [],
    };
  }
  const root = value as RecordValue & { slides: unknown[] };
  const rawSlides = root.slides.map((slide, index) => normalizeSlide(slide, index));
  const rawMeta = isRecord(root.presentation) ? root.presentation : {};
  const ids = new Set<string>();
  rawSlides.forEach((slide, index) => {
    let id = textValue(slide.id, `slide-${index + 1}`);
    while (ids.has(id)) id = `${id}-${index + 1}`;
    ids.add(id);
    slide.id = id;
  });
  const total = rawSlides.reduce((sum, slide) => sum + safeNumber(slide.durationSeconds, 45, 0.001), 0);
  const metadata: RecordValue = {
    ...rawMeta,
    ...(rawMeta.design != null ? { design: normalizeTheme(rawMeta.design) } : isRecord(rawMeta.theme) ? { design: normalizeTheme(rawMeta.theme) } : {}),
    ...(rawMeta.canvas != null ? { canvas: normalizeCanvas(rawMeta.canvas) } : {}),
    ...(rawMeta.background != null && typeof rawMeta.background !== 'string' ? { background: isRecord(rawMeta.background) && typeof rawMeta.background.color === 'string' ? rawMeta.background.color : '#ffffff' } : {}),
    ...(rawMeta.direction != null && !['ltr','rtl','auto'].includes(String(rawMeta.direction)) ? { direction: 'auto' } : {}),
    ...(rawMeta.fontScale != null && !(typeof rawMeta.fontScale === 'number' && Number.isFinite(rawMeta.fontScale) && rawMeta.fontScale > 0) ? { fontScale: 1 } : {}),
    ...(rawMeta.spacingScale != null && !(typeof rawMeta.spacingScale === 'number' && Number.isFinite(rawMeta.spacingScale) && rawMeta.spacingScale > 0) ? { spacingScale: 1 } : {}),
    ...(rawMeta.radiusScale != null && !(typeof rawMeta.radiusScale === 'number' && Number.isFinite(rawMeta.radiusScale) && rawMeta.radiusScale > 0) ? { radiusScale: 1 } : {}),
    ...(rawMeta.shadowStyle != null && !['none','soft','medium','strong'].includes(String(rawMeta.shadowStyle)) ? { shadowStyle: 'soft' } : {}),
    ...(rawMeta.contrast != null && !['normal','high'].includes(String(rawMeta.contrast)) ? { contrast: 'normal' } : {}),
    ...(rawMeta.palette != null && (!Array.isArray(rawMeta.palette) || (rawMeta.palette as unknown[]).some((color: unknown) => typeof color !== 'string')) ? { palette: Array.isArray(rawMeta.palette) ? (rawMeta.palette as unknown[]).map((color: unknown) => textValue(color, '#64748b')) : [] } : {}),
    ...(rawMeta.semanticColors != null && !isRecord(rawMeta.semanticColors) ? { semanticColors: {} } : {}),
    ...(rawMeta.semanticColors != null && isRecord(rawMeta.semanticColors) ? { semanticColors: Object.fromEntries(Object.entries(rawMeta.semanticColors).map(([key, color]) => [key, typeof color === 'string' ? color : isRecord(color) && typeof color.color === 'string' ? color.color : '#64748b'])) } : {}),
    ...(rawMeta.layoutDefaults != null && !isRecord(rawMeta.layoutDefaults) ? { layoutDefaults: {} } : {}),
    ...(rawMeta.assets != null && !Array.isArray(rawMeta.assets) ? { assets: [] } : {}),
    title: textValue(rawMeta.title ?? root.title, 'ارائه') || 'ارائه',
    subtitle: rawMeta.subtitle == null || rawMeta.subtitle === '' ? null : textValue(rawMeta.subtitle),
    language: textValue(rawMeta.language, 'fa'),
    theme: textValue(isRecord(rawMeta.theme) ? rawMeta.theme.name ?? rawMeta.theme.id : rawMeta.theme, 'modern'),
    targetAudience: textValue(rawMeta.targetAudience, 'مخاطبان عمومی'),
    estimatedTotalDurationSeconds: safeNumber(rawMeta.estimatedTotalDurationSeconds, Math.max(1, total), 1),
    learningObjectives: Array.isArray(rawMeta.learningObjectives) ? (rawMeta.learningObjectives as unknown[]).map((item: unknown) => textValue(item)) : [],
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
  const recap: unknown[] = Array.isArray(root.recapSlides) ? root.recapSlides as unknown[] : [];
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
  return { ...root, presentation: metadata, slides: rawSlides, recapSlides };
}
