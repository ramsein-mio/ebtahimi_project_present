import {
  COMPOSITION_CONTENT_KEYS,
  COMPOSITION_ELEMENT_KEYS,
  COMPOSITION_STYLE_KEYS,
  SUPPORTED_COMPOSITION_SHAPE_TYPES,
} from './shape-composition-contract';

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
  const themeKeys = ['background','foreground','text','muted','surface','soft','border','soft2','highlight','primary','secondary','accent','palette','fontFamily','fontSize','fontScale','radiusScale','shadowStyle','direction','contrast','semanticColors'];
  exactKeys(value, themeKeys, path, errors, themeKeys);
  const colorKeys = ['background','foreground','text','muted','surface','soft','border','soft2','highlight','primary','secondary','accent'];
  for (const key of colorKeys) if (key in value && value[key] != null) validateColorValue(value[key], path + '.' + key, errors);
  if ('palette' in value) {
    if (!Array.isArray(value.palette) || value.palette.length < 1 || value.palette.length > 12) errors.push({ path: path + '.palette', message: 'Palette must contain 1 to 12 color strings.', expected: 'string[] of length 1..12', actual: actualType(value.palette), severity: 'error' });
    else value.palette.forEach((color, index) => validateColorValue(color, path + '.palette[' + index + ']', errors));
  }
  if ('semanticColors' in value) {
    if (!isRecord(value.semanticColors)) errors.push({ path: path + '.semanticColors', message: 'Semantic colors must map names to strings.', expected: 'Record<string, string>', actual: actualType(value.semanticColors), severity: 'error' });
    else Object.entries(value.semanticColors).forEach(([key, color]) => validateColorValue(color, path + '.semanticColors.' + key, errors));
  }
  if ('fontFamily' in value && !(typeof value.fontFamily === 'string' && value.fontFamily.trim() || Array.isArray(value.fontFamily) && value.fontFamily.length > 0 && value.fontFamily.every((font) => typeof font === 'string' && font.trim()))) errors.push({ path: path + '.fontFamily', message: 'Font family must be a non-empty string or non-empty string array.', expected: 'string | string[]', actual: actualType(value.fontFamily), severity: 'error' });
  if ('fontSize' in value && value.fontSize != null && !numberInRange(value.fontSize, Number.EPSILON, 512)) errors.push({ path: path + '.fontSize', message: 'Theme font size must be positive and bounded.', expected: 'number in (0, 512]', actual: actualType(value.fontSize), severity: 'error' });
  for (const key of ['fontScale','radiusScale']) if (key in value && value[key] != null && !numberInRange(value[key], Number.EPSILON, 4)) errors.push({ path: path + '.' + key, message: 'Theme scale must be positive and bounded.', expected: 'number in (0, 4]', actual: actualType(value[key]), severity: 'error' });
  if ('shadowStyle' in value && value.shadowStyle != null && !['none','soft','medium','strong'].includes(String(value.shadowStyle))) errors.push({ path: path + '.shadowStyle', message: 'Unsupported shadow style.', expected: 'none | soft | medium | strong', actual: String(value.shadowStyle), severity: 'error' });
  if ('direction' in value && value.direction != null && !['ltr','rtl','auto'].includes(String(value.direction))) errors.push({ path: path + '.direction', message: 'Unsupported text direction.', expected: 'ltr | rtl | auto', actual: String(value.direction), severity: 'error' });
  if ('contrast' in value && value.contrast != null && !['normal','high'].includes(String(value.contrast))) errors.push({ path: path + '.contrast', message: 'Unsupported contrast setting.', expected: 'normal | high', actual: String(value.contrast), severity: 'error' });
}

function validateRenderCanvas(value: unknown, path: string, errors: ValidationIssue[]) {
  if (!isRecord(value)) { errors.push({ path, message: 'Canvas must be an object.', expected: 'canvas object', actual: actualType(value), severity: 'error' }); return; }
  const keys = ['width','height','aspectRatio','background','fullscreen','mode','safeArea'];
  exactKeys(value, keys, path, errors, keys);
  for (const key of ['width','height']) if (key in value && (!numberInRange(value[key], 1, 8192) || !Number.isInteger(value[key]))) errors.push({ path: path + '.' + key, message: 'Canvas dimension must be a supported positive integer.', expected: 'integer in [1, 8192]', actual: actualType(value[key]), severity: 'error' });
  if ('aspectRatio' in value) {
    const match = typeof value.aspectRatio === 'string' ? value.aspectRatio.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/) : null;
    if (!match || Number(match[1]) <= 0 || Number(match[2]) <= 0 || !Number.isFinite(Number(match[1]) / Number(match[2]))) errors.push({ path: path + '.aspectRatio', message: 'Aspect ratio must contain two positive finite numbers.', expected: 'positive W:H ratio, e.g. 16:9', actual: String(value.aspectRatio), severity: 'error' });
  }
  if ('background' in value && value.background != null) validateColorValue(value.background, path + '.background', errors);
  if ('fullscreen' in value && typeof value.fullscreen !== 'boolean') errors.push({ path: path + '.fullscreen', message: 'fullscreen must be boolean.', expected: 'boolean', actual: actualType(value.fullscreen), severity: 'error' });
  if ('mode' in value && !['standard','fullscreen'].includes(String(value.mode))) errors.push({ path: path + '.mode', message: 'Unsupported canvas mode.', expected: 'standard | fullscreen', actual: String(value.mode), severity: 'error' });
  if ('safeArea' in value && value.safeArea != null) {
    if (!isRecord(value.safeArea)) errors.push({ path: path + '.safeArea', message: 'safeArea must be an object.', expected: 'object', actual: actualType(value.safeArea), severity: 'error' });
    else {
      exactKeys(value.safeArea, ['top','right','bottom','left'], path + '.safeArea', errors, ['top','right','bottom','left']);
      const width = typeof value.width === 'number' ? value.width : 1280;
      const ratioMatch = typeof value.aspectRatio === 'string' ? value.aspectRatio.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/) : null;
      const height = typeof value.height === 'number' ? value.height : ratioMatch && Number(ratioMatch[2]) > 0 ? width / (Number(ratioMatch[1]) / Number(ratioMatch[2])) : 720;
      for (const edge of ['top','bottom']) if (edge in value.safeArea && !numberInRange(value.safeArea[edge], 0, height * 0.25)) errors.push({ path: path + '.safeArea.' + edge, message: 'Vertical safe-area inset must be bounded by 25% of canvas height.', expected: 'number in [0, 25% of height]', actual: actualType(value.safeArea[edge]), severity: 'error' });
      for (const edge of ['left','right']) if (edge in value.safeArea && !numberInRange(value.safeArea[edge], 0, width * 0.25)) errors.push({ path: path + '.safeArea.' + edge, message: 'Horizontal safe-area inset must be bounded by 25% of canvas width.', expected: 'number in [0, 25% of width]', actual: actualType(value.safeArea[edge]), severity: 'error' });
    }
  }
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

