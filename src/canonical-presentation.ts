import {
  COMPOSITION_CONTENT_KEYS,
  COMPOSITION_ELEMENT_KEYS,
  COMPOSITION_STYLE_KEYS,
  SUPPORTED_COMPOSITION_SHAPE_TYPES,
} from './shape-composition-contract';
import { isSupportedVisualType, VISUAL_RENDERER_REGISTRY } from './visual-contract';
import { THEMES } from './viewer/themes';

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
const THEME_KEYS = [
  'background','foreground','text','muted','surface','soft','border','soft2','highlight',
  'primary','secondary','accent','palette','fontFamily','fontSize','fontScale','radiusScale',
  'shadowStyle','direction','contrast','semanticColors',
];
const THEME_COLOR_KEYS = ['background','foreground','text','muted','surface','soft','border','soft2','highlight','primary','secondary','accent'];
function issue(errors: ValidationIssue[], path: string, message: string, expected: string, value: unknown) {
  errors.push({ path, message, expected, actual: actualType(value), severity: 'error' });
}
function expectFiniteNumber(value: unknown, path: string, errors: ValidationIssue[], min = -Infinity, max = Infinity): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    errors.push({ path, message: 'Expected a finite number in the supported range.', expected: `${min}..${max}`, actual: actualType(value), severity: 'error' });
    return false;
  }
  return true;
}
function validateRenderTheme(value: unknown, path: string, errors: ValidationIssue[]) {
  if (!isRecord(value)) { issue(errors, path, 'Theme must be an object.', 'theme object', value); return; }
  exactKeys(value, THEME_KEYS, path, errors, THEME_KEYS);
  for (const key of THEME_COLOR_KEYS) if (key in value && typeof value[key] !== 'string') issue(errors, path + '.' + key, 'Theme color must be a string.', 'CSS color string or theme token', value[key]);
  if ('palette' in value && (!Array.isArray(value.palette) || value.palette.some((color) => typeof color !== 'string'))) issue(errors, path + '.palette', 'Palette must be an array of color strings.', 'string[]', value.palette);
  if ('semanticColors' in value && (!isRecord(value.semanticColors) || Object.values(value.semanticColors).some((color) => typeof color !== 'string'))) issue(errors, path + '.semanticColors', 'Semantic colors must map names to strings.', 'Record<string, string>', value.semanticColors);
  if ('fontFamily' in value && !(typeof value.fontFamily === 'string' && value.fontFamily.trim().length > 0 || Array.isArray(value.fontFamily) && value.fontFamily.length > 0 && value.fontFamily.every((font) => typeof font === 'string' && font.trim().length > 0))) issue(errors, path + '.fontFamily', 'Font family must be a non-empty string or array.', 'string | non-empty string[]', value.fontFamily);
  for (const key of ['fontSize','fontScale','radiusScale']) if (key in value && (typeof value[key] !== 'number' || !Number.isFinite(value[key]) || Number(value[key]) <= 0 || Number(value[key]) > 8 && key !== 'fontSize' || Number(value[key]) > 512 && key === 'fontSize')) issue(errors, path + '.' + key, 'Typography and radius values must be positive finite numbers within the supported bound.', key === 'fontSize' ? 'number in (0,512]' : 'number in (0,8]', value[key]);
  if ('shadowStyle' in value && !['none','soft','medium','strong'].includes(String(value.shadowStyle))) issue(errors, path + '.shadowStyle', 'Unsupported shadow style.', 'none | soft | medium | strong', value.shadowStyle);
  if ('contrast' in value && !['normal','high'].includes(String(value.contrast))) issue(errors, path + '.contrast', 'Unsupported contrast mode.', 'normal | high', value.contrast);
  if ('direction' in value && !['ltr','rtl','auto'].includes(String(value.direction))) issue(errors, path + '.direction', 'Unsupported text direction.', 'ltr | rtl | auto', value.direction);
}
function validateRenderCanvas(value: unknown, path: string, errors: ValidationIssue[]) {
  if (!isRecord(value)) { issue(errors, path, 'Canvas must be an object.', 'canvas object', value); return; }
  for (const key of ['width','height']) if (key in value && (typeof value[key] !== 'number' || !Number.isInteger(value[key]) || !Number.isFinite(value[key]) || Number(value[key]) < 1 || Number(value[key]) > 8192)) issue(errors, path + '.' + key, 'Canvas dimension must be a supported positive integer.', 'integer in [1, 8192]', value[key]);
  if ('aspectRatio' in value) {
    const match = typeof value.aspectRatio === 'string' ? value.aspectRatio.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/) : null;
    if (!match || Number(match[1]) <= 0 || Number(match[2]) <= 0 || !Number.isFinite(Number(match[1])) || !Number.isFinite(Number(match[2]))) issue(errors, path + '.aspectRatio', 'Aspect ratio must contain two positive numbers.', 'positive W:H ratio, e.g. 16:9', value.aspectRatio);
  }
  if ('background' in value && typeof value.background !== 'string') issue(errors, path + '.background', 'Canvas background must be a color string or theme token.', 'string', value.background);
  if ('fullscreen' in value && typeof value.fullscreen !== 'boolean') issue(errors, path + '.fullscreen', 'fullscreen must be boolean.', 'boolean', value.fullscreen);
  if ('mode' in value && (typeof value.mode !== 'string' || !['fullscreen','fit','fixed'].includes(value.mode))) issue(errors, path + '.mode', 'Unsupported canvas mode.', 'fullscreen | fit | fixed', value.mode);
  if ('safeArea' in value) {
    if (!isRecord(value.safeArea)) issue(errors, path + '.safeArea', 'safeArea must be an object.', 'object with optional inset numbers', value.safeArea);
    else {
      exactKeys(value.safeArea, ['top','right','bottom','left'], path + '.safeArea', errors, ['top','right','bottom','left']);
      for (const key of ['top','right','bottom','left']) if (key in value.safeArea && !expectFiniteNumber(value.safeArea[key], path + '.safeArea.' + key, errors, 0, 4096)) { /* issue already recorded */ }
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

function validateLayoutConfig(value: Record<string, unknown>, path: string, errors: ValidationIssue[]) {
  const allowed = ['fullscreen','visualSide','visualWidthRatio','padding','gap'];
  exactKeys(value, allowed, path, errors, allowed);
  if ('fullscreen' in value && typeof value.fullscreen !== 'boolean') issue(errors, path + '.fullscreen', 'fullscreen must be boolean.', 'boolean', value.fullscreen);
  if ('visualSide' in value && !['left','right'].includes(String(value.visualSide))) issue(errors, path + '.visualSide', 'visualSide must be left or right.', 'left | right', value.visualSide);
  if ('visualWidthRatio' in value) expectFiniteNumber(value.visualWidthRatio, path + '.visualWidthRatio', errors, 0.1, 0.9);
  for (const key of ['padding','gap']) if (key in value) expectFiniteNumber(value[key], path + '.' + key, errors, 0, 4096);
}
function validateCell(value: unknown, path: string, errors: ValidationIssue[]) {
  if (typeof value === 'string' || typeof value === 'number' && Number.isFinite(value)) return;
  issue(errors, path, 'Table cells must be strings or finite numbers.', 'string | finite number', value);
}
function validateVisualData(type: string, value: unknown, path: string, errors: ValidationIssue[]) {
  if (!isRecord(value)) return;
  const spec = VISUAL_RENDERER_REGISTRY[type as keyof typeof VISUAL_RENDERER_REGISTRY];
  if (!spec) return;
  exactKeys(value, [...spec.dataKeys], path, errors, spec.dataKeys.filter((key) => !spec.requiredDataKeys.includes(key)));
  if (type === 'none') return;
  if (type === 'icon-list') {
    if (!Array.isArray(value.items) || value.items.length === 0) { issue(errors, path + '.items', 'Icon list must contain at least one item.', 'non-empty array', value.items); return; }
    value.items.forEach((item,index) => {
      const p = path + '.items[' + index + ']';
      if (!isRecord(item)) { issue(errors,p,'Icon-list item must be an object.','{ label, icon?, description? }',item); return; }
      exactKeys(item,['label','icon','description'],p,errors,['icon','description']);
      expectString(item.label,p + '.label',errors,true);
      if ('icon' in item && typeof item.icon !== 'string') issue(errors,p + '.icon','Icon must be a string.','string',item.icon);
      if ('description' in item && typeof item.description !== 'string') issue(errors,p + '.description','Description must be a string.','string',item.description);
    });
  } else if (type === 'bar-chart') {
    if (!Array.isArray(value.series) || value.series.length === 0) { issue(errors,path + '.series','Bar chart requires at least one series.','non-empty series array',value.series); return; }
    let refLabels: string[] | undefined;
    value.series.forEach((series,index) => {
      const sp = path + '.series[' + index + ']';
      if (!isRecord(series)) { issue(errors,sp,'Chart series must be an object.','{ values, name?, color? }',series); return; }
      exactKeys(series,['values','name','color'],sp,errors,['name','color']);
      if ('name' in series) expectString(series.name,sp + '.name',errors);
      if ('color' in series && typeof series.color !== 'string') issue(errors,sp + '.color','Series color must be a string.','CSS color or theme token',series.color);
      if (!Array.isArray(series.values) || series.values.length === 0) { issue(errors,sp + '.values','Each bar series needs values.','non-empty values array',series.values); return; }
      const labels: string[] = [];
      series.values.forEach((entry,j) => {
        const vp = sp + '.values[' + j + ']';
        if (!isRecord(entry)) { issue(errors,vp,'Bar value must be an object.','{ label, value, color? }',entry); return; }
        exactKeys(entry,['label','value','color'],vp,errors,['color']);
        expectString(entry.label,vp + '.label',errors,true);
        expectFiniteNumber(entry.value,vp + '.value',errors);
        if ('color' in entry && typeof entry.color !== 'string') issue(errors,vp + '.color','Bar color must be a string.','CSS color or theme token',entry.color);
        if (typeof entry.label === 'string') labels.push(entry.label);
      });
      if (refLabels && (labels.length !== refLabels.length || labels.some((label,i) => label !== refLabels![i]))) errors.push({ path: sp + '.values', message: 'All bar-chart series must share category labels in the same order.', expected: JSON.stringify(refLabels), actual: JSON.stringify(labels), severity: 'error' });
      else if (!refLabels) refLabels = labels;
    });
    if ('unit' in value && typeof value.unit !== 'string') issue(errors,path + '.unit','Chart unit must be a string.','string, e.g. %, €, ms',value.unit);
  } else if (type === 'line-chart') {
    if (!Array.isArray(value.series) || value.series.length === 0) { issue(errors,path + '.series','Line chart requires at least one series.','non-empty series array',value.series); return; }
    let xKind: 'number' | 'string' | undefined;
    value.series.forEach((series,index) => {
      const sp = path + '.series[' + index + ']';
      if (!isRecord(series)) { issue(errors,sp,'Line series must be an object.','{ points, name?, color? }',series); return; }
      exactKeys(series,['name','color','points'],sp,errors,['name','color']);
      if ('name' in series) expectString(series.name,sp + '.name',errors);
      if ('color' in series && typeof series.color !== 'string') issue(errors,sp + '.color','Series color must be a string.','CSS color or theme token',series.color);
      if (!Array.isArray(series.points) || series.points.length === 0) { issue(errors,sp + '.points','Each line series requires points.','non-empty point array',series.points); return; }
      series.points.forEach((point,j) => {
        const pp=sp + '.points[' + j + ']';
        if (!isRecord(point)) { issue(errors,pp,'Line point must be an object.','{ x: string | number, y: finite number }',point); return; }
        exactKeys(point,['x','y'],pp,errors);
        const kind = typeof point.x === 'number' && Number.isFinite(point.x) ? 'number' : typeof point.x === 'string' && point.x.trim() ? 'string' : undefined;
        if (!kind) issue(errors,pp + '.x','X must be a finite number or a non-empty category label.','finite number | non-empty string',point.x);
        else if (xKind && xKind !== kind) issue(errors,pp + '.x','All X values must use the same axis mode.',xKind,point.x);
        else xKind=kind;
        expectFiniteNumber(point.y,pp + '.y',errors);
      });
    });
  } else if (type === 'pie-chart') {
    if (!Array.isArray(value.slices) || value.slices.length === 0) { issue(errors,path + '.slices','Pie chart requires at least one slice.','non-empty array',value.slices); return; }
    let total=0;
    value.slices.forEach((slice,index) => {
      const sp=path + '.slices[' + index + ']';
      if (!isRecord(slice)) { issue(errors,sp,'Pie slice must be an object.','{ label, value, color? }',slice); return; }
      exactKeys(slice,['label','value','color'],sp,errors,['color']);
      expectString(slice.label,sp + '.label',errors,true);
      if (expectFiniteNumber(slice.value,sp + '.value',errors,0)) total += slice.value;
      if ('color' in slice && typeof slice.color !== 'string') issue(errors,sp + '.color','Slice color must be a string.','CSS color or theme token',slice.color);
    });
    if (total <= 0) issue(errors,path + '.slices','Pie-chart values must sum to a positive total.','sum(value) > 0',value.slices);
    if ('unit' in value && typeof value.unit !== 'string') issue(errors,path + '.unit','Pie-chart unit must be a string.','string',value.unit);
  } else if (type === 'comparison-grid' || type === 'table') {
    const key=type === 'table' ? 'headers' : 'columns';
    const columns=value[key];
    if (!Array.isArray(columns) || columns.length === 0) issue(errors,path + '.' + key,'Grid must contain at least one column.','non-empty string array',columns);
    else columns.forEach((col,index) => expectString(col,path + '.' + key + '[' + index + ']',errors,true));
    if (!Array.isArray(value.rows) || value.rows.length === 0) issue(errors,path + '.rows','Grid must contain at least one row.','non-empty array of rows',value.rows);
    else value.rows.forEach((row,rowIndex) => {
      const rp=path + '.rows[' + rowIndex + ']';
      if (!Array.isArray(row)) { issue(errors,rp,'Grid row must be an array.','cell array matching column count',row); return; }
      if (Array.isArray(columns) && row.length !== columns.length) errors.push({ path: rp, message: 'Every row must have one cell per column.', expected: String(columns.length) + ' cells', actual: String(row.length), severity: 'error' });
      row.forEach((cell,cellIndex) => validateCell(cell,rp + '[' + cellIndex + ']',errors));
    });
  }
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
    if ('locale' in meta && meta.locale != null) {
      if (typeof meta.locale !== 'string' || !meta.locale.trim()) issue(errors, 'presentation.locale', 'Locale must be a non-empty BCP 47 language tag.', 'e.g. fa-IR, en-US', meta.locale);
      else { try { new Intl.Locale(meta.locale); } catch { issue(errors, 'presentation.locale', 'Locale must be a valid BCP 47 language tag.', 'e.g. fa-IR, en-US', meta.locale); } }
    }
    if ('contrast' in meta && meta.contrast != null && !['normal','high'].includes(String(meta.contrast))) issue(errors, 'presentation.contrast', 'Unsupported contrast mode.', 'normal | high', meta.contrast);
    if ('shadowStyle' in meta && meta.shadowStyle != null && !['none','soft','medium','strong'].includes(String(meta.shadowStyle))) issue(errors, 'presentation.shadowStyle', 'Unsupported shadow style.', 'none | soft | medium | strong', meta.shadowStyle);
    if (typeof meta.theme === 'string' && !THEMES.some((theme) => theme.id === meta.theme)) warnings.push({ path: 'presentation.theme', message: 'Unknown theme ID; rendering uses the compatible light theme unless explicit design colors override it.', expected: THEMES.map((theme) => theme.id).join(' | '), actual: meta.theme, severity: 'warning' });
    for (const key of ['fontScale','spacingScale','radiusScale']) if (key in meta && meta[key] != null && (typeof meta[key] !== 'number' || !Number.isFinite(meta[key]) || Number(meta[key]) <= 0)) errors.push({ path: 'presentation.' + key, message: 'Scale must be a positive finite number.', expected: 'number > 0', actual: actualType(meta[key]), severity: 'error' });
    if ('palette' in meta && meta.palette != null && (!Array.isArray(meta.palette) || meta.palette.some((c) => typeof c !== 'string'))) errors.push({ path: 'presentation.palette', message: 'Palette must be an array of strings.', expected: 'string[]', actual: actualType(meta.palette), severity: 'error' });
    if ('semanticColors' in meta && meta.semanticColors != null && (!isRecord(meta.semanticColors) || Object.values(meta.semanticColors).some((color) => typeof color !== 'string'))) errors.push({ path: 'presentation.semanticColors', message: 'semanticColors must map names to strings.', expected: 'Record<string, string>', actual: actualType(meta.semanticColors), severity: 'error' });
    if ('layoutDefaults' in meta && meta.layoutDefaults != null) {
      if (!isRecord(meta.layoutDefaults)) issue(errors, 'presentation.layoutDefaults', 'layoutDefaults must be an object.', 'layout configuration object', meta.layoutDefaults);
      else validateLayoutConfig(meta.layoutDefaults, 'presentation.layoutDefaults', errors);
    }
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
  const orders = new Set<number>();
  const slides = Array.isArray(value.slides) ? value.slides : [];
  slides.forEach((slide, i) => {
    const p = 'slides[' + i + ']';
    if (!isRecord(slide)) { errors.push({ path: p, message: 'Slide must be an object.', expected: 'object', actual: actualType(slide), severity: 'error' }); return; }
    exactKeys(slide, SLIDE_KEYS, p, errors, ['background','theme','layoutConfig']);
    if ('theme' in slide && slide.theme != null) validateRenderTheme(slide.theme, p + '.theme', errors);
    if ('layoutConfig' in slide && slide.layoutConfig != null) {
      if (!isRecord(slide.layoutConfig)) issue(errors, p + '.layoutConfig', 'layoutConfig must be an object or null.', 'object | null', slide.layoutConfig);
      else validateLayoutConfig(slide.layoutConfig, p + '.layoutConfig', errors);
    }
    if ('background' in slide && slide.background != null && !(typeof slide.background === 'string' || isRecord(slide.background) && (slide.background.color === undefined || typeof slide.background.color === 'string'))) errors.push({ path: p + '.background', message: 'Slide background must be a color string or color object.', expected: 'string | { color: string }', actual: actualType(slide.background), severity: 'error' });
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
      const supportedVisuals = ['none','icon-list','bar-chart','line-chart','pie-chart','comparison-grid','table','shape-composition'];
      if (typeof visual.type === 'string' && !supportedVisuals.includes(visual.type)) issue(errors, p + '.visual.type', 'This visual type has no registered validator and renderer.', supportedVisuals.join(' | '), visual.type);
      if (!isRecord(visual.data)) errors.push({ path: p + '.visual.data', message: 'Visual data must be an object.', expected: 'object', actual: actualType(visual.data), severity: 'error' });
      else if (typeof visual.type === 'string' && isSupportedVisualType(visual.type)) validateVisualData(visual.type, visual.data, p + '.visual.data', errors);
      expectNullableString(visual.caption, p + '.visual.caption', errors);
      if ((slide.layout === 'graphic-fullscreen' || slide.layout === 'full-bleed') && visual.type !== 'shape-composition') issue(errors, p + '.visual.type', 'Fullscreen layouts require shape-composition so the chosen layout is actually rendered full-bleed.', 'shape-composition', visual.type);
      if (visual.type === 'shape-composition' && isRecord(visual.data)) {
        exactKeys(visual.data, ['version', 'canvas', 'elements'], p + '.visual.data', errors, ['canvas']);
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
                ? (isLinearShape ? typeof element[key] === 'number' : typeof element[key] === 'number' && Number(element[key]) > 0)
                : typeof element[key] === 'number' && Number(element[key]) >= 0 && Number(element[key]) <= 1;
              if (typeof element[key] !== 'number' || !Number.isFinite(element[key]) || !validDimension) {
                errors.push({ path: ep + '.' + key, message: 'Geometry must be finite and normalized.', expected: dimension ? (isLinearShape ? 'finite number; signed or zero dimensions allowed for line-like shapes' : 'number > 0') : 'number in [0, 1]', actual: actualType(element[key]), severity: 'error' });
              }
            }
            if ('zIndex' in element && (typeof element.zIndex !== 'number' || !Number.isFinite(element.zIndex))) errors.push({ path: ep + '.zIndex', message: 'zIndex must be a finite number.', expected: 'finite number', actual: actualType(element.zIndex), severity: 'error' });
            if ('rotation' in element && (typeof element.rotation !== 'number' || !Number.isFinite(element.rotation))) errors.push({ path: ep + '.rotation', message: 'rotation must be a finite number.', expected: 'finite number', actual: actualType(element.rotation), severity: 'error' });
            if ('style' in element && element.style != null && !isRecord(element.style)) errors.push({ path: ep + '.style', message: 'Shape style must be an object or null.', expected: 'object | null', actual: actualType(element.style), severity: 'error' });
            else if (isRecord(element.style)) {
              const style = element.style;
              exactKeys(style, [...COMPOSITION_STYLE_KEYS], ep + '.style', errors, [...COMPOSITION_STYLE_KEYS]);
              for (const key of ['fill', 'stroke', 'color']) {
                if (key in style && style[key] != null && typeof style[key] !== 'string') {
                  errors.push({ path: ep + '.style.' + key, message: 'Color values must be CSS color strings or supported theme tokens.', expected: 'string', actual: actualType(style[key]), severity: 'error' });
                }
              }
              for (const key of ['fontSize','fontScale']) if (key in style && style[key] != null && (typeof style[key] !== 'number' || !Number.isFinite(style[key]) || Number(style[key]) <= 0 || Number(style[key]) > (key === 'fontSize' ? 512 : 8))) issue(errors, ep + '.style.' + key, 'Typography values must be positive finite values within the supported bound; fontSize is measured in CSS pixels.', key === 'fontSize' ? 'number in (0, 512] pixels' : 'number in (0, 8]', style[key]);
              for (const key of ['strokeWidth','radius']) if (key in style && style[key] != null && (typeof style[key] !== 'number' || !Number.isFinite(style[key]) || Number(style[key]) < 0 || Number(style[key]) > (key === 'strokeWidth' ? 24 : 4096))) issue(errors, ep + '.style.' + key, 'Stroke width may be zero to disable the outline; radius must be non-negative.', key === 'strokeWidth' ? 'number in [0, 24]' : 'number in [0, 4096]', style[key]);
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
            if (element.type === 'polygon' && (!Array.isArray(element.points) || element.points.length < 3)) {
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
            if (isLinearShape && typeof element.w === 'number' && typeof element.h === 'number' && element.w === 0 && element.h === 0) issue(errors, ep, 'A line-like element cannot have both dimensions equal to zero.', 'w != 0 or h != 0', element);
            if (!isLinearShape) for (const key of ['w','h']) if (typeof element[key] === 'number' && Number(element[key]) > 1) issue(errors, ep + '.' + key, 'Normalized area-shape dimensions cannot exceed the composition canvas.', 'number in (0, 1]', element[key]);
            if ('zIndex' in element && typeof element.zIndex === 'number' && (!Number.isInteger(element.zIndex) || Math.abs(element.zIndex) > 10000)) issue(errors, ep + '.zIndex', 'zIndex must be a bounded integer.', 'integer in [-10000, 10000]', element.zIndex);
            if ('rotation' in element && typeof element.rotation === 'number' && Math.abs(element.rotation) > 3600) issue(errors, ep + '.rotation', 'Rotation must be expressed in degrees within a supported bound.', 'number in [-3600, 3600]', element.rotation);
            if (typeof element.x === 'number' && typeof element.w === 'number' && element.x + Math.max(0, element.w) > 1.000001) warnings.push({ path: ep, message: 'Element extends beyond the right canvas edge; renderer may clip it.', severity: 'warning' });
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
