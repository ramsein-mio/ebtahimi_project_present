import { SUPPORTED_COMPOSITION_SHAPE_TYPES } from './shape-composition-contract';

export type CognitiveLoad = 'low' | 'medium' | 'high';
export type RichTextLine = string | { text: string; details: string };
export interface CoverageChecklistItem { item: string; slideIds: string[] }
export interface TeachingRoadmapItem { section: string; slideIds: string[]; purpose: string }
export interface RenderTheme {
  background?: string; foreground?: string; muted?: string; surface?: string;
  border?: string; highlight?: string; palette?: string[];
  fontFamily?: string | string[];
  fontSize?: number;
  fontScale?: number;
  radiusScale?: number;
  shadowStyle?: 'none' | 'soft' | 'medium' | 'strong';
  direction?: 'ltr' | 'rtl' | 'auto';
  contrast?: 'normal' | 'high';
  semanticColors?: Record<string, string>;
  [key: string]: unknown;
}
export interface RenderCanvas {
  width?: number; height?: number; aspectRatio?: string; background?: string;
  fullscreen?: boolean; mode?: string;
  safeArea?: { top?: number; right?: number; bottom?: number; left?: number };
  [key: string]: unknown;
}
export interface CanonicalSlide {
  id: string; order: number; section: string; layout: string; title: string;
  subtitle: string | null;
  body: { lead: RichTextLine; bullets: RichTextLine[]; emphasis: RichTextLine };
  visual: { type: string; data: Record<string, unknown>; caption: string | null };
  background?: string | { color?: string };
  theme?: RenderTheme | null;
  layoutConfig?: Record<string, unknown> | null;
  speakerNotes: string; durationSeconds: number; psychologicalPurpose: string;
  cognitiveLoad: CognitiveLoad; sourceReference: string;
}
export interface CanonicalPresentation {
  presentation: {
    title: string; subtitle: string | null; language: string; theme: string;
    design?: RenderTheme; canvas?: RenderCanvas; background?: string;
    targetAudience: string; estimatedTotalDurationSeconds: number;
    learningObjectives: string[]; coverageChecklist: CoverageChecklistItem[];
    teachingRoadmap: TeachingRoadmapItem[];
    direction?: 'ltr' | 'rtl' | 'auto' | null;
    locale?: string | null;
    fontScale?: number | null;
    spacingScale?: number | null;
    radiusScale?: number | null;
    shadowStyle?: 'none' | 'soft' | 'medium' | 'strong' | null;
    contrast?: 'normal' | 'high' | null;
    palette?: string[] | null;
    semanticColors?: Record<string, string> | null;
    assets?: unknown[] | null;
    layoutDefaults?: Record<string, unknown> | null;
  };
  slides: CanonicalSlide[];
  recapSlides: { afterSlideId: string; type: 'retrieval' | 'spaced-repetition'; prompt: string }[];
}
export interface ValidationIssue {
  path: string; message: string; expected?: string; actual?: string;
  severity: 'error' | 'warning';
}
export interface CanonicalValidationResult {
  valid: boolean; value: CanonicalPresentation | null; errors: ValidationIssue[];
  warnings: ValidationIssue[];
}
const ROOT_KEYS = ['presentation', 'slides', 'recapSlides'];
const SLIDE_KEYS = ['id','order','section','layout','title','subtitle','body','visual','background','theme','layoutConfig','speakerNotes','durationSeconds','psychologicalPurpose','cognitiveLoad','sourceReference'];
const BODY_KEYS = ['lead','bullets','emphasis'];
const VISUAL_KEYS = ['type','data','caption'];
const META_KEYS = ['title','subtitle','language','theme','design','canvas','background','targetAudience','estimatedTotalDurationSeconds','learningObjectives','coverageChecklist','teachingRoadmap','direction','locale','fontScale','spacingScale','radiusScale','shadowStyle','contrast','palette','semanticColors','assets','layoutDefaults'];
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const actualType = (v: unknown): string => v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
function exactKeys(value: Record<string, unknown>, expected: string[], path: string, errors: ValidationIssue[], optional: string[] = []) {
  for (const key of expected) if (!optional.includes(key) && !(key in value)) errors.push({ path: path ? path + '.' + key : key, message: 'Required field is missing.', expected: 'present', actual: 'missing', severity: 'error' });
  for (const key of Object.keys(value)) if (!expected.includes(key)) errors.push({ path: path ? path + '.' + key : key, message: 'Unexpected field in canonical object.', expected: 'one of the canonical fields', actual: 'unexpected key', severity: 'error' });
}
function validateRenderTheme(value: unknown, path: string, errors: ValidationIssue[]) {
  if (!isRecord(value)) { errors.push({ path, message: 'Theme must be an object.', expected: 'theme object', actual: actualType(value), severity: 'error' }); return; }
  const colorKeys = ['background','foreground','muted','surface','border','highlight'];
  for (const key of colorKeys) if (key in value && typeof value[key] !== 'string') errors.push({ path: path + '.' + key, message: 'Theme color must be a string.', expected: 'CSS color string', actual: actualType(value[key]), severity: 'error' });
  if ('palette' in value && (!Array.isArray(value.palette) || value.palette.some((color) => typeof color !== 'string'))) errors.push({ path: path + '.palette', message: 'Palette must be an array of color strings.', expected: 'string[]', actual: actualType(value.palette), severity: 'error' });
  if ('fontFamily' in value && !(typeof value.fontFamily === 'string' || Array.isArray(value.fontFamily) && value.fontFamily.every((font) => typeof font === 'string'))) errors.push({ path: path + '.fontFamily', message: 'Font family must be a string or string array.', expected: 'string | string[]', actual: actualType(value.fontFamily), severity: 'error' });
}
function validateRenderCanvas(value: unknown, path: string, errors: ValidationIssue[]) {
  if (!isRecord(value)) { errors.push({ path, message: 'Canvas must be an object.', expected: 'canvas object', actual: actualType(value), severity: 'error' }); return; }
  for (const key of ['width','height']) if (key in value && (typeof value[key] !== 'number' || !Number.isFinite(value[key]) || Number(value[key]) <= 0)) errors.push({ path: path + '.' + key, message: 'Canvas dimension must be positive.', expected: 'number > 0', actual: actualType(value[key]), severity: 'error' });
  if ('aspectRatio' in value && (typeof value.aspectRatio !== 'string' || !/^\d+(?:\.\d+)?\s*:\s*\d+(?:\.\d+)?$/.test(value.aspectRatio))) errors.push({ path: path + '.aspectRatio', message: 'Aspect ratio must use W:H notation.', expected: 'e.g. 16:9', actual: actualType(value.aspectRatio), severity: 'error' });
  if ('background' in value && typeof value.background !== 'string') errors.push({ path: path + '.background', message: 'Canvas background must be a color string.', expected: 'CSS color string', actual: actualType(value.background), severity: 'error' });
  if ('fullscreen' in value && typeof value.fullscreen !== 'boolean') errors.push({ path: path + '.fullscreen', message: 'fullscreen must be boolean.', expected: 'boolean', actual: actualType(value.fullscreen), severity: 'error' });
}
function expectString(v: unknown, path: string, errors: ValidationIssue[], nonEmpty = false): v is string {
  if (typeof v !== 'string' || (nonEmpty && !v.trim())) {
    errors.push({ path, message: nonEmpty ? 'Expected a non-empty string.' : 'Expected a string.', expected: nonEmpty ? 'non-empty string' : 'string', actual: actualType(v), severity: 'error' }); return false;
  }
  return true;
}
function expectNullableString(v: unknown, path: string, errors: ValidationIssue[]) {
  if (v !== null) expectString(v, path, errors);
}
function validateRichLine(v: unknown, path: string, errors: ValidationIssue[]) {
  if (typeof v === 'string') return;
  if (!isRecord(v)) {
    errors.push({ path, message: 'Rich-text line must be a string or a text/details object.', expected: 'string | { text: string; details: non-empty string }', actual: actualType(v), severity: 'error' }); return;
  }
  exactKeys(v, ['text','details'], path, errors);
  expectString(v.text, path + '.text', errors);
  expectString(v.details, path + '.details', errors, true);
}
function validateStringArray(v: unknown, path: string, errors: ValidationIssue[]) {
  if (!Array.isArray(v)) { errors.push({ path, message: 'Expected an array of strings.', expected: 'string[]', actual: actualType(v), severity: 'error' }); return; }
  v.forEach((item, i) => expectString(item, path + '[' + i + ']', errors));
}
function validateReferenceItems(v: unknown, path: string, errors: ValidationIssue[], kind: 'coverage' | 'roadmap') {
  if (!Array.isArray(v)) { errors.push({ path, message: 'Expected an array.', expected: 'array', actual: actualType(v), severity: 'error' }); return; }
  v.forEach((entry, i) => {
    const p = path + '[' + i + ']';
    if (!isRecord(entry)) { errors.push({ path: p, message: 'Expected an object.', expected: 'object', actual: actualType(entry), severity: 'error' }); return; }
    const keys = kind === 'coverage' ? ['item','slideIds'] : ['section','slideIds','purpose'];
    exactKeys(entry, keys, p, errors);
    expectString(entry[kind === 'coverage' ? 'item' : 'section'], p + (kind === 'coverage' ? '.item' : '.section'), errors, true);
    validateStringArray(entry.slideIds, p + '.slideIds', errors);
    if (kind === 'roadmap') expectString(entry.purpose, p + '.purpose', errors, true);
  });
}
export function validateCanonicalPresentation(value: unknown): CanonicalValidationResult {
  const errors: ValidationIssue[] = [], warnings: ValidationIssue[] = [];
  if (!isRecord(value)) {
    errors.push({ path: '$', message: 'Canonical JSON root must be an object.', expected: 'object', actual: actualType(value), severity: 'error' });
    return { valid: false, value: null, errors, warnings };
  }
  exactKeys(value, ROOT_KEYS, '', errors);
  const meta = value.presentation;
  if (!isRecord(meta)) errors.push({ path: 'presentation', message: 'Expected presentation metadata object.', expected: 'object', actual: actualType(meta), severity: 'error' });
  else {
    exactKeys(meta, META_KEYS, 'presentation', errors, ['subtitle','design','canvas','background','direction','locale','fontScale','spacingScale','radiusScale','shadowStyle','contrast','palette','semanticColors','assets','layoutDefaults']);
    for (const key of ['title','language','theme','targetAudience']) expectString(meta[key], 'presentation.' + key, errors, true);
    if ('design' in meta && meta.design != null) validateRenderTheme(meta.design, 'presentation.design', errors);
    if ('canvas' in meta && meta.canvas != null) validateRenderCanvas(meta.canvas, 'presentation.canvas', errors);
    for (const key of ['direction']) if (key in meta && meta[key] != null && !['ltr','rtl','auto'].includes(String(meta[key]))) errors.push({ path: 'presentation.' + key, message: 'Unsupported text direction.', expected: 'ltr | rtl | auto', actual: String(meta[key]), severity: 'error' });
    for (const key of ['fontScale','spacingScale','radiusScale']) if (key in meta && meta[key] != null && (typeof meta[key] !== 'number' || !Number.isFinite(meta[key]) || Number(meta[key]) <= 0)) errors.push({ path: 'presentation.' + key, message: 'Scale must be a positive finite number.', expected: 'number > 0', actual: actualType(meta[key]), severity: 'error' });
    if ('palette' in meta && meta.palette != null && (!Array.isArray(meta.palette) || meta.palette.some((c) => typeof c !== 'string'))) errors.push({ path: 'presentation.palette', message: 'Palette must be an array of strings.', expected: 'string[]', actual: actualType(meta.palette), severity: 'error' });
    if ('semanticColors' in meta && meta.semanticColors != null && !isRecord(meta.semanticColors)) errors.push({ path: 'presentation.semanticColors', message: 'semanticColors must be an object.', expected: 'record of color strings', actual: actualType(meta.semanticColors), severity: 'error' });
    if ('layoutDefaults' in meta && meta.layoutDefaults != null && !isRecord(meta.layoutDefaults)) errors.push({ path: 'presentation.layoutDefaults', message: 'layoutDefaults must be an object.', expected: 'object', actual: actualType(meta.layoutDefaults), severity: 'error' });
    if ('background' in meta && meta.background != null && typeof meta.background !== 'string') errors.push({ path: 'presentation.background', message: 'Background must be a color string.', expected: 'CSS color string', actual: actualType(meta.background), severity: 'error' });
    expectNullableString(meta.subtitle, 'presentation.subtitle', errors);
    if (typeof meta.estimatedTotalDurationSeconds !== 'number' || !Number.isFinite(meta.estimatedTotalDurationSeconds) || meta.estimatedTotalDurationSeconds <= 0)
      errors.push({ path: 'presentation.estimatedTotalDurationSeconds', message: 'Duration must be a positive finite number.', expected: 'number > 0', actual: actualType(meta.estimatedTotalDurationSeconds), severity: 'error' });
    validateStringArray(meta.learningObjectives, 'presentation.learningObjectives', errors);
    validateReferenceItems(meta.coverageChecklist, 'presentation.coverageChecklist', errors, 'coverage');
    validateReferenceItems(meta.teachingRoadmap, 'presentation.teachingRoadmap', errors, 'roadmap');
  }
  if (!Array.isArray(value.slides)) errors.push({ path: 'slides', message: 'Slides must be an array.', expected: 'array', actual: actualType(value.slides), severity: 'error' });
  const ids = new Set<string>();
  const slides = Array.isArray(value.slides) ? value.slides : [];
  slides.forEach((slide, i) => {
    const p = 'slides[' + i + ']';
    if (!isRecord(slide)) { errors.push({ path: p, message: 'Slide must be an object.', expected: 'object', actual: actualType(slide), severity: 'error' }); return; }
    exactKeys(slide, SLIDE_KEYS, p, errors, ['background','theme']);
    if ('theme' in slide && slide.theme != null) validateRenderTheme(slide.theme, p + '.theme', errors);
    if ('layoutConfig' in slide && slide.layoutConfig != null && !isRecord(slide.layoutConfig)) errors.push({ path: p + '.layoutConfig', message: 'layoutConfig must be an object or null.', expected: 'object | null', actual: actualType(slide.layoutConfig), severity: 'error' });
    if ('background' in slide && slide.background != null && !(typeof slide.background === 'string' || isRecord(slide.background) && (slide.background.color === undefined || typeof slide.background.color === 'string'))) errors.push({ path: p + '.background', message: 'Slide background must be a color string or color object.', expected: 'string | { color: string }', actual: actualType(slide.background), severity: 'error' });
    for (const key of ['id','section','layout','title','speakerNotes','psychologicalPurpose','sourceReference']) expectString(slide[key], p + '.' + key, errors, key === 'id' || key === 'title');
    expectNullableString(slide.subtitle, p + '.subtitle', errors);
    if (typeof slide.id === 'string') { if (ids.has(slide.id)) errors.push({ path: p + '.id', message: 'Slide IDs must be unique.', expected: 'unique ID', actual: slide.id, severity: 'error' }); ids.add(slide.id); }
    if (typeof slide.order !== 'number' || !Number.isInteger(slide.order) || slide.order < 1) errors.push({ path: p + '.order', message: 'Order must be a positive integer.', expected: 'integer >= 1', actual: actualType(slide.order), severity: 'error' });
    if (typeof slide.durationSeconds !== 'number' || !Number.isFinite(slide.durationSeconds) || slide.durationSeconds <= 0) errors.push({ path: p + '.durationSeconds', message: 'Slide duration must be positive.', expected: 'number > 0', actual: actualType(slide.durationSeconds), severity: 'error' });
    if (!['low','medium','high'].includes(String(slide.cognitiveLoad))) errors.push({ path: p + '.cognitiveLoad', message: 'Unknown cognitive load value.', expected: 'low | medium | high', actual: String(slide.cognitiveLoad), severity: 'error' });
    const body = slide.body;
    if (!isRecord(body)) errors.push({ path: p + '.body', message: 'Expected body object.', expected: 'object', actual: actualType(body), severity: 'error' });
    else {
      exactKeys(body, BODY_KEYS, p + '.body', errors);
      validateRichLine(body.lead, p + '.body.lead', errors);
      validateRichLine(body.emphasis, p + '.body.emphasis', errors);
      if (!Array.isArray(body.bullets)) errors.push({ path: p + '.body.bullets', message: 'Bullets must be an array.', expected: 'RichTextLine[]', actual: actualType(body.bullets), severity: 'error' });
      else body.bullets.forEach((line, j) => validateRichLine(line, p + '.body.bullets[' + j + ']', errors));
    }
    const visual = slide.visual;
    if (!isRecord(visual)) errors.push({ path: p + '.visual', message: 'Expected visual object.', expected: 'object', actual: actualType(visual), severity: 'error' });
    else {
      exactKeys(visual, VISUAL_KEYS, p + '.visual', errors);
      expectString(visual.type, p + '.visual.type', errors, true);
      const supportedVisuals = ['none','icon-list','bar-chart','line-chart','pie-chart','comparison-grid','table','shape-composition'];
      if (typeof visual.type === 'string' && !supportedVisuals.includes(visual.type)) warnings.push({
        path: p + '.visual.type',
        message: 'This visual type is not implemented by the current renderer; use a supported visual type or none.',
        expected: supportedVisuals.join(' | '),
        actual: visual.type,
        severity: 'warning',
      });
      if (!isRecord(visual.data)) errors.push({ path: p + '.visual.data', message: 'Visual data must be an object.', expected: 'object', actual: actualType(visual.data), severity: 'error' });
      expectNullableString(visual.caption, p + '.visual.caption', errors);
      if (visual.type === 'shape-composition' && isRecord(visual.data)) {
        if (visual.data.version !== 1) errors.push({ path: p + '.visual.data.version', message: 'Unsupported shape composition version.', expected: '1', actual: String(visual.data.version), severity: 'error' });
        if ('canvas' in visual.data && visual.data.canvas != null) {
          if (!isRecord(visual.data.canvas)) errors.push({ path: p + '.visual.data.canvas', message: 'Canvas must be an object.', expected: 'object', actual: actualType(visual.data.canvas), severity: 'error' });
          else validateRenderCanvas(visual.data.canvas, p + '.visual.data.canvas', errors);
        }
        if (!Array.isArray(visual.data.elements)) errors.push({ path: p + '.visual.data.elements', message: 'Shape elements must be an array.', expected: 'array', actual: actualType(visual.data.elements), severity: 'error' });
        else {
          const elementIds = new Set<string>();
          visual.data.elements.forEach((element, j) => {
            const ep = p + '.visual.data.elements[' + j + ']';
            if (!isRecord(element)) { errors.push({ path: ep, message: 'Shape element must be an object.', expected: 'object', actual: actualType(element), severity: 'error' }); return; }
            expectString(element.id, ep + '.id', errors, true);
            if (typeof element.id === 'string') { if (elementIds.has(element.id)) errors.push({ path: ep + '.id', message: 'Element IDs must be unique.', expected: 'unique ID', actual: element.id, severity: 'error' }); elementIds.add(element.id); }
            expectString(element.type, ep + '.type', errors, true);
            const supportedShapeTypes: readonly string[] = SUPPORTED_COMPOSITION_SHAPE_TYPES;
            if (typeof element.type === 'string' && !supportedShapeTypes.includes(element.type)) errors.push({ path: ep + '.type', message: 'Unsupported shape type for the current renderer.', expected: supportedShapeTypes.join(' | '), actual: element.type, severity: 'error' });
            const isLinearShape = ['line', 'connector', 'arrow'].includes(String(element.type));
            for (const key of ['x','y','w','h']) {
              const dimension = key === 'w' || key === 'h';
              const validDimension = dimension
                ? (isLinearShape ? typeof element[key] === 'number' : typeof element[key] === 'number' && Number(element[key]) > 0)
                : typeof element[key] === 'number' && Number(element[key]) >= 0 && Number(element[key]) <= 1;
              if (typeof element[key] !== 'number' || !Number.isFinite(element[key]) || !validDimension) {
                errors.push({ path: ep + '.' + key, message: 'Geometry must be finite and normalized.', expected: dimension ? (isLinearShape ? 'finite number; signed or zero dimensions allowed for line-like shapes' : 'number > 0') : 'number in [0, 1]', actual: actualType(element[key]), severity: 'error' });
              }
            }
            if ('zIndex' in element && (typeof element.zIndex !== 'number' || !Number.isFinite(element.zIndex))) errors.push({ path: ep + '.zIndex', message: 'zIndex must be a finite number.', expected: 'finite number', actual: actualType(element.zIndex), severity: 'error' });
            if ('rotation' in element && (typeof element.rotation !== 'number' || !Number.isFinite(element.rotation))) errors.push({ path: ep + '.rotation', message: 'rotation must be a finite number.', expected: 'finite number', actual: actualType(element.rotation), severity: 'error' });
            if ('style' in element && element.style != null && !isRecord(element.style)) errors.push({ path: ep + '.style', message: 'Shape style must be an object or null.', expected: 'object | null', actual: actualType(element.style), severity: 'error' });
            if ('content' in element && element.content != null && !isRecord(element.content)) errors.push({ path: ep + '.content', message: 'Shape content must be an object or null.', expected: 'object | null', actual: actualType(element.content), severity: 'error' });
            if (typeof element.x === 'number' && typeof element.w === 'number' && element.x + element.w > 1.000001) warnings.push({ path: ep, message: 'Element extends beyond the right canvas edge; renderer may clip it.', severity: 'warning' });
            if (typeof element.y === 'number' && typeof element.h === 'number' && element.y + element.h > 1.000001) warnings.push({ path: ep, message: 'Element extends beyond the bottom canvas edge; renderer may clip it.', severity: 'warning' });
            if (isRecord(element.style)) {
              const st = element.style;
              if ('opacity' in st && st.opacity != null && (typeof st.opacity !== 'number' || Number(st.opacity) < 0 || Number(st.opacity) > 1)) errors.push({ path: ep + '.style.opacity', message: 'Opacity must be between 0 and 1.', expected: 'number in [0,1]', actual: actualType(st.opacity), severity: 'error' });
              for (const key of ['fill','stroke','color','gradient','shadow','fontFamily','lineDash','verticalAlign','textAlign','lineHeight','fit','src','alt','mask','focalPoint']) if (key in st && st[key] != null && !['string','number','boolean','object'].includes(actualType(st[key]))) errors.push({ path: ep + '.style.' + key, message: 'Unsupported style value.', severity: 'error' });
            }
          });
        }
      }
    }
  });
  const slideIds = new Set(slides.filter(isRecord).map(s => s.id).filter((id): id is string => typeof id === 'string'));
  const checkRefs = (refs: unknown, path: string) => {
    if (!Array.isArray(refs)) return;
    refs.forEach((id, i) => { if (typeof id === 'string' && !slideIds.has(id)) errors.push({ path: path + '[' + i + ']', message: 'Referenced slide ID does not exist.', expected: 'existing slide ID', actual: id, severity: 'error' }); });
  };
  if (isRecord(meta)) {
    if (Array.isArray(meta.coverageChecklist)) meta.coverageChecklist.forEach((item, i) => { if (isRecord(item)) checkRefs(item.slideIds, 'presentation.coverageChecklist[' + i + '].slideIds'); });
    if (Array.isArray(meta.teachingRoadmap)) meta.teachingRoadmap.forEach((item, i) => { if (isRecord(item)) checkRefs(item.slideIds, 'presentation.teachingRoadmap[' + i + '].slideIds'); });
  }
  if (!Array.isArray(value.recapSlides)) errors.push({ path: 'recapSlides', message: 'recapSlides must be an array.', expected: 'array', actual: actualType(value.recapSlides), severity: 'error' });
  else value.recapSlides.forEach((item, i) => {
    const p = 'recapSlides[' + i + ']';
    if (!isRecord(item)) { errors.push({ path: p, message: 'Recap item must be an object.', expected: 'object', actual: actualType(item), severity: 'error' }); return; }
    exactKeys(item, ['afterSlideId','type','prompt'], p, errors);
    expectString(item.afterSlideId, p + '.afterSlideId', errors, true);
    if (!['retrieval','spaced-repetition'].includes(String(item.type))) errors.push({ path: p + '.type', message: 'Invalid recap type.', expected: 'retrieval | spaced-repetition', actual: String(item.type), severity: 'error' });
    expectString(item.prompt, p + '.prompt', errors, true);
    if (typeof item.afterSlideId === 'string' && !slideIds.has(item.afterSlideId)) errors.push({ path: p + '.afterSlideId', message: 'Referenced slide ID does not exist.', expected: 'existing slide ID', actual: item.afterSlideId, severity: 'error' });
  });
  return { valid: errors.length === 0, value: errors.length === 0 ? value as unknown as CanonicalPresentation : null, errors, warnings };
}
export function parseCanonicalPresentation(source: string): CanonicalValidationResult {
  let parsed: unknown;
  try { parsed = JSON.parse(source) as unknown; }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON syntax.';
    return { valid: false, value: null, errors: [{ path: '$', message: 'JSON parse failed: ' + message, expected: 'valid JSON', actual: 'syntax error', severity: 'error' }], warnings: [] };
  }
  return validateCanonicalPresentation(parsed);
}
