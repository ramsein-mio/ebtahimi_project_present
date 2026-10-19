import { describe, expect, it } from 'vitest';
import { convertReferenceDeck } from './deck-json';

describe('shared JSON render contract', () => {
  it('uses the declared canvas dimensions and slide background for fullscreen compositions', () => {
    const result = convertReferenceDeck({
      presentation: { title: 'Contract test' },
      canvas: { width: 1000, aspectRatio: '2:1' },
      slides: [{
        id: 'graphic-01',
        order: 1,
        layout: 'graphic-fullscreen',
        title: 'Graphic',
        background: '#123456',
        visual: {
          type: 'shape-composition',
          data: {
            version: 1,
            elements: [{
              id: 'hero-block',
              type: 'rectangle',
              x: 0.1, y: 0.2, w: 0.3, h: 0.4,
              zIndex: 1,
              style: { fill: '#ff0000', stroke: 'none' },
            }],
          },
        },
      }],
    });

    expect(result.presentation.width).toBe(1000);
    expect(result.presentation.height).toBe(500);
    expect(result.presentation.slides).toHaveLength(1);
    const slide = result.presentation.slides[0];
    expect(slide.background).toEqual({ type: 'solid', color: '#123456' });
    expect(slide.layoutName).toBe('Reference graphic fullscreen');
    expect(slide.elements).toHaveLength(1);
    expect(slide.elements[0]).toMatchObject({ x: 100, y: 100, w: 300, h: 200 });
  });

  it('accepts zero-height horizontal lines and renders them as line elements', () => {
    const result = convertReferenceDeck({
      presentation: { title: 'Line geometry test' },
      slides: [{
        id: 'line-01', order: 1, layout: 'graphic-fullscreen', title: 'Line',
        visual: {
          type: 'shape-composition',
          data: {
            version: 1,
            elements: [{
              id: 'horizontal-line', type: 'line',
              x: 0.08, y: 0.72, w: 0.42, h: 0,
              rotation: 0, zIndex: 3,
              style: { fill: 'none', stroke: '#F2C14E', strokeWidth: 3 },
              content: {},
            }],
          },
        },
      }],
    });

    expect(result.presentation.slides[0].elements).toHaveLength(1);
    expect(result.presentation.slides[0].elements[0]).toMatchObject({
      x: 102.4, y: 518.4, w: 537.6, h: 1,
      name: 'horizontal-line',
    });
  });

  it('applies the shared theme background when the slide has no override', () => {
    const result = convertReferenceDeck({
      presentation: { title: 'Theme test' },
      theme: {
        background: '#10131a',
        foreground: '#f5f7fa',
        palette: ['#5b8def', '#f08a5d'],
      },
      slides: [{
        id: 'slide-01',
        order: 1,
        layout: 'content',
        title: 'Theme',
        body: { lead: 'Lead', bullets: [], emphasis: '' },
        visual: { type: 'none', data: {}, caption: null },
      }],
    });

    expect(result.presentation.slides[0].background).toEqual({
      type: 'solid',
      color: '#10131a',
    });
  });
});
