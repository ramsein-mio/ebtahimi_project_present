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
  it('resolves theme background and semantic palette tokens inside shape compositions', () => {
    const result = convertReferenceDeck({
      presentation: { title: 'Semantic tokens' },
      theme: {
        background: '#10131a',
        foreground: '#f5f7fa',
        surface: '#202633',
        border: '#3a4352',
        palette: ['#5b8def', '#f08a5d', '#52b788'],
      },
      slides: [{
        id: 'tokens-01', order: 1, layout: 'graphic-fullscreen', title: 'Tokens',
        visual: {
          type: 'shape-composition',
          data: {
            version: 1,
            canvas: { aspectRatio: '16:9', background: 'theme' },
            elements: [
              { id: 'primary', type: 'rectangle', x: 0.1, y: 0.1, w: 0.2, h: 0.2, style: { fill: 'theme.primary', stroke: 'none' } },
              { id: 'label', type: 'text', x: 0.1, y: 0.4, w: 0.4, h: 0.1, style: { fill: 'none', color: 'theme.text', fontSize: 18 }, content: { text: 'Readable label' } },
            ],
          },
        },
      }],
    });

    const slide = result.presentation.slides[0];
    expect(slide.background).toEqual({ type: 'solid', color: '#10131a' });
    const primary = slide.elements.find((element) => element.name === 'primary');
    expect(primary?.kind).toBe('shape');
    if (primary?.kind === 'shape' && primary.fill?.type === 'solid') {
      expect(primary.fill.color).toBe('#5b8def');
    } else {
      throw new Error('Primary theme token did not resolve to a filled shape');
    }
    const label = slide.elements.find((element) => element.name === 'label');
    expect(label?.kind).toBe('shape');
    if (label?.kind === 'shape') {
      expect(label.stroke).toBeNull();
      expect(label.text?.paragraphs[0].runs[0].color).toBe('#f5f7fa');
    }
  });

  it('honors fullscreen flags on the composition canvas even when layout is content', () => {
    const result = convertReferenceDeck({
      presentation: { title: 'Fullscreen flag' },
      slides: [{
        id: 'fullscreen-01', order: 1, layout: 'content', title: 'Composition',
        visual: {
          type: 'shape-composition',
          data: {
            version: 1,
            canvas: { fullscreen: true, background: 'theme' },
            elements: [{ id: 'canvas-shape', type: 'rectangle', x: 0, y: 0, w: 1, h: 1, style: { fill: '#123456', stroke: 'none' } }],
          },
        },
      }],
    });
    expect(result.presentation.slides[0].layoutName).toBe('Reference graphic fullscreen');
    expect(result.presentation.slides[0].elements).toHaveLength(1);
    expect(result.presentation.slides[0].elements[0]).toMatchObject({ x: 0, y: 0, w: 1280, h: 720 });
  });


  it('fits composition aspect ratios and applies safe-area insets', () => {
    const result = convertReferenceDeck({
      presentation: { title: 'Square canvas' },
      slides: [{
        id: 'square-01', order: 1, layout: 'graphic-fullscreen', title: 'Square',
        visual: {
          type: 'shape-composition',
          data: {
            version: 1,
            canvas: { width: 1000, height: 1000, safeArea: { top: 20, right: 20, bottom: 20, left: 20 } },
            elements: [{ id: 'full-canvas', type: 'rectangle', x: 0, y: 0, w: 1, h: 1, style: { fill: '#123456', stroke: 'none' } }],
          },
        },
      }],
    });

    const shape = result.presentation.slides[0].elements[0];
    expect(shape.x).toBeCloseTo(294.4, 4);
    expect(shape.y).toBeCloseTo(14.4, 4);
    expect(shape.w).toBeCloseTo(691.2, 4);
    expect(shape.h).toBeCloseTo(691.2, 4);
  });

  it('uses named themes while allowing presentation.design to override theme tokens', () => {
    const result = convertReferenceDeck({
      presentation: {
        title: 'Theme precedence',
        theme: 'ocean',
        design: {
          background: '#10131a',
          foreground: '#f5f7fa',
          palette: ['#123456', '#654321', '#abcdef'],
        },
      },
      slides: [{
        id: 'tokens-02', order: 1, layout: 'graphic-fullscreen', title: 'Tokens',
        visual: {
          type: 'shape-composition',
          data: {
            version: 1,
            canvas: { aspectRatio: '16:9', background: 'theme' },
            elements: [{ id: 'primary', type: 'rectangle', x: 0.1, y: 0.1, w: 0.2, h: 0.2, style: { fill: 'theme.primary', stroke: 'none' } }],
          },
        },
      }],
    });

    const slide = result.presentation.slides[0];
    expect(slide.background).toEqual({ type: 'solid', color: '#10131a' });
    const primary = slide.elements.find((element) => element.name === 'primary');
    expect(primary).toMatchObject({ kind: 'shape', fill: { type: 'solid', color: '#123456' } });
  });

  it('renders all aligned series in a multi-series bar chart', () => {
    const result = convertReferenceDeck({
      presentation: { title: 'Multi-series bars', direction: 'ltr', locale: 'en-US' },
      slides: [{
        id: 'bars-01', order: 1, section: 'Test', layout: 'content', title: 'Grouped values',
        body: { lead: 'Values by category', bullets: [], emphasis: '' },
        visual: {
          type: 'bar-chart',
          data: {
            unit: 'items',
            series: [
              { name: 'First', color: '#123456', values: [{ label: 'Q1', value: 10 }, { label: 'Q2', value: 20 }] },
              { name: 'Second', color: '#654321', values: [{ label: 'Q1', value: 15 }, { label: 'Q2', value: 25 }] },
            ],
          },
          caption: null,
        },
      }],
    });

    const bars = result.presentation.slides[0].elements.filter((element) =>
      element.kind === 'shape' && typeof element.name === 'string' && element.name.startsWith('bar-'),
    );
    expect(bars).toHaveLength(4);
  });

  it('places numeric line-chart X values proportionally instead of at equal category intervals', () => {
    const result = convertReferenceDeck({
      presentation: { title: 'Numeric X', locale: 'en-US' },
      slides: [{
        id: 'line-x-01', order: 1, section: 'Test', layout: 'content', title: 'Numeric scale',
        body: { lead: 'x values: 0, 10, 100', bullets: [], emphasis: '' },
        visual: {
          type: 'line-chart',
          data: { series: [{ name: 'Data', points: [{ x: 0, y: 1 }, { x: 10, y: 2 }, { x: 100, y: 3 }] }] },
          caption: null,
        },
      }],
    });

    const line = result.presentation.slides[0].elements.find((element) => element.name === 'line-series-1');
    expect(line?.kind).toBe('shape');
    const path = line && line.kind === 'shape' ? String((line as unknown as Record<string, unknown>).path ?? '') : '';
    const coordinates = path.match(/^M\s*([\d.]+)\s+([\d.]+)\s+L\s*([\d.]+)\s+([\d.]+)/);
    expect(coordinates).not.toBeNull();
    if (coordinates && line && line.kind === 'shape') {
      const firstX = Number(coordinates[1]);
      const secondX = Number(coordinates[3]);
      expect(firstX).toBeCloseTo(0);
      expect(secondX / line.w).toBeCloseTo(0.1, 2);
    }
  });


  it('does not draw a positive-length bar for a zero value', () => {
    const result = convertReferenceDeck({
      presentation: { title: 'Zero-value bar', locale: 'en-US' },
      slides: [{
        id: 'zero-bar-01', order: 1, section: 'Test', layout: 'content', title: 'Zero and ten',
        body: { lead: 'Values', bullets: [], emphasis: '' },
        visual: {
          type: 'bar-chart',
          data: { series: [{ values: [{ label: 'Zero', value: 0 }, { label: 'Ten', value: 10 }] }] },
          caption: null,
        },
      }],
    });
    const names = result.presentation.slides[0].elements
      .filter((element) => element.kind === 'shape')
      .map((element) => element.name);
    expect(names).not.toContain('bar-1');
    expect(names).toContain('bar-2');
  });

});
