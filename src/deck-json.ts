import type {
  Fill,
  Paragraph,
  Presentation,
  ShapeElement,
  Slide,
  SlideElement,
  Stroke,
  TextBody,
  TextRun,
} from '@web-ppt/core';
import { encodePresentationLineName } from './presentation-interactions';
import { SUPPORTED_COMPOSITION_SHAPE_TYPES } from './shape-composition-contract';

const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;
let ACTIVE_WIDTH = BASE_WIDTH;
let ACTIVE_HEIGHT = BASE_HEIGHT;
let FONT = ['Vazirmatn', 'Tahoma', 'Arial'];
let ACTIVE_PRESENTATION_META: Record<string, unknown> = {};

const DEFAULT_COLORS = {
  background: '#ffffff',
  foreground: '#0b0b0b',
  muted: '#5c5c5c',
  soft: '#f2f2f2',
  soft2: '#e4e4e4',
  highlight: '#ffe45c',
  palette: ['#3b82f6', '#f97316', '#22c55e', '#a855f7', '#ec4899', '#06b6d4'],
} as const;

let COLORS: {
  background: string;
  foreground: string;
  muted: string;
  soft: string;
  soft2: string;
  highlight: string;
  palette: string[];
} = { ...DEFAULT_COLORS, palette: [...DEFAULT_COLORS.palette] };
let ACTIVE_THEME_TOKENS: Record<string, string> = {};

const SECTION_LABELS: Record<string, string> = {
  Introduction: 'مقدمه',
  'Core Concept': 'مفهوم محوری',
  'Literature Review': 'پیشینه پژوهش',
  Methods: 'روش پژوهش',
  'Deep Dive': 'بررسی عمیق',
  Example: 'نمونه',
  Conclusion: 'نتیجه‌گیری',
  Synthesis: 'جمع‌بندی',
};

export interface ReferenceDeckInput {
  presentation?: {
    title?: unknown;
    subtitle?: unknown;
    [key: string]: unknown;
  };
  slides: ReferenceSlideInput[];
  [key: string]: unknown;
}

export interface ReferenceSlideInput {
  id?: unknown;
  order?: unknown;
  section?: unknown;
  layout?: unknown;
  layoutConfig?: unknown;
  background?: unknown;
  theme?: unknown;
  title?: unknown;
  subtitle?: unknown;
  body?: {
    lead?: unknown;
    bullets?: unknown;
    emphasis?: unknown;
    [key: string]: unknown;
  };
  visual?: {
    type?: unknown;
    data?: unknown;
    caption?: unknown;
    [key: string]: unknown;
  };
  speakerNotes?: unknown;
  [key: string]: unknown;
}

interface ParsedSegment {
  text: string;
  bold: boolean;
  highlight: boolean;
}

interface LineObject {
  text?: unknown;
  main?: unknown;
  details?: unknown;
  detail?: unknown;
  tooltip?: unknown;
  note?: unknown;
  moreInfo?: unknown;
  description?: unknown;
  [key: string]: unknown;
}

function stringValue(value: unknown): string {
  return value == null ? '' : String(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function colorString(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const color = value.trim();
  const isColor = /^(#[\da-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\)|transparent)$/i.test(color)
    || (/^[a-z][a-z-]*$/i.test(color) && !['theme', 'none', 'inherit', 'initial', 'unset'].includes(color.toLowerCase()));
  return isColor ? color : fallback;
}

function configuredThemeColor(value: unknown, fallback: string, theme: Record<string, unknown>): string {
  if (typeof value !== 'string') return fallback;
  const raw = value.trim();
  if (!raw) return fallback;
  if (raw === 'theme' || raw === 'theme.background') {
    const background = theme.background;
    return typeof background === 'string' && background !== raw
      ? colorString(background, fallback)
      : fallback;
  }
  if (!raw.startsWith('theme.')) return colorString(raw, fallback);

  const key = raw.slice('theme.'.length);
  const palette = Array.isArray(theme.palette) ? theme.palette : [];
  const semantic = isRecord(theme.semanticColors) ? theme.semanticColors : {};
  const paletteIndex = key.match(/^palette\.(\d+)$/);
  if (paletteIndex) return colorString(palette[Number(paletteIndex[1])], fallback);

  const aliases: Record<string, unknown> = {
    foreground: theme.foreground ?? theme.text,
    text: theme.text ?? theme.foreground,
    surface: theme.surface ?? theme.soft,
    soft: theme.soft ?? theme.surface,
    border: theme.border ?? theme.soft2,
    soft2: theme.soft2 ?? theme.border,
    primary: palette[0],
    secondary: palette[1] ?? palette[0],
    accent: palette[2] ?? palette[0],
  };
  const candidate = theme[key] ?? semantic[key] ?? aliases[key];
  if (typeof candidate !== 'string' || candidate === raw || candidate.startsWith('theme.')) return fallback;
  return colorString(candidate, fallback);
}

function dimensionsForDeck(value: ReferenceDeckInput): { width: number; height: number } {
  const metadata = isRecord(value.presentation) ? value.presentation : {};
  const canvas = isRecord(value.canvas) ? value.canvas : isRecord(metadata.canvas) ? metadata.canvas : {};
  const width = typeof canvas.width === 'number' && Number.isFinite(canvas.width) && canvas.width > 0
    ? canvas.width : BASE_WIDTH;
  const height = typeof canvas.height === 'number' && Number.isFinite(canvas.height) && canvas.height > 0
    ? canvas.height : null;
  if (height) return { width, height };
  const ratio = typeof canvas.aspectRatio === 'string' ? canvas.aspectRatio.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/) : null;
  if (ratio) {
    const aspect = Number(ratio[1]) / Number(ratio[2]);
    if (Number.isFinite(aspect) && aspect > 0) return { width, height: width / aspect };
  }
  return { width, height: BASE_HEIGHT };
}

function resolveSlideTheme(deck: ReferenceDeckInput, source: ReferenceSlideInput): void {
  const metadata = isRecord(deck.presentation) ? deck.presentation : {};
  const rootTheme = isRecord(deck.theme) ? deck.theme : {};
  const metadataTheme = {
    ...(isRecord(metadata.theme) ? metadata.theme : {}),
    ...(isRecord(metadata.design) ? metadata.design : {}),
  };
  const slideTheme = isRecord(source.theme) ? source.theme : {};
  const theme: Record<string, unknown> = { ...rootTheme, ...metadataTheme, ...slideTheme };
  if (Array.isArray(metadata.palette) && !Array.isArray(metadataTheme.palette) && !Array.isArray(slideTheme.palette)) {
    theme.palette = metadata.palette;
  }
  const semanticColors = {
    ...(isRecord(metadata.semanticColors) ? metadata.semanticColors : {}),
    ...(isRecord(rootTheme.semanticColors) ? rootTheme.semanticColors : {}),
    ...(isRecord(metadataTheme.semanticColors) ? metadataTheme.semanticColors : {}),
    ...(isRecord(slideTheme.semanticColors) ? slideTheme.semanticColors : {}),
  };
  if (Object.keys(semanticColors).length) theme.semanticColors = semanticColors;
  ACTIVE_PRESENTATION_META = {
    ...metadata,
    direction: slideTheme.direction ?? metadataTheme.direction ?? metadata.direction ?? rootTheme.direction,
    fontScale: slideTheme.fontScale ?? metadataTheme.fontScale ?? metadata.fontScale ?? rootTheme.fontScale,
    spacingScale: slideTheme.spacingScale ?? metadataTheme.spacingScale ?? metadata.spacingScale ?? rootTheme.spacingScale,
  };
  const rootCanvas = isRecord(deck.canvas) ? deck.canvas : {};
  const metadataCanvas = isRecord(metadata.canvas) ? metadata.canvas : {};
  const visual = isRecord(source.visual) ? source.visual : {};
  const data = isRecord(visual.data) ? visual.data : {};
  const canvas = isRecord(data.canvas) ? data.canvas : {};
  const slideBackground = isRecord(source.background) ? source.background.color : source.background;
  const background = configuredThemeColor(
    slideBackground ?? canvas.background ?? metadata.background ?? metadataCanvas.background ?? rootCanvas.background ?? theme.background,
    DEFAULT_COLORS.background,
    theme,
  );
  const palette = Array.isArray(theme.palette)
    ? theme.palette.map((color) => colorString(color, '')).filter(Boolean)
    : [];
  const fonts = Array.isArray(theme.fontFamily)
    ? theme.fontFamily.filter((font): font is string => typeof font === 'string' && font.trim().length > 0)
    : typeof theme.fontFamily === 'string' && theme.fontFamily.trim()
      ? [theme.fontFamily, 'Tahoma', 'Arial']
      : null;
  COLORS = {
    background,
    foreground: configuredThemeColor(theme.foreground ?? theme.text, DEFAULT_COLORS.foreground, theme),
    muted: configuredThemeColor(theme.muted, DEFAULT_COLORS.muted, theme),
    soft: configuredThemeColor(theme.surface ?? theme.soft, DEFAULT_COLORS.soft, theme),
    soft2: configuredThemeColor(theme.border ?? theme.soft2, DEFAULT_COLORS.soft2, theme),
    highlight: configuredThemeColor(theme.highlight, DEFAULT_COLORS.highlight, theme),
    palette: palette.length ? palette : [...DEFAULT_COLORS.palette],
  };
  FONT = fonts ? [...fonts] : ['Vazirmatn', 'Tahoma', 'Arial'];
  ACTIVE_THEME_TOKENS = {
    background: COLORS.background,
    foreground: COLORS.foreground,
    text: COLORS.foreground,
    muted: COLORS.muted,
    surface: COLORS.soft,
    soft: COLORS.soft,
    border: COLORS.soft2,
    soft2: COLORS.soft2,
    highlight: COLORS.highlight,
    primary: configuredThemeColor('theme.primary', COLORS.palette[0] ?? COLORS.foreground, theme),
    secondary: configuredThemeColor('theme.secondary', COLORS.palette[1] ?? COLORS.palette[0] ?? COLORS.foreground, theme),
    accent: configuredThemeColor('theme.accent', COLORS.palette[2] ?? COLORS.palette[0] ?? COLORS.foreground, theme),
  };
  if (isRecord(theme.semanticColors)) {
    for (const [key, value] of Object.entries(theme.semanticColors)) {
      const resolved = configuredThemeColor(value, '', theme);
      if (resolved) ACTIVE_THEME_TOKENS[key] = resolved;
    }
  }
}

function slideBackground(source: ReferenceSlideInput, deck: ReferenceDeckInput): Fill {
  const metadata = isRecord(deck.presentation) ? deck.presentation : {};
  const rootTheme = isRecord(deck.theme) ? deck.theme : {};
  const metadataTheme = isRecord(metadata.design) ? metadata.design : isRecord(metadata.theme) ? metadata.theme : {};
  const rootCanvas = isRecord(deck.canvas) ? deck.canvas : {};
  const metadataCanvas = isRecord(metadata.canvas) ? metadata.canvas : {};
  const visual = isRecord(source.visual) ? source.visual : {};
  const data = isRecord(visual.data) ? visual.data : {};
  const canvas = isRecord(data.canvas) ? data.canvas : {};
  const explicit = isRecord(source.background) ? source.background.color : source.background;
  const value = explicit ?? canvas.background ?? metadata.background ?? metadataCanvas.background ?? rootCanvas.background ?? metadataTheme.background ?? rootTheme.background ?? COLORS.background;
  return { type: 'solid', color: resolveDesignToken(value, COLORS.background) };
}

function isLineObject(value: unknown): value is LineObject {
  return isRecord(value);
}

export function referenceLineText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (isLineObject(value)) return typeof value.text === 'string' ? value.text : (typeof value.main === 'string' ? value.main : '');
  return String(value);
}

function lineDetailsValue(value: LineObject): string {
  const aliases = [value.details, value.detail, value.tooltip, value.note, value.moreInfo, value.description];
  for (const candidate of aliases) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
  }
  return '';
}

