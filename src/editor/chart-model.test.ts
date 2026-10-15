import { describe, expect, it } from 'vitest';
import { renderSlideToSvg, type Presentation } from '@web-ppt/core';
import { chartDataFromElement, createChartElement, defaultChartData, isChartElement, updateChartElement } from './chart-model';

describe('structured chart model', () => {
  it('stores editable chart data on a grouped slide object', () => {
    const data = defaultChartData('bar');
    const chart = createChartElement(data, 100, 120, 640, 360);
    expect(isChartElement(chart)).toBe(true);
    expect(chartDataFromElement(chart)).toEqual(data);
    expect(chart.children.length).toBeGreaterThan(1);
  });

  it('supports every chart type and preserves its frame when data changes', () => {
    for (const type of ['bar', 'line', 'pie', 'doughnut', 'area'] as const) {
      const chart = createChartElement(defaultChartData(type), 10, 20, 300, 200);
      const changed = updateChartElement(chart, { ...defaultChartData(type), title: 'Updated title' });
      expect(chartDataFromElement(changed)?.title).toBe('Updated title');
      expect([changed.x, changed.y, changed.w, changed.h]).toEqual([10, 20, 300, 200]);
    }
  });

  it('renders chart groups as visible SVG content instead of an empty frame', () => {
    for (const type of ['bar', 'line', 'pie', 'doughnut', 'area'] as const) {
      const presentation: Presentation = {
        width: 1280,
        height: 720,
        source: 'ppt',
        slides: [{
          background: { type: 'solid', color: '#ffffff' },
          elements: [createChartElement(defaultChartData(type), 100, 100, 700, 420)],
        }],
      };
      const markup = renderSlideToSvg(presentation, presentation.slides[0], { idPrefix: `chart-${type}-`, textMode: 'svg' });
      expect(markup).not.toContain('data-render-error');
      expect((markup.match(/<path /g) ?? []).length).toBeGreaterThan(type === 'bar' ? 5 : 1);
    }
  });
});
