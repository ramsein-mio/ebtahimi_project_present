import type { Fill, ShapeElement, Slide, TextBody, TextRun } from '@web-ppt/core';

export type BuiltInLayoutId = 'blank' | 'title-slide' | 'title-content' | 'two-columns' | 'section-header';

export interface BuiltInLayout {
  id: BuiltInLayoutId;
  name: string;
  description: string;
}

export const BUILT_IN_LAYOUTS: BuiltInLayout[] = [
  { id: 'blank', name: 'Blank', description: 'An empty canvas with no placeholders' },
  { id: 'title-slide', name: 'Title Slide', description: 'Centered title and subtitle' },
  { id: 'title-content', name: 'Title and Content', description: 'Title with a single content area' },
  { id: 'two-columns', name: 'Two Columns', description: 'Title with two equal content areas' },
  { id: 'section-header', name: 'Section Header', description: 'Large section title and supporting line' },
];

export const LAYOUT_ELEMENT_PREFIX = 'pardis-layout:';

function run(text: string, size: number, color: string, bold = false): TextRun {
  return {
    text,
    b: bold,
    i: false,
    u: false,
    strike: false,
    size,
    color,
    fonts: ['Vazirmatn', 'Arial'],
  };
}

function textBody(text: string, size: number, color: string, align: 'left' | 'center' | 'right', bold = false): TextBody {
  return {
    anchor: 'middle',
    insets: [8, 12, 8, 12],
    wrap: true,
    fontScale: 1,
    paragraphs: [{
      align,
      lvl: 0,
      marL: 0,
      indent: 0,
      bullet: null,
      lineHeight: 2.0,
      spaceBefore: 0,
      spaceAfter: 0,
      runs: [run(text, size, color, bold)],
    }],
  };
}

function placeholder(
  role: string,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  size: number,
  align: 'left' | 'center' | 'right' = 'left',
  bold = false,
): ShapeElement {
  return {
    kind: 'shape',
    name: `${LAYOUT_ELEMENT_PREFIX}${role}`,
    x,
    y,
    w,
    h,
    rot: 0,
    flipH: false,
    flipV: false,
    path: null,
    fill: null,
    stroke: null,
    text: textBody(text, size, '#282331', align, bold),
  };
}

export function layoutElements(layoutId: BuiltInLayoutId, width: number, height: number): ShapeElement[] {
  const marginX = width * .075;
  const contentWidth = width - marginX * 2;
  if (layoutId === 'blank') return [];
  if (layoutId === 'title-slide') {
    return [
      placeholder('title', width * .13, height * .29, width * .74, height * .18, 'Click to add title', height * .075, 'center', true),
      placeholder('subtitle', width * .19, height * .5, width * .62, height * .1, 'Click to add subtitle', height * .034, 'center'),
    ];
  }
  if (layoutId === 'title-content') {
    return [
      placeholder('title', marginX, height * .06, contentWidth, height * .12, 'Click to add title', height * .057, 'left', true),
      placeholder('content', marginX, height * .22, contentWidth, height * .66, 'Click to add content', height * .034),
    ];
  }
  if (layoutId === 'two-columns') {
    const gap = width * .035;
    const columnWidth = (contentWidth - gap) / 2;
    return [
      placeholder('title', marginX, height * .06, contentWidth, height * .12, 'Click to add title', height * .057, 'left', true),
      placeholder('left-content', marginX, height * .23, columnWidth, height * .63, 'Click to add content', height * .032),
      placeholder('right-content', marginX + columnWidth + gap, height * .23, columnWidth, height * .63, 'Click to add content', height * .032),
    ];
  }
  return [
    placeholder('section-title', marginX, height * .29, contentWidth, height * .19, 'Click to add section title', height * .07, 'left', true),
    placeholder('section-subtitle', marginX, height * .5, contentWidth * .72, height * .11, 'Click to add supporting text', height * .032),
  ];
}

export function applyBuiltInLayout(slide: Slide, layoutId: BuiltInLayoutId, width: number, height: number): Slide {
  const userElements = slide.elements.filter((element) => !element.name?.startsWith(LAYOUT_ELEMENT_PREFIX));
  const layout = BUILT_IN_LAYOUTS.find((item) => item.id === layoutId)!;
  return {
    ...slide,
    layoutName: layout.name,
    elements: [...userElements, ...layoutElements(layoutId, width, height)],
  };
}

export function createBlankSlide(background: Fill | null = { type: 'solid', color: '#ffffff' }): Slide {
  return {
    background: structuredClone(background),
    elements: [],
    notes: '',
    layoutName: 'Blank',
  };
}

export function builtInLayoutIdForSlide(slide: Slide): BuiltInLayoutId | null {
  const match = BUILT_IN_LAYOUTS.find((layout) => layout.name === slide.layoutName);
  return match?.id ?? null;
}