export function referenceLineDetails(value: unknown): string {
  if (!isLineObject(value)) return '';
  const details = value.details;
  return typeof details === 'string' && details.trim() ? details : '';
}

export function lineText(x: unknown): string {
  if (x == null) return '';
  if (typeof x === 'string') return x;
  if (isLineObject(x)) return typeof x.text === 'string' ? x.text : (typeof x.main === 'string' ? x.main : '');
  return String(x);
}

export function lineDetails(x: unknown): string {
  if (!isLineObject(x)) return '';
  return lineDetailsValue(x);
}

export function lineHasDetails(x: unknown): boolean {
  return lineDetails(x).length > 0;
}

export function plainReferenceText(value: unknown): string {
  return stringValue(value)
    .replace(/==!([^=]+?)(?:!==|!=|==)/g, '$1')
    .replace(/==((?:(?!==).)+?)==/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1');
}

export function parseReferenceSegments(value: unknown): ParsedSegment[] {
  const source = stringValue(value);
  const segments: ParsedSegment[] = [];
  const matcher = /==!([^=]+?)(?:!==|!=|==)|==((?:(?!==).)+?)==|\*\*(.+?)\*\*/g;
  let position = 0;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(source)) !== null) {
    if (match.index > position) {
      segments.push({ text: source.slice(position, match.index), bold: false, highlight: false });
    }
    if (match[1] !== undefined) segments.push({ text: match[1], bold: true, highlight: true });
    else if (match[2] !== undefined) segments.push({ text: match[2], bold: true, highlight: true });
    else if (match[3] !== undefined) segments.push({ text: match[3], bold: true, highlight: false });
    position = matcher.lastIndex;
  }
  if (position < source.length) {
    segments.push({ text: source.slice(position), bold: false, highlight: false });
  }
  return segments.length ? segments : [{ text: '', bold: false, highlight: false }];
}

function run(segment: ParsedSegment, size: number, color: string): TextRun {
  return {
    text: segment.text,
    b: segment.bold,
    i: false,
    u: false,
    strike: false,
    size,
    color,
    fonts: FONT,
    ...(segment.highlight ? { highlight: COLORS.highlight } : {}),
  };
}

function paragraph(
  value: unknown,
  size: number,
  color: string,
  align: Paragraph['align'],
  forceBold = false,
): Paragraph {
  const runs = parseReferenceSegments(value).map((segment) => run(
    forceBold ? { ...segment, bold: true } : segment,
    size,
    color,
  ));
  return {
    align,
    lvl: 0,
    marL: 0,
    indent: 0,
    bullet: null,
    lineHeight: typeof ACTIVE_PRESENTATION_META.spacingScale === 'number' && Number.isFinite(ACTIVE_PRESENTATION_META.spacingScale) ? Math.max(1, Math.min(3, 2 * ACTIVE_PRESENTATION_META.spacingScale)) : 2.0,
    spaceBefore: 0,
    spaceAfter: 0,
    rtl: ACTIVE_PRESENTATION_META.direction === 'ltr' ? false : true,
    runs,
  };
}

