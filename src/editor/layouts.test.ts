import { describe, expect, it } from 'vitest';
import { applyBuiltInLayout, BUILT_IN_LAYOUTS, createBlankSlide, layoutElements } from './layouts';
import type { Slide } from '@web-ppt/core';

describe('built-in slide layouts', () => {
  it('provides the five required layout choices', () => {
    expect(BUILT_IN_LAYOUTS.map((layout) => layout.name)).toEqual([
      'Blank', 'Title Slide', 'Title and Content', 'Two Columns', 'Section Header',
    ]);
  });

  it('creates a blank slide without elements', () => {
    const slide = createBlankSlide();
    expect(slide.elements).toEqual([]);
    expect(slide.layoutName).toBe('Blank');
  });

  it('does not add placeholders for the Blank layout', () => {
    expect(layoutElements('blank', 1280, 720)).toEqual([]);
  });

  it('replaces generated placeholders while preserving user elements', () => {
    const userElement = { kind: 'shape', x: 1, y: 2, w: 30, h: 40, rot: 0, flipH: false, flipV: false, path: null, fill: null, stroke: null, text: null, name: 'My user shape' } as const;
    const slide = {
      background: { type: 'solid', color: '#ffffff' },
      elements: [userElement],
      layoutName: 'Blank',
    } as unknown as Slide;
    const titled = applyBuiltInLayout(slide, 'title-content', 1280, 720);
    expect(titled.elements[0]).toBe(userElement);
    expect(titled.elements.some((element) => element.name?.startsWith('pardis-layout:'))).toBe(true);
    const blank = applyBuiltInLayout(titled, 'blank', 1280, 720);
    expect(blank.elements).toEqual([userElement]);
  });
});