const SUPPORTED_LAYOUTS = ['title','content','visual-right','image-led-right','asymmetric-editorial','graphic-fullscreen','full-bleed','shape-composition'];
const SUPPORTED_VISUALS = ['none','icon-list','bar-chart','line-chart','pie-chart','comparison-grid','table','shape-composition'];
const LAYOUT_CONFIG_KEYS = ['fullscreen','visualSide','padding','gap','visualWidthRatio'];

function numberInRange(value: unknown, minimum: number, maximum: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function validateColorValue(value: unknown, path: string, errors: ValidationIssue[]) {
  if (typeof value !== 'string' || !value.trim()) {
    errors.push({ path, message: 'Color must be a non-empty CSS color or a supported theme token.', expected: 'CSS color string or theme token', actual: actualType(value), severity: 'error' });
    return;
  }
  const raw = value.trim();
  const valid = /^theme(?:\.[a-zA-Z][\w.-]*|\.palette\.\d+)?$/.test(raw)
    || /^(#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})|rgba?\([\d\s.,%/+\-]+\)|hsla?\([\d\s.,%deg/+\-]+\)|transparent|currentColor)$/i.test(raw)
    || (/^[a-z][a-z-]*$/i.test(raw) && !['none','inherit','initial','unset'].includes(raw.toLowerCase()));
  if (!valid) errors.push({ path, message: 'Color must be a CSS color or a supported theme token.', expected: 'CSS color string or theme token', actual: raw, severity: 'error' });
}

function validateLayoutConfig(value: unknown, path: string, errors: ValidationIssue[], canvasWidth = 1280, canvasHeight = 720) {
  if (!isRecord(value)) {
    errors.push({ path, message: 'Layout settings must be an object.', expected: 'layout config object', actual: actualType(value), severity: 'error' });
    return;
  }
  exactKeys(value, LAYOUT_CONFIG_KEYS, path, errors, LAYOUT_CONFIG_KEYS);
  if ('fullscreen' in value && typeof value.fullscreen !== 'boolean') errors.push({ path: path + '.fullscreen', message: 'fullscreen must be boolean.', expected: 'boolean', actual: actualType(value.fullscreen), severity: 'error' });
  if ('visualSide' in value && !['left','right'].includes(String(value.visualSide))) errors.push({ path: path + '.visualSide', message: 'Unsupported visual side.', expected: 'left | right', actual: String(value.visualSide), severity: 'error' });
  if ('padding' in value && !numberInRange(value.padding, 0, Math.min(canvasWidth, canvasHeight) * 0.22)) errors.push({ path: path + '.padding', message: 'Padding exceeds the renderer-safe canvas inset.', expected: 'number in [0, 22% of the shorter canvas edge]', actual: actualType(value.padding), severity: 'error' });
  if ('gap' in value && !numberInRange(value.gap, 0, Math.min(canvasWidth, canvasHeight) * 0.22)) errors.push({ path: path + '.gap', message: 'Gap exceeds the renderer-safe canvas inset.', expected: 'number in [0, 22% of the shorter canvas edge]', actual: actualType(value.gap), severity: 'error' });
  if ('visualWidthRatio' in value && !numberInRange(value.visualWidthRatio, 0.1, 0.9)) errors.push({ path: path + '.visualWidthRatio', message: 'Visual width ratio must be between 0.1 and 0.9, inclusive.', expected: 'number in [0.1, 0.9]', actual: actualType(value.visualWidthRatio), severity: 'error' });
}

function optionalStringField(value: Record<string, unknown>, key: string, path: string, errors: ValidationIssue[], nonEmpty = false) {
  if (key in value && value[key] !== null) expectString(value[key], path + '.' + key, errors, nonEmpty);
}

function validateVisualDataContract(type: string, data: Record<string, unknown>, path: string, errors: ValidationIssue[]) {
  const optionalText = (record: Record<string, unknown>, key: string, itemPath: string, nonEmpty = false) => optionalStringField(record, key, itemPath, errors, nonEmpty);
  const validateOptionalColor = (record: Record<string, unknown>, itemPath: string) => {
    if ('color' in record && record.color != null) validateColorValue(record.color, itemPath + '.color', errors);
  };
  switch (type) {
    case 'none':
      exactKeys(data, [], path, errors);
      return;
    case 'icon-list': {
      exactKeys(data, ['items'], path, errors);
      if (!Array.isArray(data.items) || data.items.length < 1 || data.items.length > 100) {
        errors.push({ path: path + '.items', message: 'Icon list must contain between 1 and 100 items.', expected: 'array of 1..100 items', actual: actualType(data.items), severity: 'error' }); return;
      }
      data.items.forEach((raw, index) => {
        const itemPath = path + '.items[' + index + ']';
        if (!isRecord(raw)) { errors.push({ path: itemPath, message: 'Icon-list item must be an object.', expected: 'object', actual: actualType(raw), severity: 'error' }); return; }
        exactKeys(raw, ['label','icon','description'], itemPath, errors, ['icon','description']);
        expectString(raw.label, itemPath + '.label', errors, true);
        optionalText(raw, 'icon', itemPath);
        optionalText(raw, 'description', itemPath);
      });
      return;
    }
    case 'bar-chart': {
      exactKeys(data, ['series','xAxisLabel','yAxisLabel','unit','valueFormat'], path, errors, ['xAxisLabel','yAxisLabel','unit','valueFormat']);
      optionalText(data, 'xAxisLabel', path);
      optionalText(data, 'yAxisLabel', path);
      optionalText(data, 'unit', path);
      if ('valueFormat' in data && !['number','percent'].includes(String(data.valueFormat))) errors.push({ path: path + '.valueFormat', message: 'Unsupported chart value format.', expected: 'number | percent', actual: String(data.valueFormat), severity: 'error' });
      if (!Array.isArray(data.series) || data.series.length < 1 || data.series.length > 12) { errors.push({ path: path + '.series', message: 'Bar chart must contain between 1 and 12 series.', expected: 'array of 1..12 series', actual: actualType(data.series), severity: 'error' }); return; }
      let referenceLabels: string[] | null = null;
      data.series.forEach((rawSeries, seriesIndex) => {
        const seriesPath = path + '.series[' + seriesIndex + ']';
        if (!isRecord(rawSeries)) { errors.push({ path: seriesPath, message: 'Chart series must be an object.', expected: 'object', actual: actualType(rawSeries), severity: 'error' }); return; }
        exactKeys(rawSeries, ['name','values','color'], seriesPath, errors, ['name','color']);
        optionalText(rawSeries, 'name', seriesPath, true);
        validateOptionalColor(rawSeries, seriesPath);
        if (!Array.isArray(rawSeries.values) || rawSeries.values.length < 1 || rawSeries.values.length > 100) { errors.push({ path: seriesPath + '.values', message: 'Series values must contain between 1 and 100 entries.', expected: 'array of 1..100 values', actual: actualType(rawSeries.values), severity: 'error' }); return; }
        const labels: string[] = [];
        rawSeries.values.forEach((rawPoint, pointIndex) => {
          const pointPath = seriesPath + '.values[' + pointIndex + ']';
          if (!isRecord(rawPoint)) { errors.push({ path: pointPath, message: 'Bar value must be an object.', expected: 'object', actual: actualType(rawPoint), severity: 'error' }); return; }
          exactKeys(rawPoint, ['label','value','color'], pointPath, errors, ['color']);
          expectString(rawPoint.label, pointPath + '.label', errors, true);
          if (typeof rawPoint.label === 'string') labels.push(rawPoint.label);
          if (typeof rawPoint.value !== 'number' || !Number.isFinite(rawPoint.value) || rawPoint.value < 0 || rawPoint.value > 1e12) errors.push({ path: pointPath + '.value', message: 'Bar values must be finite and non-negative.', expected: 'finite number >= 0', actual: actualType(rawPoint.value), severity: 'error' });
          validateOptionalColor(rawPoint, pointPath);
        });
        if (referenceLabels === null) referenceLabels = labels;
        else if (labels.length !== referenceLabels.length || labels.some((label, index) => label !== referenceLabels?.[index])) errors.push({ path: seriesPath + '.values', message: 'All bar-chart series must use the same category labels in the same order.', expected: 'same labels and order as the first series', actual: 'mismatched categories', severity: 'error' });
      });
      return;
    }
    case 'line-chart': {
      exactKeys(data, ['series','xAxisLabel','yAxisLabel','unit'], path, errors, ['xAxisLabel','yAxisLabel','unit']);
      optionalText(data, 'xAxisLabel', path); optionalText(data, 'yAxisLabel', path); optionalText(data, 'unit', path);
      if (!Array.isArray(data.series) || data.series.length < 1 || data.series.length > 12) { errors.push({ path: path + '.series', message: 'Line chart must contain between 1 and 12 series.', expected: 'array of 1..12 series', actual: actualType(data.series), severity: 'error' }); return; }
      let categoryType: 'number' | 'string' | null = null;
      let categoryLabels: string[] | null = null;
      data.series.forEach((rawSeries, seriesIndex) => {
        const seriesPath = path + '.series[' + seriesIndex + ']';
        if (!isRecord(rawSeries)) { errors.push({ path: seriesPath, message: 'Chart series must be an object.', expected: 'object', actual: actualType(rawSeries), severity: 'error' }); return; }
        exactKeys(rawSeries, ['name','color','points'], seriesPath, errors, ['name','color']);
        optionalText(rawSeries, 'name', seriesPath); validateOptionalColor(rawSeries, seriesPath);
        if (!Array.isArray(rawSeries.points) || rawSeries.points.length < 1 || rawSeries.points.length > 250) { errors.push({ path: seriesPath + '.points', message: 'Line series must contain between 1 and 1000 points.', expected: 'array of 1..1000 points', actual: actualType(rawSeries.points), severity: 'error' }); return; }
        const labels: string[] = [];
        rawSeries.points.forEach((rawPoint, pointIndex) => {
          const pointPath = seriesPath + '.points[' + pointIndex + ']';
          if (!isRecord(rawPoint)) { errors.push({ path: pointPath, message: 'Line point must be an object.', expected: 'object', actual: actualType(rawPoint), severity: 'error' }); return; }
          exactKeys(rawPoint, ['x','y'], pointPath, errors);
          const currentType = typeof rawPoint.x;
          if (currentType !== 'string' && currentType !== 'number') errors.push({ path: pointPath + '.x', message: 'X must be a category label or a number.', expected: 'string | finite number', actual: actualType(rawPoint.x), severity: 'error' });
          else {
            if (currentType === 'string') expectString(rawPoint.x, pointPath + '.x', errors, true);
            else if (!numberInRange(rawPoint.x, -1e12, 1e12)) errors.push({ path: pointPath + '.x', message: 'Numeric X values must be finite.', expected: 'finite number', actual: actualType(rawPoint.x), severity: 'error' });
            const normalizedType = currentType as 'number' | 'string';
            if (categoryType === null) categoryType = normalizedType;
            else if (categoryType !== normalizedType) errors.push({ path: pointPath + '.x', message: 'Use either numeric X values or category labels in one chart, not both.', expected: categoryType + ' X values', actual: normalizedType, severity: 'error' });
            labels.push(String(rawPoint.x));
          }
          if (typeof rawPoint.y !== 'number' || !numberInRange(rawPoint.y, -1e12, 1e12)) errors.push({ path: pointPath + '.y', message: 'Y must be a finite number.', expected: 'finite number', actual: actualType(rawPoint.y), severity: 'error' });
        });
        if (categoryType === 'string') {
          if (categoryLabels === null) categoryLabels = labels;
          else if (labels.length !== categoryLabels.length || labels.some((label, index) => label !== categoryLabels?.[index])) errors.push({ path: seriesPath + '.points', message: 'Categorical series must use matching labels in the same order.', expected: 'same labels and order as the first series', actual: 'mismatched categories', severity: 'error' });
        }
      });
      return;
    }
    case 'pie-chart': {
      exactKeys(data, ['slices','unit','valueFormat'], path, errors, ['unit','valueFormat']);
      optionalText(data, 'unit', path);
      if ('valueFormat' in data && !['number','percent'].includes(String(data.valueFormat))) errors.push({ path: path + '.valueFormat', message: 'Unsupported pie value format.', expected: 'number | percent', actual: String(data.valueFormat), severity: 'error' });
      if (!Array.isArray(data.slices) || data.slices.length < 1 || data.slices.length > 100) { errors.push({ path: path + '.slices', message: 'Pie chart must contain between 1 and 100 slices.', expected: 'array of 1..100 slices', actual: actualType(data.slices), severity: 'error' }); return; }
      let total = 0;
      data.slices.forEach((rawSlice, index) => {
        const itemPath = path + '.slices[' + index + ']';
        if (!isRecord(rawSlice)) { errors.push({ path: itemPath, message: 'Pie slice must be an object.', expected: 'object', actual: actualType(rawSlice), severity: 'error' }); return; }
        exactKeys(rawSlice, ['label','value','color'], itemPath, errors, ['color']);
        expectString(rawSlice.label, itemPath + '.label', errors, true);
        if (typeof rawSlice.value !== 'number' || !Number.isFinite(rawSlice.value) || rawSlice.value < 0 || rawSlice.value > 1e12) errors.push({ path: itemPath + '.value', message: 'Pie values must be finite and non-negative.', expected: 'finite number >= 0', actual: actualType(rawSlice.value), severity: 'error' });
        else total += rawSlice.value;
        validateOptionalColor(rawSlice, itemPath);
      });
      if (total <= 0) errors.push({ path: path + '.slices', message: 'Pie chart total must be greater than zero.', expected: 'positive sum of values', actual: String(total), severity: 'error' });
      return;
    }
    case 'comparison-grid':
    case 'table': {
      const headersKey = type === 'comparison-grid' ? 'columns' : 'headers';
      exactKeys(data, [headersKey,'rows'], path, errors);
      const headers = data[headersKey];
      if (!Array.isArray(headers) || headers.length < 1 || headers.length > 12) errors.push({ path: path + '.' + headersKey, message: 'Table headers must contain between 1 and 12 entries.', expected: 'string array of 1..12 entries', actual: actualType(headers), severity: 'error' });
      else headers.forEach((header, index) => expectString(header, path + '.' + headersKey + '[' + index + ']', errors, true));
      if (!Array.isArray(data.rows) || data.rows.length < 1 || data.rows.length > 100) errors.push({ path: path + '.rows', message: 'Table rows must contain between 1 and 100 entries.', expected: 'array of 1..100 rows', actual: actualType(data.rows), severity: 'error' });
      else data.rows.forEach((rawRow, rowIndex) => {
        const rowPath = path + '.rows[' + rowIndex + ']';
        if (!Array.isArray(rawRow)) { errors.push({ path: rowPath, message: 'Table row must be an array.', expected: 'array of strings with header-matching length', actual: actualType(rawRow), severity: 'error' }); return; }
        if (Array.isArray(headers) && rawRow.length !== headers.length) errors.push({ path: rowPath, message: 'Row cell count must match the number of headers.', expected: String(headers.length) + ' cells', actual: String(rawRow.length), severity: 'error' });
        rawRow.forEach((cell, columnIndex) => expectString(cell, rowPath + '[' + columnIndex + ']', errors));
      });
      return;
    }
    case 'shape-composition':
      return;
    default:
      errors.push({ path, message: 'No schema is registered for this visual type.', expected: SUPPORTED_VISUALS.join(' | '), actual: type, severity: 'error' });
  }
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
    for (const key of ['fontScale','spacingScale','radiusScale']) if (key in meta && meta[key] != null && (!numberInRange(meta[key], Number.EPSILON, 4))) errors.push({ path: 'presentation.' + key, message: 'Scale must be positive and bounded.', expected: 'number in (0, 4]', actual: actualType(meta[key]), severity: 'error' });
    if ('shadowStyle' in meta && meta.shadowStyle != null && !['none','soft','medium','strong'].includes(String(meta.shadowStyle))) errors.push({ path: 'presentation.shadowStyle', message: 'Unsupported shadow style.', expected: 'none | soft | medium | strong', actual: String(meta.shadowStyle), severity: 'error' });
    if ('contrast' in meta && meta.contrast != null && !['normal','high'].includes(String(meta.contrast))) errors.push({ path: 'presentation.contrast', message: 'Unsupported contrast setting.', expected: 'normal | high', actual: String(meta.contrast), severity: 'error' });
    if ('locale' in meta && meta.locale != null && (typeof meta.locale !== 'string' || !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(meta.locale))) errors.push({ path: 'presentation.locale', message: 'Locale must be a valid language/region tag.', expected: 'BCP 47 language tag, e.g. fa-IR or en-US', actual: String(meta.locale), severity: 'error' });
    if ('palette' in meta && meta.palette != null) {
      if (!Array.isArray(meta.palette) || meta.palette.length < 1 || meta.palette.length > 12) errors.push({ path: 'presentation.palette', message: 'Palette must contain 1 to 12 color strings.', expected: 'string[] of length 1..12', actual: actualType(meta.palette), severity: 'error' });
      else meta.palette.forEach((color, index) => validateColorValue(color, 'presentation.palette[' + index + ']', errors));
    }
    if ('semanticColors' in meta && meta.semanticColors != null) {
      if (!isRecord(meta.semanticColors)) errors.push({ path: 'presentation.semanticColors', message: 'semanticColors must map names to strings.', expected: 'Record<string, string>', actual: actualType(meta.semanticColors), severity: 'error' });
      else Object.entries(meta.semanticColors).forEach(([key, color]) => validateColorValue(color, 'presentation.semanticColors.' + key, errors));
    }
    const metadataCanvas = isRecord(meta.canvas) ? meta.canvas : {};
    const layoutWidth = typeof metadataCanvas.width === 'number' ? metadataCanvas.width : 1280;
    const ratioMatch = typeof metadataCanvas.aspectRatio === 'string' ? metadataCanvas.aspectRatio.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/) : null;
    const layoutHeight = typeof metadataCanvas.height === 'number' ? metadataCanvas.height : ratioMatch && Number(ratioMatch[2]) > 0 ? layoutWidth / (Number(ratioMatch[1]) / Number(ratioMatch[2])) : 720;
    if ('layoutDefaults' in meta && meta.layoutDefaults != null) validateLayoutConfig(meta.layoutDefaults, 'presentation.layoutDefaults', errors, layoutWidth, layoutHeight);
    if ('background' in meta && meta.background != null) validateColorValue(meta.background, 'presentation.background', errors);
    // Assets are preserved as opaque metadata because the current renderer does not
    // dereference them yet; do not invent an asset schema or reject future variants.
    if ('assets' in meta && meta.assets != null && !Array.isArray(meta.assets)) errors.push({ path: 'presentation.assets', message: 'assets must be an array when supplied.', expected: 'array', actual: actualType(meta.assets), severity: 'error' });
    expectNullableString(meta.subtitle, 'presentation.subtitle', errors);
    if (typeof meta.estimatedTotalDurationSeconds !== 'number' || !Number.isFinite(meta.estimatedTotalDurationSeconds) || meta.estimatedTotalDurationSeconds <= 0)
      errors.push({ path: 'presentation.estimatedTotalDurationSeconds', message: 'Duration must be a positive finite number.', expected: 'number > 0', actual: actualType(meta.estimatedTotalDurationSeconds), severity: 'error' });
    validateStringArray(meta.learningObjectives, 'presentation.learningObjectives', errors);
    validateReferenceItems(meta.coverageChecklist, 'presentation.coverageChecklist', errors, 'coverage');
    validateReferenceItems(meta.teachingRoadmap, 'presentation.teachingRoadmap', errors, 'roadmap');
  }
  if (!Array.isArray(value.slides)) errors.push({ path: 'slides', message: 'Slides must be an array.', expected: 'array', actual: actualType(value.slides), severity: 'error' });
  const ids = new Set<string>();
  const orders = new Set<number>();
  const slides = Array.isArray(value.slides) ? value.slides : [];
  if (Array.isArray(value.slides) && value.slides.length === 0) errors.push({ path: 'slides', message: 'At least one slide is required.', expected: 'non-empty slide array', actual: 'empty array', severity: 'error' });
  slides.forEach((slide, i) => {
    const p = 'slides[' + i + ']';
    if (!isRecord(slide)) { errors.push({ path: p, message: 'Slide must be an object.', expected: 'object', actual: actualType(slide), severity: 'error' }); return; }
    exactKeys(slide, SLIDE_KEYS, p, errors, ['background','theme','layoutConfig']);
    if ('theme' in slide && slide.theme != null) validateRenderTheme(slide.theme, p + '.theme', errors);
    if ('layoutConfig' in slide && slide.layoutConfig != null) {
      const metaCanvas = isRecord(meta) && isRecord(meta.canvas) ? meta.canvas : {};
      const layoutWidth = typeof metaCanvas.width === 'number' ? metaCanvas.width : 1280;
      const ratioMatch = typeof metaCanvas.aspectRatio === 'string' ? metaCanvas.aspectRatio.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/) : null;
      const layoutHeight = typeof metaCanvas.height === 'number' ? metaCanvas.height : ratioMatch && Number(ratioMatch[2]) > 0 ? layoutWidth / (Number(ratioMatch[1]) / Number(ratioMatch[2])) : 720;
      validateLayoutConfig(slide.layoutConfig, p + '.layoutConfig', errors, layoutWidth, layoutHeight);
    }
    if ('background' in slide && slide.background != null) {
      if (typeof slide.background === 'string') validateColorValue(slide.background, p + '.background', errors);
      else if (isRecord(slide.background)) { exactKeys(slide.background, ['color'], p + '.background', errors); if ('color' in slide.background) validateColorValue(slide.background.color, p + '.background.color', errors); }
      else errors.push({ path: p + '.background', message: 'Slide background must be a color string or color object.', expected: 'string | { color: string }', actual: actualType(slide.background), severity: 'error' });
    }
    for (const key of ['id','section','layout','title','speakerNotes','psychologicalPurpose','sourceReference']) expectString(slide[key], p + '.' + key, errors, key === 'id' || key === 'title');
    const supportedLayouts = ['title','content','visual-right','image-led-right','asymmetric-editorial','graphic-fullscreen','full-bleed','shape-composition'];
    if (typeof slide.layout === 'string' && !supportedLayouts.includes(slide.layout)) warnings.push({
      path: p + '.layout',
      message: 'Unknown layout; renderer will use its standard content layout.',
      expected: supportedLayouts.join(' | '),
      actual: slide.layout,
      severity: 'warning',
    });
    expectNullableString(slide.subtitle, p + '.subtitle', errors);
    if (typeof slide.id === 'string') { if (ids.has(slide.id)) errors.push({ path: p + '.id', message: 'Slide IDs must be unique.', expected: 'unique ID', actual: slide.id, severity: 'error' }); ids.add(slide.id); }
    if (typeof slide.order !== 'number' || !Number.isInteger(slide.order) || slide.order < 1) errors.push({ path: p + '.order', message: 'Order must be a positive integer.', expected: 'integer >= 1', actual: actualType(slide.order), severity: 'error' });
    else if (orders.has(slide.order)) errors.push({ path: p + '.order', message: 'Slide order values must be unique.', expected: 'unique positive integer', actual: String(slide.order), severity: 'error' });
    else orders.add(slide.order);
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
      const supportedVisuals = SUPPORTED_VISUALS;
      if (typeof visual.type === 'string' && !supportedVisuals.includes(visual.type)) warnings.push({
        path: p + '.visual.type',
        message: 'Unknown visual type; renderer will omit the visual and preserve the slide content.',
        expected: supportedVisuals.join(' | '),
        actual: visual.type,
        severity: 'warning',
      });
      if (!isRecord(visual.data)) errors.push({ path: p + '.visual.data', message: 'Visual data must be an object.', expected: 'object', actual: actualType(visual.data), severity: 'error' });
      else if (typeof visual.type === 'string' && supportedVisuals.includes(visual.type)) validateVisualDataContract(visual.type, visual.data, p + '.visual.data', errors);
      const shapeCanvas = isRecord(visual.data) && isRecord(visual.data.canvas) ? visual.data.canvas : {};
      const requiresComposition = ['graphic-fullscreen','full-bleed','shape-composition'].includes(String(slide.layout)) || isRecord(slide.layoutConfig) && slide.layoutConfig.fullscreen === true || shapeCanvas.fullscreen === true;
      if (requiresComposition && visual.type !== 'shape-composition') errors.push({ path: p + '.layout', message: 'Fullscreen rendering requires a shape-composition visual; this renderer cannot fill the canvas from another visual type.', expected: 'visual.type = shape-composition', actual: String(visual.type), severity: 'error' });
      if (slide.layout === 'title' && typeof visual.type === 'string' && visual.type !== 'none' && supportedVisuals.includes(visual.type)) errors.push({ path: p + '.visual.type', message: 'The title layout does not render side visuals; use layout content or a fullscreen shape composition.', expected: 'none for title layout', actual: visual.type, severity: 'error' });
      expectNullableString(visual.caption, p + '.visual.caption', errors);
      if (visual.type === 'shape-composition' && isRecord(visual.data)) {
        exactKeys(visual.data, ['version', 'canvas', 'elements'], p + '.visual.data', errors, ['canvas']);
        if (visual.data.version !== 1) errors.push({ path: p + '.visual.data.version', message: 'Unsupported shape composition version.', expected: '1', actual: String(visual.data.version), severity: 'error' });
        if ('canvas' in visual.data && visual.data.canvas != null) {
          if (!isRecord(visual.data.canvas)) errors.push({ path: p + '.visual.data.canvas', message: 'Canvas must be an object.', expected: 'object', actual: actualType(visual.data.canvas), severity: 'error' });
          else validateRenderCanvas(visual.data.canvas, p + '.visual.data.canvas', errors);
        }
        if (!Array.isArray(visual.data.elements)) errors.push({ path: p + '.visual.data.elements', message: 'Shape elements must be an array.', expected: 'array', actual: actualType(visual.data.elements), severity: 'error' });
        else {
          if (visual.data.elements.length > 500) errors.push({ path: p + '.visual.data.elements', message: 'Shape composition exceeds the renderer safety limit.', expected: 'at most 500 elements', actual: String(visual.data.elements.length), severity: 'error' });
          const elementIds = new Set<string>();
          visual.data.elements.forEach((element, j) => {
            const ep = p + '.visual.data.elements[' + j + ']';
            if (!isRecord(element)) { errors.push({ path: ep, message: 'Shape element must be an object.', expected: 'object', actual: actualType(element), severity: 'error' }); return; }
            exactKeys(element, [...COMPOSITION_ELEMENT_KEYS], ep, errors, ['rotation', 'zIndex', 'style', 'content', 'points']);
            expectString(element.id, ep + '.id', errors, true);
            if (typeof element.id === 'string') { if (elementIds.has(element.id)) errors.push({ path: ep + '.id', message: 'Element IDs must be unique.', expected: 'unique ID', actual: element.id, severity: 'error' }); elementIds.add(element.id); }
            expectString(element.type, ep + '.type', errors, true);
            const supportedShapeTypes: readonly string[] = SUPPORTED_COMPOSITION_SHAPE_TYPES;
            if (typeof element.type === 'string' && !supportedShapeTypes.includes(element.type)) errors.push({ path: ep + '.type', message: 'Unsupported shape type for the current renderer.', expected: supportedShapeTypes.join(' | '), actual: element.type, severity: 'error' });
            const isLinearShape = ['line', 'connector', 'arrow'].includes(String(element.type));
            for (const key of ['x','y','w','h']) {
              const dimension = key === 'w' || key === 'h';
              const validDimension = dimension
                ? (isLinearShape ? typeof element[key] === 'number' && Math.abs(Number(element[key])) <= 2 : typeof element[key] === 'number' && Number(element[key]) > 0 && Number(element[key]) <= 2)
                : typeof element[key] === 'number' && Number(element[key]) >= 0 && Number(element[key]) <= 1;
              if (typeof element[key] !== 'number' || !Number.isFinite(element[key]) || !validDimension) {
                errors.push({ path: ep + '.' + key, message: 'Geometry must be finite and normalized.', expected: dimension ? (isLinearShape ? 'finite number; signed or zero dimensions allowed for line-like shapes' : 'number > 0') : 'number in [0, 1]', actual: actualType(element[key]), severity: 'error' });
              }
            }
            if ('zIndex' in element && (typeof element.zIndex !== 'number' || !Number.isFinite(element.zIndex) || Math.abs(element.zIndex) > 1000000)) errors.push({ path: ep + '.zIndex', message: 'zIndex must be a finite, bounded number.', expected: 'finite number in [-1000000, 1000000]', actual: actualType(element.zIndex), severity: 'error' });
            if ('rotation' in element && (typeof element.rotation !== 'number' || !Number.isFinite(element.rotation) || Math.abs(element.rotation) > 3600)) errors.push({ path: ep + '.rotation', message: 'rotation must be finite and bounded.', expected: 'number in [-3600, 3600] degrees', actual: actualType(element.rotation), severity: 'error' });
            if (isLinearShape && typeof element.w === 'number' && typeof element.h === 'number' && element.w === 0 && element.h === 0) errors.push({ path: ep, message: 'A line-like element must have a non-zero vector.', expected: 'w != 0 or h != 0', actual: 'w = 0 and h = 0', severity: 'error' });
            if (element.type !== 'polygon' && 'points' in element && element.points != null) errors.push({ path: ep + '.points', message: 'points are only supported for polygon shapes.', expected: 'polygon shape', actual: String(element.type), severity: 'error' });
            if ('style' in element && element.style != null && !isRecord(element.style)) errors.push({ path: ep + '.style', message: 'Shape style must be an object or null.', expected: 'object | null', actual: actualType(element.style), severity: 'error' });
            else if (isRecord(element.style)) {
              const style = element.style;
              exactKeys(style, [...COMPOSITION_STYLE_KEYS], ep + '.style', errors, [...COMPOSITION_STYLE_KEYS]);
              for (const key of ['fill', 'stroke', 'color']) if (key in style && style[key] != null) validateColorValue(style[key], ep + '.style.' + key, errors);
              if ('fontSizeUnit' in style && style.fontSizeUnit != null && !['px','canvas-ratio'].includes(String(style.fontSizeUnit))) errors.push({ path: ep + '.style.fontSizeUnit', message: 'fontSizeUnit must be explicit and supported.', expected: 'px | canvas-ratio', actual: String(style.fontSizeUnit), severity: 'error' });
              if (style.fontSizeUnit === 'canvas-ratio' && typeof style.fontSize === 'number' && style.fontSize > 1) errors.push({ path: ep + '.style.fontSize', message: 'canvas-ratio fontSize must be in (0, 1].', expected: 'number in (0,1]', actual: String(style.fontSize), severity: 'error' });
              if (style.fontSizeUnit === 'px' && typeof style.fontSize === 'number' && style.fontSize < 1) errors.push({ path: ep + '.style.fontSize', message: 'Pixel fontSize must be at least 1.', expected: 'number in [1,512]', actual: String(style.fontSize), severity: 'error' });
              for (const key of ['strokeWidth','fontSize','fontScale']) {
                const max = key === 'strokeWidth' ? 24 : key === 'fontSize' ? 512 : 4;
                const min = key === 'strokeWidth' ? 0 : Number.EPSILON;
                if (key in style && style[key] != null && !numberInRange(style[key], min, max)) errors.push({ path: ep + '.style.' + key, message: 'Style dimension must be finite and bounded.', expected: key === 'strokeWidth' ? 'number in [0, 24]' : 'positive bounded number', actual: actualType(style[key]), severity: 'error' });
              }
              if ('radius' in style && style.radius != null && !numberInRange(style.radius, 0, 1000)) errors.push({ path: ep + '.style.radius', message: 'Corner radius must be non-negative and bounded.', expected: 'number in [0, 1000]', actual: actualType(style.radius), severity: 'error' });
              if ('textAlign' in style && style.textAlign != null && !['left', 'center', 'right'].includes(String(style.textAlign))) {
                errors.push({ path: ep + '.style.textAlign', message: 'Unsupported text alignment.', expected: 'left | center | right', actual: String(style.textAlign), severity: 'error' });
              }
              if ('fontWeight' in style && style.fontWeight != null) {
                const weight = style.fontWeight;
                const validWeight = weight === 'bold' || weight === 'normal'
                  || typeof weight === 'number' && Number.isInteger(weight) && weight >= 100 && weight <= 900 && weight % 100 === 0;
                if (!validWeight) errors.push({ path: ep + '.style.fontWeight', message: 'Unsupported font weight.', expected: 'normal | bold | numeric 100–900 in steps of 100', actual: String(weight), severity: 'error' });
              }
              if ('verticalAlign' in style && style.verticalAlign != null && !['top', 'middle', 'bottom'].includes(String(style.verticalAlign))) {
                errors.push({ path: ep + '.style.verticalAlign', message: 'Unsupported vertical alignment.', expected: 'top | middle | bottom', actual: String(style.verticalAlign), severity: 'error' });
              }
              for (const key of ['lineDash', 'dash']) {
                if (key in style && style[key] != null && (!Array.isArray(style[key]) || style[key].some((n) => typeof n !== 'number' || !Number.isFinite(n) || n <= 0))) {
                  errors.push({ path: ep + '.style.' + key, message: 'Dash pattern must contain positive finite numbers.', expected: 'number[]', actual: actualType(style[key]), severity: 'error' });
                }
              }
              if ('endArrow' in style && style.endArrow != null && typeof style.endArrow !== 'boolean') {
                errors.push({ path: ep + '.style.endArrow', message: 'endArrow must be boolean.', expected: 'boolean', actual: actualType(style.endArrow), severity: 'error' });
              }
              
            }
            if ('content' in element && element.content != null && !isRecord(element.content)) errors.push({ path: ep + '.content', message: 'Shape content must be an object or null.', expected: 'object | null', actual: actualType(element.content), severity: 'error' });
            else if (isRecord(element.content)) {
              exactKeys(element.content, [...COMPOSITION_CONTENT_KEYS], ep + '.content', errors, [...COMPOSITION_CONTENT_KEYS]);
              for (const key of COMPOSITION_CONTENT_KEYS) {
                if (key in element.content && element.content[key] != null && typeof element.content[key] !== 'string') {
                  errors.push({ path: ep + '.content.' + key, message: 'Shape content values must be strings.', expected: 'string', actual: actualType(element.content[key]), severity: 'error' });
                }
              }
              if (element.content.side != null && !['left', 'right', 'top', 'bottom'].includes(String(element.content.side))) {
                errors.push({ path: ep + '.content.side', message: 'Unsupported bracket side.', expected: 'left | right | top | bottom', actual: String(element.content.side), severity: 'error' });
              }
            }
            if (element.type === 'text' && (!isRecord(element.content) || !(typeof element.content.text === 'string' && element.content.text.length > 0) && !(typeof element.content.value === 'string' && element.content.value.length > 0))) errors.push({ path: ep + '.content', message: 'Text shapes require non-empty content.text or content.value.', expected: '{ text: non-empty string } | { value: non-empty string }', actual: actualType(element.content), severity: 'error' });
            if (element.type === 'polygon' && (!Array.isArray(element.points) || element.points.length < 3 || element.points.length > 1000)) {
              errors.push({ path: ep + '.points', message: 'Polygon requires at least three normalized points.', expected: 'array with at least 3 points', actual: actualType(element.points), severity: 'error' });
            }
            if ('points' in element && element.points != null) {
              if (!Array.isArray(element.points)) errors.push({ path: ep + '.points', message: 'Polygon points must be an array.', expected: 'array of normalized points', actual: actualType(element.points), severity: 'error' });
              else element.points.forEach((point, k) => {
                const pp = ep + '.points[' + k + ']';
                if (!isRecord(point)) { errors.push({ path: pp, message: 'Polygon point must be an object.', expected: '{ x, y }', actual: actualType(point), severity: 'error' }); return; }
                exactKeys(point, ['x', 'y'], pp, errors);
                for (const axis of ['x', 'y']) {
                  if (typeof point[axis] !== 'number' || !Number.isFinite(point[axis]) || Number(point[axis]) < 0 || Number(point[axis]) > 1) {
                    errors.push({ path: pp + '.' + axis, message: 'Polygon point coordinates must be normalized.', expected: 'number in [0,1]', actual: actualType(point[axis]), severity: 'error' });
                  }
                }
              });
            }
            if (typeof element.x === 'number' && typeof element.w === 'number' && element.x + Math.max(0, element.w) > 1.000001) warnings.push({ path: ep, message: 'Element extends beyond the right canvas edge; renderer may clip it.', severity: 'warning' });
            if (isLinearShape && typeof element.x === 'number' && typeof element.w === 'number' && element.x + Math.min(0, element.w) < -0.000001) warnings.push({ path: ep, message: 'Line-like element extends beyond the left canvas edge; renderer may clip it.', severity: 'warning' });
            if (typeof element.y === 'number' && typeof element.h === 'number' && element.y + Math.max(0, element.h) > 1.000001) warnings.push({ path: ep, message: 'Element extends beyond the bottom canvas edge; renderer may clip it.', severity: 'warning' });
            if (isLinearShape && typeof element.y === 'number' && typeof element.h === 'number' && element.y + Math.min(0, element.h) < -0.000001) warnings.push({ path: ep, message: 'Line-like element extends beyond the top canvas edge; renderer may clip it.', severity: 'warning' });
            if (isRecord(element.style)) {
              const st = element.style;
              if ('opacity' in st && st.opacity != null && !numberInRange(st.opacity, 0, 1)) errors.push({ path: ep + '.style.opacity', message: 'Opacity must be a finite number between 0 and 1.', expected: 'number in [0,1]', actual: actualType(st.opacity), severity: 'error' });
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