function textBody(
  value: unknown,
  size: number,
  color: string,
  align: Paragraph['align'] = 'right',
  forceBold = false,
  anchor: TextBody['anchor'] = 'middle',
): TextBody {
  const lines = stringValue(value).split('\n');
  return {
    anchor,
    insets: [4, 7, 4, 7],
    wrap: true,
    fontScale: 1,
    autoFitCompute: true,
    autoFitNormal: true,
    paragraphs: lines.map((line) => paragraph(line, size, color, align, forceBold)),
  };
}

function rectPath(width: number, height: number): string {
  return `M 0 0 H ${width} V ${height} H 0 Z`;
}

function roundedRectPath(width: number, height: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  return `M ${r} 0 H ${width - r} Q ${width} 0 ${width} ${r} V ${height - r} Q ${width} ${height} ${width - r} ${height} H ${r} Q 0 ${height} 0 ${height - r} V ${r} Q 0 0 ${r} 0 Z`;
}

function shape(
  x: number,
  y: number,
  w: number,
  h: number,
  path: string | null,
  fill: Fill | null,
  stroke: Stroke | null = null,
  text: TextBody | null = null,
  name?: string,
): ShapeElement {
  return {
    kind: 'shape', x, y, w, h, rot: 0, flipH: false, flipV: false,
    path, fill, stroke, text, name,
  };
}

function rectangle(
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  radius = 0,
  stroke: Stroke | null = null,
  name?: string,
): ShapeElement {
  return shape(
    x,
    y,
    w,
    h,
    radius ? roundedRectPath(w, h, radius) : rectPath(w, h),
    { type: 'solid', color },
    stroke,
    null,
    name,
  );
}

function textBox(
  x: number,
  y: number,
  w: number,
  h: number,
  value: unknown,
  size: number,
  color: string = COLORS.foreground,
  align: Paragraph['align'] = 'right',
  bold = false,
  name?: string,
  anchor: TextBody['anchor'] = 'middle',
): ShapeElement {
  return shape(x, y, w, h, null, null, null, textBody(value, size, color, align, bold, anchor), name);
}

function outlinedTextBox(
  x: number,
  y: number,
  w: number,
  h: number,
  value: unknown,
  size: number,
  fill: string,
  borderColor: string,
  textColor: string = COLORS.foreground,
  align: Paragraph['align'] = 'right',
  bold = false,
  name?: string,
): ShapeElement {
  return shape(
    x,
    y,
    w,
    h,
    roundedRectPath(w, h, 7),
    { type: 'solid', color: fill },
    { color: borderColor, width: 1, dash: null },
    textBody(value, size, textColor, align, bold),
    name,
  );
}

function sectionLabel(value: unknown): string {
  const key = stringValue(value);
  return SECTION_LABELS[key] || key;
}

function visualData(v: unknown): Record<string, unknown> {
  const visual = isRecord(v) ? v : {};
  const data = visual.data;
  return isRecord(data) ? data : {};
}

export function hasValidVisual(visual: unknown): boolean {
  if (!visual || !isRecord(visual)) return false;
  const type = visual.type;
  if (!type || type === 'none') return false;
  const data = visualData(visual);
  switch (type) {
    case 'icon-list': {
      const items = data.items;
      return Array.isArray(items) && items.length > 0;
    }
    case 'bar-chart': {
      const series = data.series;
      return Array.isArray(series)
        && series.length > 0
        && isRecord(series[0])
        && Array.isArray(series[0].values)
        && (series[0].values as unknown[]).length > 0;
    }
    case 'line-chart': {
      const series = data.series;
      if (!Array.isArray(series)) return false;
      return series.some((item) => isRecord(item) && Array.isArray(item.points) && (item.points as unknown[]).length > 0);
    }
    case 'pie-chart': {
      const slices = data.slices;
      return Array.isArray(slices) && slices.length > 0;
    }
    case 'comparison-grid': {
      const columns = data.columns;
      const rows = data.rows;
      return Array.isArray(columns) && columns.length > 0 && Array.isArray(rows) && rows.length > 0;
    }
    case 'shape-composition': {
      return Array.isArray(data.elements) && data.elements.some(isRecord);
    }
    case 'table': {
      const headers = data.headers;
      const rows = data.rows;
      return Array.isArray(headers) && headers.length > 0 && Array.isArray(rows) && rows.length > 0;
    }
    default:
      return false;
  }
}

export function visualHasContent(visual: unknown): boolean {
  return hasValidVisual(visual);
}

export function slideHasValidVisual(slide: ReferenceSlideInput): boolean {
  return hasValidVisual(slide.visual);
}

function isColorlessPlaceholder(element: SlideElement): boolean {
  if (element.kind !== 'shape') return false;
  const name = element.name ?? '';
  const fill = element.fill;
  const stroke = element.stroke;
  const fillNone = !fill || fill.type === 'none' || fill.type === 'solid' && fill.color === COLORS.background;
  const strokeNone = !stroke || stroke.color === COLORS.soft2;
  const isPlaceholderName = /^(visual-frame|visual-empty|visual-placeholder|visual-caption|caption-rule)$/.test(name);
  const isOnLeftHalf = element.x < ACTIVE_WIDTH * .48 && element.w >= ACTIVE_WIDTH * .4;
  return isPlaceholderName && fillNone && strokeNone && isOnLeftHalf;
}

function filterEmptyPlaceholders(elements: SlideElement[]): SlideElement[] {
  return elements.filter((element) => !isColorlessPlaceholder(element));
}

function detailsNotes(slide: ReferenceSlideInput): string {
  const body = isRecord(slide.body) ? slide.body : {};
  const values = [body.lead, ...(Array.isArray(body.bullets) ? body.bullets : []), body.emphasis];
  const details = values.flatMap((value) => {
    const details = lineDetails(value);
    if (!details) return [];
    const label = plainReferenceText(referenceLineText(value));
    return [`${label}${label ? ': ' : ''}${details}`];
  }).join('\n\n');
  const speakerNotes = typeof slide.speakerNotes === 'string' ? slide.speakerNotes.trim() : '';
  return [speakerNotes, details].filter(Boolean).join('\n\n');
}

function detailBadge(x: number, y: number, elements: SlideElement[]): void {
  elements.push(rectangle(x, y, 20, 20, COLORS.foreground, 10));
  elements.push(textBox(x, y - 1, 20, 20, '؟', 11, COLORS.background, 'center', true));
}

function addReferenceLine(
  elements: SlideElement[],
  value: unknown,
  frame: { x: number; y: number; w: number; h: number },
  size: number,
  options: { bold?: boolean; fill?: string; borderStart?: boolean; name?: string; bullet?: boolean } = {},
): void {
  const { x, y, w, h } = frame;
  if (options.fill) elements.push(rectangle(x, y, w, h, options.fill, 4));
  if (options.borderStart) elements.push(rectangle(x + w - 5, y, 5, h, COLORS.foreground));
  if (options.bullet) elements.push(rectangle(x + w - 12, y + h * .43, 7, 7, COLORS.foreground));
  const detailWidth = lineDetails(value) ? 28 : 0;
  elements.push(textBox(
    x + detailWidth,
    y,
    w - detailWidth - (options.bullet ? 19 : 0),
    h,
    referenceLineText(value),
    size,
    COLORS.foreground,
    'right',
    Boolean(options.bold),
    encodePresentationLineName(
      options.name ?? 'line',
      plainReferenceText(referenceLineText(value)),
      lineDetails(value),
    ),
  ));
  if (detailWidth) detailBadge(x + 4, y + Math.max(2, (h - 20) / 2), elements);
}

function titleSlide(source: ReferenceSlideInput, deck: ReferenceDeckInput): Slide {
  resolveSlideTheme(deck, source);
  const elements: SlideElement[] = [];
  const body = isRecord(source.body) ? source.body : {};
  elements.push(rectangle(592, 94, 96, 4, COLORS.foreground, 0, null, 'title-rule'));
  elements.push(textBox(140, 122, 1000, 128, source.title, 48, COLORS.foreground, 'center', true, 'deck-title'));
  if (source.subtitle) {
    elements.push(textBox(220, 254, 840, 68, source.subtitle, 23, COLORS.muted, 'center', false, 'deck-subtitle'));
  }
  elements.push(rectangle(612, 345, 56, 3, COLORS.foreground, 0, null, 'title-rule-thin'));
  if (body.lead) {
    addReferenceLine(elements, body.lead, { x: 190, y: 372, w: 900, h: 96 }, 19, { name: 'deck-lead' });
  }
  if (body.emphasis) {
    const frame = { x: 210, y: body.lead ? 500 : 410, w: 860, h: 72 };
    elements.push(shape(
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      roundedRectPath(frame.w, frame.h, 4),
      { type: 'solid', color: COLORS.background },
      { color: COLORS.foreground, width: 2, dash: null },
      null,
      'deck-emphasis-frame',
    ));
    addReferenceLine(elements, body.emphasis, frame, 19, { bold: true, name: 'deck-emphasis' });
  }
  return {
    background: slideBackground(source, deck),
    elements: filterEmptyPlaceholders(elements),
    notes: detailsNotes(source),
    layoutName: 'Reference title',
    transition: { type: 'fade', durationMs: 600 },
  };
}

function contentHeader(source: ReferenceSlideInput, elements: SlideElement[]): number {
  const label = sectionLabel(source.section);
  const labelWidth = Math.max(74, Math.min(190, 28 + label.length * 12));
  elements.push(outlinedTextBox(
    ACTIVE_WIDTH - 64 - labelWidth,
    42,
    labelWidth,
    30,
    label,
    12,
    COLORS.foreground,
    COLORS.foreground,
    COLORS.background,
    'center',
    true,
    'section-tag',
  ));
  elements.push(outlinedTextBox(
    ACTIVE_WIDTH - 64 - labelWidth - 48,
    42,
    38,
    30,
    source.order,
    12,
    COLORS.background,
    COLORS.soft2,
    COLORS.foreground,
    'center',
    true,
    'slide-order',
  ));
  elements.push(textBox(64, 78, 1152, 64, source.title, 31, COLORS.foreground, 'right', true, 'slide-title'));
  let ruleY = 154;
  if (source.subtitle) {
    elements.push(textBox(64, 137, 1152, 36, source.subtitle, 17, COLORS.muted, 'right', false, 'slide-subtitle'));
    ruleY = 180;
  }
  elements.push(rectangle(64, ruleY, 1152, 3, COLORS.foreground, 0, null, 'header-rule'));
  return ruleY + 25;
}

function addBodyText(
  source: ReferenceSlideInput,
  elements: SlideElement[],
  frame: { x: number; y: number; w: number; h: number },
): void {
  const body = isRecord(source.body) ? source.body : {};
  const bullets = Array.isArray(body.bullets) ? body.bullets : [];
  let cursor = frame.y;
  if (body.lead) {
    const leadHeight = bullets.length ? 76 : 104;
    addReferenceLine(elements, body.lead, { x: frame.x, y: cursor, w: frame.w, h: leadHeight }, 20, { name: 'lead' });
    cursor += leadHeight + 8;
  }
  if (bullets.length) {
    const emphasisSpace = body.emphasis ? 82 : 0;
    const available = Math.max(100, frame.y + frame.h - cursor - emphasisSpace);
    const rowHeight = Math.max(37, Math.min(61, available / bullets.length));
    bullets.forEach((bullet, index) => {
      addReferenceLine(
        elements,
        bullet,
        { x: frame.x, y: cursor + index * rowHeight, w: frame.w, h: rowHeight - 3 },
        bullets.length > 6 ? 15 : 18,
        { bullet: true, name: `bullet-${index + 1}` },
      );
    });
    cursor += rowHeight * bullets.length + 8;
  }
  if (body.emphasis) {
    const emphasisY = Math.min(frame.y + frame.h - 70, Math.max(cursor, frame.y + 12));
    addReferenceLine(
      elements,
      body.emphasis,
      { x: frame.x, y: emphasisY, w: frame.w, h: 70 },
      18,
      { bold: true, fill: COLORS.soft, borderStart: true, name: 'emphasis' },
    );
  }
}

function addVisualFrame(
  elements: SlideElement[],
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  elements.push(shape(
    x,
    y,
    w,
    h,
    roundedRectPath(w, h, 16),
    { type: 'solid', color: COLORS.background },
    { color: COLORS.soft2, width: 1, dash: null },
    null,
    'visual-frame',
  ));
}

function visualCaption(
  value: unknown,
  elements: SlideElement[],
  frame: { x: number; y: number; w: number; h: number },
): number {
  if (!value) return 0;
  elements.push(shape(
    frame.x + 18,
    frame.y + frame.h - 57,
    frame.w - 36,
    1,
    rectPath(frame.w - 36, 1),
    { type: 'solid', color: COLORS.soft2 },
    null,
    null,
    'caption-rule',
  ));
  elements.push(textBox(frame.x + 18, frame.y + frame.h - 52, frame.w - 36, 38, value, 13, COLORS.muted, 'center', false, 'visual-caption'));
  return 58;
}

function renderIconList(
  visual: Record<string, unknown>,
  elements: SlideElement[],
  frame: { x: number; y: number; w: number; h: number },
): void {
  const data = isRecord(visual.data) ? visual.data : {};
  const items = Array.isArray(data.items) ? data.items.filter(isRecord) : [];
  if (!items.length) return;
  const captionSpace = visualCaption(visual.caption, elements, frame);
  const content = { x: frame.x + 18, y: frame.y + 18, w: frame.w - 36, h: frame.h - 36 - captionSpace };
  const columns = items.length <= 2 ? 1 : 2;
  const rows = Math.ceil(items.length / columns);
  const gap = 10;
  const cardW = (content.w - gap * (columns - 1)) / columns;
  const cardH = Math.min(116, (content.h - gap * (rows - 1)) / rows);
  items.forEach((item, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = content.x + (columns - 1 - column) * (cardW + gap);
    const y = content.y + row * (cardH + gap);
    elements.push(rectangle(x, y, cardW, cardH, COLORS.soft, 10, null, `icon-card-${index + 1}`));
    elements.push(rectangle(x + cardW - 52, y + 12, 38, 38, COLORS.background, 19, { color: COLORS.soft2, width: 1, dash: null }));
    elements.push(textBox(x + cardW - 52, y + 10, 38, 40, item.icon || '•', 20, COLORS.foreground, 'center'));
    elements.push(textBox(x + 12, y + 13, cardW - 72, 32, item.label, 16, COLORS.foreground, 'right', true));
    if (item.description) elements.push(textBox(x + 12, y + 51, cardW - 24, cardH - 59, item.description, 12, COLORS.muted, 'right'));
  });
}

function renderBarChart(
  visual: Record<string, unknown>,
  elements: SlideElement[],
  frame: { x: number; y: number; w: number; h: number },
): void {
  const data = isRecord(visual.data) ? visual.data : {};
  const series = Array.isArray(data.series) ? data.series.filter(isRecord) : [];
  const values = series.length && Array.isArray(series[0].values) ? series[0].values.filter(isRecord) : [];
  if (!values.length) return;
  const captionSpace = visualCaption(visual.caption, elements, frame);
  const area = { x: frame.x + 24, y: frame.y + 22, w: frame.w - 48, h: frame.h - 44 - captionSpace };
  const max = Math.max(1, ...values.map((item) => Number(item.value) || 0));
  const rowHeight = area.h / values.length;
  const isPercent = stringValue(data.yAxisLabel).includes('درصد');
  values.forEach((item, index) => {
    const rowY = area.y + rowHeight * index;
    const value = Number(item.value) || 0;
    const color = colorString(item.color, colorString(series[0]?.color, COLORS.palette[index % COLORS.palette.length]));
    elements.push(textBox(area.x + 100, rowY, area.w - 100, rowHeight * .42, item.label, 14, COLORS.foreground, 'right', true));
    elements.push(textBox(area.x, rowY, 92, rowHeight * .42, `${value}${isPercent ? '%' : ''}`, 14, COLORS.foreground, 'left', true));
    const trackY = rowY + rowHeight * .53;
    elements.push(rectangle(area.x, trackY, area.w, 10, COLORS.soft, 5));
    const fillW = Math.max(3, area.w * Math.max(0, value) / max);
    elements.push(rectangle(area.x + area.w - fillW, trackY, fillW, 10, color, 5, null, `bar-${index + 1}`));
  });
}

function renderLineChart(
  visual: Record<string, unknown>,
  elements: SlideElement[],
  frame: { x: number; y: number; w: number; h: number },
): void {
  const data = isRecord(visual.data) ? visual.data : {};
  const series = Array.isArray(data.series) ? data.series.filter(isRecord) : [];
  const parsed = series.map((item) => ({
    name: stringValue(item.name),
    color: colorString(item.color, ''),
    points: Array.isArray(item.points) ? item.points.filter(isRecord) : [],
  })).filter((item) => item.points.length > 0);
  if (!parsed.length) return;

  const captionSpace = visualCaption(visual.caption, elements, frame);
  const legendHeight = parsed.length > 1 ? 34 : 12;
  const axisLabelHeight = data.xAxisLabel ? 22 : 4;
  const area = {
    x: frame.x + 58,
    y: frame.y + 24 + legendHeight,
    w: frame.w - 84,
    h: frame.h - 58 - captionSpace - legendHeight - axisLabelHeight,
  };
  const allValues = parsed.flatMap((item) => item.points.map((point) => Number(point.y)).filter(Number.isFinite));
  const minValue = Math.min(0, ...allValues);
  const maxValue = Math.max(1, ...allValues);
  const valueSpan = Math.max(1, maxValue - minValue);
  const longest = Math.max(...parsed.map((item) => item.points.length));
  const xFor = (index: number, count: number) => area.x + (count <= 1 ? area.w / 2 : index * area.w / (count - 1));
  const yFor = (value: number) => area.y + area.h - (value - minValue) / valueSpan * area.h;

  for (let index = 0; index <= 4; index += 1) {
    const y = area.y + area.h * index / 4;
    const value = maxValue - valueSpan * index / 4;
    elements.push(shape(
      area.x,
      y,
      area.w,
      1,
      rectPath(area.w, 1),
      { type: 'solid', color: index === 4 ? COLORS.soft2 : COLORS.soft },
      null,
      null,
      `line-grid-${index}`,
    ));
    elements.push(textBox(frame.x + 10, y - 11, 42, 22, String(Math.round(value * 10) / 10), 10, COLORS.muted, 'left'));
  }

  parsed.forEach((item, seriesIndex) => {
    const color = item.color || COLORS.palette[seriesIndex % COLORS.palette.length];
    const points = item.points.map((point, pointIndex) => ({
      x: xFor(pointIndex, item.points.length),
      y: yFor(Number(point.y) || 0),
      label: stringValue(point.x),
    }));
    if (points.length > 1) {
      const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x - area.x} ${point.y - area.y}`).join(' ');
      elements.push(shape(
        area.x,
        area.y,
        area.w,
        area.h,
        path,
        null,
        { color, width: 3, dash: null, cap: 'round', join: 'round' },
        null,
        `line-series-${seriesIndex + 1}`,
      ));
    }
    points.forEach((point, pointIndex) => {
      elements.push(shape(
        point.x - 5,
        point.y - 5,
        10,
        10,
        'M 5 0 A 5 5 0 1 1 4.999 0 Z',
        { type: 'solid', color },
        { color: COLORS.background, width: 2, dash: null },
        null,
        `line-point-${seriesIndex + 1}-${pointIndex + 1}`,
      ));
    });
  });

  const labels = parsed.find((item) => item.points.length === longest)?.points ?? parsed[0].points;
  labels.forEach((point, index) => {
    const x = xFor(index, labels.length);
    elements.push(textBox(x - 38, area.y + area.h + 7, 76, 24, point.x, 10, COLORS.muted, 'center'));
  });
  if (data.xAxisLabel) elements.push(textBox(area.x, area.y + area.h + 28, area.w, 22, data.xAxisLabel, 10, COLORS.muted, 'center'));
  if (data.yAxisLabel) elements.push(textBox(frame.x + 4, frame.y + 8, 120, 22, data.yAxisLabel, 10, COLORS.muted, 'left'));

  if (parsed.length > 1) {
    parsed.forEach((item, index) => {
      const x = frame.x + frame.w - 28 - index * 124;
      elements.push(rectangle(x - 10, frame.y + 25, 10, 10, item.color || COLORS.palette[index % COLORS.palette.length], 5));
      elements.push(textBox(x - 112, frame.y + 17, 96, 26, item.name || `سری ${index + 1}`, 10, COLORS.foreground, 'right'));
    });
  }
}

function polar(cx: number, cy: number, radius: number, angle: number): [number, number] {
  return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
}

function donutPath(cx: number, cy: number, outer: number, inner: number, from: number, to: number): string {
  const span = to - from;
  if (span >= Math.PI * 2 - .0001) {
    return `M ${cx} ${cy - outer} A ${outer} ${outer} 0 1 1 ${cx - .01} ${cy - outer} Z M ${cx} ${cy - inner} A ${inner} ${inner} 0 1 0 ${cx - .01} ${cy - inner} Z`;
  }
  const large = span > Math.PI ? 1 : 0;
  const [x0o, y0o] = polar(cx, cy, outer, from);
  const [x1o, y1o] = polar(cx, cy, outer, to);
  const [x0i, y0i] = polar(cx, cy, inner, from);
  const [x1i, y1i] = polar(cx, cy, inner, to);
  return `M ${x0o} ${y0o} A ${outer} ${outer} 0 ${large} 1 ${x1o} ${y1o} L ${x1i} ${y1i} A ${inner} ${inner} 0 ${large} 0 ${x0i} ${y0i} Z`;
}

function renderPieChart(
  visual: Record<string, unknown>,
  elements: SlideElement[],
  frame: { x: number; y: number; w: number; h: number },
): void {
  const data = isRecord(visual.data) ? visual.data : {};
  const slices = Array.isArray(data.slices) ? data.slices.filter(isRecord) : [];
  if (!slices.length) return;
  const captionSpace = visualCaption(visual.caption, elements, frame);
  const contentH = frame.h - captionSpace;
  const size = Math.min(270, contentH - 42, frame.w * .54);
  const boxX = frame.x + 28;
  const boxY = frame.y + 18;
  const cx = size / 2;
  const cy = size / 2;
  const outer = size * .4;
  const inner = size * .24;
  const total = slices.reduce((sum, item) => sum + Math.max(0, Number(item.value) || 0), 0) || 1;
  let angle = -Math.PI / 2;
  slices.forEach((item, index) => {
    const next = angle + Math.max(0, Number(item.value) || 0) / total * Math.PI * 2;
    elements.push(shape(
      boxX,
      boxY,
      size,
      size,
      donutPath(cx, cy, outer, inner, angle, next),
      { type: 'solid', color: colorString(item.color, COLORS.palette[index % COLORS.palette.length]) },
      { color: COLORS.background, width: 2, dash: null },
      null,
      `pie-slice-${index + 1}`,
    ));
    angle = next;
  });
  const legendX = boxX + size + 10;
  const legendW = frame.x + frame.w - 22 - legendX;
  const rowHeight = Math.min(48, (contentH - 36) / slices.length);
  slices.forEach((item, index) => {
    const y = frame.y + 25 + rowHeight * index;
    elements.push(rectangle(legendX + legendW - 13, y + 13, 10, 10, colorString(item.color, COLORS.palette[index % COLORS.palette.length]), 5));
    elements.push(textBox(legendX + 52, y, legendW - 70, rowHeight, item.label, 12, COLORS.foreground, 'right'));
    elements.push(textBox(legendX, y, 50, rowHeight, `${stringValue(item.value)}%`, 12, COLORS.foreground, 'left', true));
  });
}

function renderGrid(
  visual: Record<string, unknown>,
  elements: SlideElement[],
  frame: { x: number; y: number; w: number; h: number },
  comparison: boolean,
): void {
  const data = isRecord(visual.data) ? visual.data : {};
  const columns = (comparison ? data.columns : data.headers);
  const headers = Array.isArray(columns) ? columns : [];
  const rows = Array.isArray(data.rows) ? data.rows.filter(Array.isArray) : [];
  if (!headers.length) return;
  const captionSpace = visualCaption(visual.caption, elements, frame);
  const table = { x: frame.x + 18, y: frame.y + 18, w: frame.w - 36, h: frame.h - 36 - captionSpace };
  const colW = table.w / headers.length;
  const rowH = table.h / Math.max(1, rows.length + 1);
  const cellStroke = { color: COLORS.soft2, width: 1, dash: null } satisfies Stroke;
  headers.forEach((header, index) => {
    const x = table.x + (headers.length - 1 - index) * colW;
    elements.push(shape(
      x, table.y, colW, rowH, rectPath(colW, rowH),
      { type: 'solid', color: COLORS.foreground },
      null,
      textBody(header, 14, COLORS.background, 'center', true),
      `grid-header-${index + 1}`,
    ));
  });
  rows.forEach((row, rowIndex) => {
    headers.forEach((_header, columnIndex) => {
      const x = table.x + (headers.length - 1 - columnIndex) * colW;
      const y = table.y + (rowIndex + 1) * rowH;
      const cell = row[columnIndex];
      const raw = stringValue(cell);
      const split = comparison ? raw.indexOf('::') : -1;
      const value = split === -1 ? raw : `${raw.slice(0, split).trim()}\n${raw.slice(split + 2).trim()}`;
      const last = rowIndex === rows.length - 1;
      elements.push(shape(
        x, y, colW, rowH, rectPath(colW, rowH),
        { type: 'solid', color: last && !comparison ? COLORS.soft : COLORS.background },
        cellStroke,
        textBody(value, comparison ? 12 : 13, COLORS.foreground, 'center', last && !comparison),
        `grid-cell-${rowIndex + 1}-${columnIndex + 1}`,
      ));
    });
  });
}

function applyElementOpacity(color: string, opacity: unknown): string {
  if (typeof opacity !== 'number' || !Number.isFinite(opacity) || opacity >= 1) return color;
  const alpha = Math.max(0, Math.min(1, opacity));
  const hex = color.trim().match(/^#([\\da-f]{3}|[\\da-f]{6})$/i);
  if (hex) {
    const raw = hex[1].length === 3 ? hex[1].split('').map((part) => part + part).join('') : hex[1];
    const red = parseInt(raw.slice(0, 2), 16);
    const green = parseInt(raw.slice(2, 4), 16);
    const blue = parseInt(raw.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }
  const rgb = color.match(/^rgba?\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)(?:\\s*,\\s*[\\d.]+)?\\s*\\)$/i);
  if (rgb) return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})`;
  return color;
}

function resolveDesignToken(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const raw = value.trim();
  if (raw === 'theme') return ACTIVE_THEME_TOKENS.background ?? fallback;
  if (!raw.startsWith('theme.')) return colorString(raw, fallback);
  const key = raw.slice('theme.'.length);
  const match = key.match(/^palette\.(\d+)$/);
  if (match) return COLORS.palette[Number(match[1])] ?? fallback;
  return ACTIVE_THEME_TOKENS[key] ?? fallback;
}

function renderShapeComposition(
  visual: Record<string, unknown>,
  elements: SlideElement[],
  frame: { x: number; y: number; w: number; h: number },
): void {
  const data = isRecord(visual.data) ? visual.data : {};
  if (!Array.isArray(data.elements)) return;
  const source = data.elements
    .map((element, index) => ({ element, index }))
    .filter((item) => isRecord(item.element))
    .sort((a, b) => {
      const az = typeof a.element.zIndex === 'number' ? a.element.zIndex : 0;
      const bz = typeof b.element.zIndex === 'number' ? b.element.zIndex : 0;
      return az - bz || a.index - b.index;
    });
  for (const { element: raw, index } of source) {
    const item = raw as Record<string, unknown>;
    const type = typeof item.type === 'string' ? item.type : '';
    const num = (key: string, fallback = 0) => typeof item[key] === 'number' && Number.isFinite(item[key]) ? Number(item[key]) : fallback;
    const rawX = num('x') * frame.w;
    const rawY = num('y') * frame.h;
    const rawW = num('w', 0.01) * frame.w;
    const rawH = num('h', 0.01) * frame.h;
    const isLinearShape = ['line', 'connector', 'arrow'].includes(type);
    // Line geometry describes a directed vector. Normalize its bounding box
    // for the shape API, while retaining the original signs for the path.
    const x = frame.x + (isLinearShape ? rawX + Math.min(0, rawW) : rawX);
    const y = frame.y + (isLinearShape ? rawY + Math.min(0, rawH) : rawY);
    const w = Math.max(1, (isLinearShape ? Math.abs(rawW) : rawW) || 0);
    const h = Math.max(1, (isLinearShape ? Math.abs(rawH) : rawH) || 0);
    const style = isRecord(item.style) ? item.style : {};
    const content = isRecord(item.content) ? item.content : {};
    const opacity = typeof style.opacity === 'number' ? Math.max(0, Math.min(1, style.opacity)) : 1;
    const fill = style.fill === 'none' ? 'none' : applyElementOpacity(resolveDesignToken(style.fill, COLORS.soft), opacity);
    const strokeColor = applyElementOpacity(resolveDesignToken(style.stroke, COLORS.foreground), opacity);
    const dashValue = Array.isArray(style.lineDash) ? style.lineDash : Array.isArray(style.dash) ? style.dash : null;
    const defaultsToStroke = type !== 'text' && (['line', 'connector', 'arrow', 'bracket', 'arc', 'ring'].includes(type) || style.fill === 'none');
    const hasStroke = typeof style.stroke === 'string' ? style.stroke !== 'none' : defaultsToStroke;
    const requestedStrokeWidth = typeof style.strokeWidth === 'number' && Number.isFinite(style.strokeWidth) && style.strokeWidth > 0
      ? Math.min(24, style.strokeWidth)
      : null;
    const stroke = hasStroke ? ({
      color: strokeColor,
      width: requestedStrokeWidth ?? (isLinearShape ? 2 : 1),
      dash: dashValue ? dashValue.map(Number).filter((n) => Number.isFinite(n) && n > 0) : null,
    } satisfies Stroke) : null;
    let path: string | null = rectPath(w, h);
    let shapeFill: Fill | null = style.fill === 'none' || type === 'line' || type === 'connector' || type === 'arrow' || type === 'bracket' || type === 'arc' ? null : { type: 'solid', color: fill };
    if (type === 'circle' || type === 'ellipse' || type === 'ring') {
      const rx = w / 2, ry = h / 2;
      path = `M ${rx} 0 A ${rx} ${ry} 0 1 0 ${rx} ${h} A ${rx} ${ry} 0 1 0 ${rx} 0 Z`;
      if (type === 'ring') shapeFill = null;
    } else if (type === 'rounded-rectangle' || type === 'pill') {
      const radius = typeof style.radius === 'number' ? Math.max(0, style.radius) : (type === 'pill' ? h / 2 : Math.min(18, h / 5));
      path = roundedRectPath(w, h, radius);
    } else if (type === 'triangle') {
      path = `M ${w / 2} 0 L ${w} ${h} L 0 ${h} Z`;
    } else if (type === 'diamond') {
      path = `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z`;
    } else if (type === 'line' || type === 'connector' || type === 'arrow') {
      const arrowEnd = type === 'arrow' || item.endArrow === true || style.endArrow === true;
      const startX = rawW === 0 ? w / 2 : rawW < 0 ? w : 0;
      const endX = rawW === 0 ? w / 2 : rawW < 0 ? 0 : w;
      const startY = rawH === 0 ? h / 2 : rawH < 0 ? h : 0;
      const endY = rawH === 0 ? h / 2 : rawH < 0 ? 0 : h;
      if (arrowEnd) {
        const angle = Math.atan2(endY - startY, endX - startX);
        const head = Math.min(14, Math.max(5, Math.min(w, h || w) * .18));
        const wing = Math.min(8, head * .65);
        const baseX = endX - Math.cos(angle) * head;
        const baseY = endY - Math.sin(angle) * head;
        const leftX = baseX + Math.cos(angle + Math.PI / 2) * wing;
        const leftY = baseY + Math.sin(angle + Math.PI / 2) * wing;
        const rightX = baseX + Math.cos(angle - Math.PI / 2) * wing;
        const rightY = baseY + Math.sin(angle - Math.PI / 2) * wing;
        path = `M ${startX} ${startY} L ${baseX} ${baseY} M ${leftX} ${leftY} L ${endX} ${endY} L ${rightX} ${rightY}`;
      } else {
        path = `M ${startX} ${startY} L ${endX} ${endY}`;
      }
      shapeFill = null;
    } else if (type === 'bracket') {
      const side = content.side === 'left' ? 'left' : content.side === 'top' ? 'top' : content.side === 'bottom' ? 'bottom' : 'right';
      path = side === 'left' ? 'M ' + w + ' 0 L 0 0 L 0 ' + h + ' L ' + w + ' ' + h : side === 'top' ? 'M 0 ' + h + ' L 0 0 L ' + w + ' 0 L ' + w + ' ' + h : side === 'bottom' ? 'M 0 0 L 0 ' + h + ' L ' + w + ' ' + h + ' L ' + w + ' 0' : 'M 0 0 L ' + w + ' 0 L ' + w + ' ' + h + ' L 0 ' + h;
      shapeFill = null;
    } else if (type === 'arc') {
      path = 'M ' + (w * .08) + ' ' + (h * .85) + ' A ' + (w * .42) + ' ' + (h * .75) + ' 0 0 1 ' + (w * .92) + ' ' + (h * .85);
      shapeFill = null;
    } else if (type === 'polygon' && Array.isArray(item.points)) {
      const points = item.points.filter((p): p is Record<string, unknown> => isRecord(p));
      if (points.length >= 3) path = points.map((p, i) => `${i ? 'L' : 'M'} ${(typeof p.x === 'number' ? p.x : 0) * w} ${(typeof p.y === 'number' ? p.y : 0) * h}`).join(' ') + ' Z';
    } else if (!SUPPORTED_COMPOSITION_SHAPE_TYPES.includes(type as typeof SUPPORTED_COMPOSITION_SHAPE_TYPES[number])) {
      // Validation normally prevents this. Keep a defensive guard for direct callers.
      continue;
    }
    const rawText = typeof content.text === 'string' ? content.text : typeof content.value === 'string' ? content.value : typeof item.text === 'string' ? item.text : '';
    const isText = type === 'text' || rawText.length > 0;
    const metadata = ACTIVE_PRESENTATION_META;
    const scale = typeof style.fontScale === 'number' && Number.isFinite(style.fontScale) ? style.fontScale : typeof metadata.fontScale === 'number' && Number.isFinite(metadata.fontScale) ? metadata.fontScale : 1;
    const fontSize = Math.max(6, (typeof style.fontSize === 'number' && Number.isFinite(style.fontSize) ? style.fontSize : 16) * scale);
    const text = isText ? textBody(rawText, fontSize,
      applyElementOpacity(resolveDesignToken(style.color, COLORS.foreground), opacity),
      style.textAlign === 'left' || style.textAlign === 'center' ? style.textAlign : 'right',
      style.fontWeight === 'bold' || (typeof style.fontWeight === 'number' && style.fontWeight >= 600),
      style.verticalAlign === 'top' ? 'top' : style.verticalAlign === 'bottom' ? 'bottom' : 'middle') : null;
    const shapeElement = shape(x, y, w, h, type === 'text' ? null : path, type === 'text' ? null : shapeFill, stroke, text, typeof item.id === 'string' ? item.id : `composition-element-${index}`);
    shapeElement.rot = num('rotation');
    elements.push(shapeElement);
  }
}

function addVisual(
  source: ReferenceSlideInput,
  elements: SlideElement[],
  frame: { x: number; y: number; w: number; h: number },
): void {
  if (!isRecord(source.visual)) return;
  const visual = source.visual;
  if (!hasValidVisual(visual)) return;
  addVisualFrame(elements, frame.x, frame.y, frame.w, frame.h);
  switch (visual.type) {
    case 'icon-list': renderIconList(visual, elements, frame); break;
    case 'bar-chart': renderBarChart(visual, elements, frame); break;
    case 'line-chart': renderLineChart(visual, elements, frame); break;
    case 'pie-chart': renderPieChart(visual, elements, frame); break;
    case 'comparison-grid': renderGrid(visual, elements, frame, true); break;
    case 'table': renderGrid(visual, elements, frame, false); break;
    case 'shape-composition': renderShapeComposition(visual, elements, frame); break;
  }
}

function contentSlide(source: ReferenceSlideInput, deck: ReferenceDeckInput): Slide {
  resolveSlideTheme(deck, source);
  const elements: SlideElement[] = [];
  const visual = isRecord(source.visual) ? source.visual : {};
  const data = isRecord(visual.data) ? visual.data : {};
  const canvas = isRecord(data.canvas) ? data.canvas : {};
  const layoutConfig = isRecord(source.layoutConfig) ? source.layoutConfig : {};
  const metadata = isRecord(deck.presentation) ? deck.presentation : {};
  const metadataCanvas = isRecord(metadata.canvas) ? metadata.canvas : {};
  const rootCanvas = isRecord(deck.canvas) ? deck.canvas : {};
  const fullscreen =
    ['graphic-fullscreen', 'full-bleed', 'shape-composition'].includes(String(source.layout)) ||
    layoutConfig.fullscreen === true ||
    canvas.fullscreen === true ||
    canvas.mode === 'fullscreen' ||
    metadataCanvas.fullscreen === true ||
    metadataCanvas.mode === 'fullscreen' ||
    rootCanvas.fullscreen === true ||
    rootCanvas.mode === 'fullscreen';
  if (fullscreen && visual.type === 'shape-composition') {
    renderShapeComposition(visual, elements, { x: 0, y: 0, w: ACTIVE_WIDTH, h: ACTIVE_HEIGHT });
    return {
      background: slideBackground(source, deck),
      elements,
      notes: detailsNotes(source),
      layoutName: 'Reference graphic fullscreen',
      transition: { type: 'fade', durationMs: 600 },
    };
  }
  const contentY = contentHeader(source, elements);
  const contentHeight = ACTIVE_HEIGHT - contentY - 54;
  if (slideHasValidVisual(source)) {
    const layout = String(source.layout ?? 'content');
    const side = layoutConfig.visualSide === 'right' || ['visual-right','image-led-right'].includes(layout) ? 'right' : 'left';
    const padding = typeof layoutConfig.padding === 'number' && Number.isFinite(layoutConfig.padding) ? Math.max(0, layoutConfig.padding) : 64;
    const gap = typeof layoutConfig.gap === 'number' && Number.isFinite(layoutConfig.gap) ? Math.max(0, layoutConfig.gap) : 38;
    const ratio = typeof layoutConfig.visualWidthRatio === 'number' && layoutConfig.visualWidthRatio > .1 && layoutConfig.visualWidthRatio < .9 ? layoutConfig.visualWidthRatio : layout === 'asymmetric-editorial' ? .56 : .48;
    const available = ACTIVE_WIDTH - padding * 2 - gap;
    const visualW = available * ratio;
    const bodyW = available - visualW;
    const visualX = side === 'left' ? padding : padding + bodyW + gap;
    const bodyX = side === 'left' ? padding + visualW + gap : padding;
    addBodyText(source, elements, { x: bodyX, y: contentY, w: bodyW, h: contentHeight });
    addVisual(source, elements, { x: visualX, y: contentY, w: visualW, h: contentHeight });
  } else {
    const padding = typeof layoutConfig.padding === 'number' && Number.isFinite(layoutConfig.padding) ? Math.max(0, layoutConfig.padding) : 64;
    addBodyText(source, elements, { x: padding, y: contentY, w: ACTIVE_WIDTH - padding * 2, h: contentHeight });
  }
  return {
    background: slideBackground(source, deck),
    elements: slideHasValidVisual(source) ? elements : filterEmptyPlaceholders(elements),
    notes: detailsNotes(source),
    layoutName: slideHasValidVisual(source) ? 'Reference content with visual' : 'Reference content',
    transition: { type: 'fade', durationMs: 600 },
  };
}

export function validateReferenceDeck(value: unknown): asserts value is ReferenceDeckInput {
  if (!isRecord(value)) throw new Error('فایل JSON معتبر نیست.');
  if (!Array.isArray(value.slides) || value.slides.length === 0) {
    throw new Error('کلید «slides» یافت نشد یا آرایه خالی است.');
  }
  const supportedShapeTypes = new Set<string>(SUPPORTED_COMPOSITION_SHAPE_TYPES);
  value.slides.forEach((slide, index) => {
    if (!isRecord(slide)) throw new Error(`اسلاید شماره ${index + 1} نامعتبر است.`);
    if (!slide.title && !slide.layout) {
      throw new Error(`اسلاید شماره ${index + 1} نه عنوان دارد و نه layout.`);
    }
    if (!isRecord(slide.visual) || slide.visual.type !== 'shape-composition') return;
    const data = isRecord(slide.visual.data) ? slide.visual.data : {};
    if (data.version !== 1) throw new Error(`نسخهٔ shape-composition در اسلاید ${index + 1} باید 1 باشد.`);
    if (!Array.isArray(data.elements)) throw new Error(`آرایهٔ elements در shape-composition اسلاید ${index + 1} معتبر نیست.`);
    const ids = new Set<string>();
    data.elements.forEach((element, elementIndex) => {
      if (!isRecord(element)) throw new Error(`عنصر ${elementIndex + 1} در اسلاید ${index + 1} نامعتبر است.`);
      if (typeof element.id !== 'string' || !element.id.trim()) throw new Error(`عنصر ${elementIndex + 1} در اسلاید ${index + 1} باید id داشته باشد.`);
      if (ids.has(element.id)) throw new Error(`شناسهٔ تکراری ${element.id} در اسلاید ${index + 1}.`);
      ids.add(element.id);
      if (typeof element.type !== 'string' || !supportedShapeTypes.has(element.type)) {
        throw new Error(`نوع شکل «${String(element.type)}» در اسلاید ${index + 1} پشتیبانی نمی‌شود.`);
      }
      const isLinearShape = ['line', 'connector', 'arrow'].includes(element.type);
      for (const key of ['x','y','w','h']) {
        const dimension = key === 'w' || key === 'h';
        const value = element[key];
        const valid = typeof value === 'number' && Number.isFinite(value)
          && (dimension
            ? (isLinearShape ? true : value > 0)
            : value >= 0 && value <= 1);
        if (!valid) throw new Error(`مقدار ${key} در عنصر ${element.id} نامعتبر است.`);
      }
      if ('style' in element && !isRecord(element.style)) throw new Error(`style عنصر ${element.id} باید یک شیء باشد.`);
      if ('content' in element && !isRecord(element.content)) throw new Error(`content عنصر ${element.id} باید یک شیء باشد.`);
    });
  });
}

export function isReferenceDeck(value: unknown): value is ReferenceDeckInput {
  if (!isRecord(value)) return false;
  // Canonical JSON shares presentation/slides fields but is still compiled through
  // the same visual renderer. Its root-level render contract must remain available.
  if ('presentation' in value) return true;
  if (value.source === 'ppt' || value.source === 'pptx' || 'width' in value || 'height' in value) return false;
  return true;
}

export function convertReferenceDeck(value: unknown): { presentation: Presentation; title: string } {
  validateReferenceDeck(value);
  const dimensions = dimensionsForDeck(value);
  ACTIVE_WIDTH = dimensions.width;
  ACTIVE_HEIGHT = dimensions.height;
  ACTIVE_PRESENTATION_META = isRecord(value.presentation) ? value.presentation : {};
  const sorted = value.slides.slice().sort((left, right) => {
    const leftOrder = typeof left.order === 'number' ? left.order : 0;
    const rightOrder = typeof right.order === 'number' ? right.order : 0;
    return leftOrder - rightOrder;
  });
  const slides = sorted.map((slide) => slide.layout === 'title' ? titleSlide(slide, value) : contentSlide(slide, value));
  const metadata = isRecord(value.presentation) ? value.presentation : {};
  return {
    title: plainReferenceText(metadata.title) || 'ارائه',
    presentation: {
      width: ACTIVE_WIDTH,
      height: ACTIVE_HEIGHT,
      source: 'ppt',
      slides,
    },
  };
}
