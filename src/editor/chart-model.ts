import { arc, area, line, pie, type PieArcDatum } from 'd3-shape';
import type { Fill, GroupElement, ShapeElement, TextBody, TextRun } from '@web-ppt/core';

export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'area';

export interface ChartSeries {
  name: string;
  color: string;
  values: number[];
}

export interface ChartData {
  version: 1;
  type: ChartType;
  title: string;
  showLegend: boolean;
  labels: string[];
  series: ChartSeries[];
}

const CHART_PREFIX = 'pardis-chart:';
const PALETTE = ['#7257ff', '#ff4fbd', '#24b889', '#ff9f43', '#3d78e8', '#9b59b6'];

function run(text: string, size: number, color: string, bold = false): TextRun {
  return { text, size, color, b: bold, i: false, u: false, strike: false, fonts: ['Inter', 'Vazirmatn', 'Arial'] };
}

function body(text: string, size: number, color: string, align: 'left' | 'center' | 'right' = 'left', bold = false): TextBody {
  return {
    anchor: 'middle', insets: [2, 3, 2, 3], wrap: true, fontScale: 1,
    paragraphs: [{ align, lvl: 0, marL: 0, indent: 0, bullet: null, lineHeight: 1.1, spaceBefore: 0, spaceAfter: 0, runs: [run(text, size, color, bold)] }],
  };
}

function shape(x: number, y: number, w: number, h: number, path: string | null, fill: Fill | null, text: TextBody | null = null): ShapeElement {
  return { kind: 'shape', x, y, w, h, rot: 0, flipH: false, flipV: false, path, fill, stroke: null, text };
}

function rect(x: number, y: number, w: number, h: number, color: string): ShapeElement {
  return shape(x, y, w, h, `M 0 0 H ${w} V ${h} H 0 Z`, { type: 'solid', color });
}

function text(x: number, y: number, w: number, h: number, value: string, size: number, color: string, align: 'left' | 'center' | 'right' = 'left', bold = false): ShapeElement {
  return shape(x, y, w, h, null, null, body(value, size, color, align, bold));
}

function pathShape(path: string, color: string, width = 2, fill: Fill | null = null): ShapeElement {
  return {
    kind: 'shape', x: 0, y: 0, w: 1, h: 1, rot: 0, flipH: false, flipV: false,
    path, fill, stroke: { color, width, dash: null, cap: 'round', join: 'round' }, text: null, openGeom: fill === null,
  };
}

export function defaultChartData(type: ChartType = 'bar'): ChartData {
  return {
    version: 1,
    type,
    title: 'Quarterly performance',
    showLegend: true,
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    series: [
      { name: 'Product A', color: PALETTE[0], values: [32, 46, 58, 72] },
      { name: 'Product B', color: PALETTE[1], values: [24, 38, 49, 63] },
    ],
  };
}

export function encodeChartData(data: ChartData): string {
  return `${CHART_PREFIX}${encodeURIComponent(JSON.stringify(data))}`;
}

export function chartDataFromElement(element: GroupElement): ChartData | null {
  if (!element.name?.startsWith(CHART_PREFIX)) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(element.name.slice(CHART_PREFIX.length))) as ChartData;
    return parsed?.version === 1 && Array.isArray(parsed.labels) && Array.isArray(parsed.series) ? parsed : null;
  } catch {
    return null;
  }
}

export function isChartElement(element: unknown): element is GroupElement {
  return Boolean(element && typeof element === 'object' && (element as GroupElement).kind === 'group' && chartDataFromElement(element as GroupElement));
}

function chartChildren(data: ChartData, width: number, height: number): ShapeElement[] {
  const output: ShapeElement[] = [rect(0, 0, width, height, '#ffffff')];
  const titleHeight = height * .13;
  const legendHeight = data.showLegend ? height * .13 : height * .05;
  const plot = { x: width * .11, y: titleHeight + height * .04, w: width * .82, h: height - titleHeight - legendHeight - height * .08 };
  output.push(text(width * .04, height * .025, width * .92, titleHeight, data.title, Math.max(14, height * .06), '#292331', 'left', true));
  const values = data.series.flatMap((series) => series.values).filter(Number.isFinite);
  const max = Math.max(1, ...values);

  if (data.type === 'bar') {
    const groups = Math.max(1, data.labels.length);
    const seriesCount = Math.max(1, data.series.length);
    const slot = plot.w / groups;
    const barWidth = slot * .68 / seriesCount;
    data.labels.forEach((label, labelIndex) => {
      data.series.forEach((series, seriesIndex) => {
        const value = Math.max(0, Number(series.values[labelIndex]) || 0);
        const h = plot.h * value / max;
        output.push(rect(plot.x + labelIndex * slot + slot * .16 + seriesIndex * barWidth, plot.y + plot.h - h, Math.max(3, barWidth - 3), h, series.color));
      });
      output.push(text(plot.x + labelIndex * slot, plot.y + plot.h + 4, slot, height * .055, label, Math.max(8, height * .027), '#716a78', 'center'));
    });
  } else if (data.type === 'line' || data.type === 'area') {
    const x = (index: number) => plot.x + (data.labels.length <= 1 ? plot.w / 2 : index * plot.w / (data.labels.length - 1));
    const y = (value: number) => plot.y + plot.h - Math.max(0, value) / max * plot.h;
    data.series.forEach((series) => {
      const points = data.labels.map((_, index) => [x(index), y(Number(series.values[index]) || 0)] as [number, number]);
      if (data.type === 'area') {
        const areaPath = area<[number, number]>().x((point) => point[0]).y0(plot.y + plot.h).y1((point) => point[1])(points);
        if (areaPath) output.push(pathShape(areaPath, series.color, 1.5, { type: 'solid', color: `${series.color}33` }));
      }
      const linePath = line<[number, number]>().x((point) => point[0]).y((point) => point[1])(points);
      if (linePath) output.push(pathShape(linePath, series.color, 3));
      points.forEach((point) => output.push(shape(point[0] - 4, point[1] - 4, 8, 8, 'M 4 0 A 4 4 0 1 1 3.999 0 Z', { type: 'solid', color: series.color })));
    });
    data.labels.forEach((label, index) => output.push(text(x(index) - 34, plot.y + plot.h + 4, 68, height * .055, label, Math.max(8, height * .027), '#716a78', 'center')));
  } else {
    const series = data.series[0] ?? { values: [], color: PALETTE[0], name: '' };
    const sum = series.values.reduce((total, value) => total + Math.max(0, Number(value) || 0), 0) || 1;
    const arcs = pie<number>().sort(null).value((value) => Math.max(0, value))(series.values);
    const radius = Math.min(plot.w, plot.h) * .43;
    const generator = arc<PieArcDatum<number>>()
      .innerRadius(data.type === 'doughnut' ? radius * .55 : 0)
      .outerRadius(radius);
    arcs.forEach((segment, index) => {
      const d = generator(segment);
      if (!d) return;
      output.push({
        ...pathShape(d, '#ffffff', 1, { type: 'solid', color: PALETTE[index % PALETTE.length] }),
        x: plot.x + plot.w / 2,
        y: plot.y + plot.h / 2,
        w: radius * 2,
        h: radius * 2,
      });
    });
    if (data.type === 'doughnut') output.push(text(plot.x + plot.w / 2 - radius * .45, plot.y + plot.h / 2 - height * .04, radius * .9, height * .08, String(Math.round(sum)), height * .045, '#292331', 'center', true));
  }

  if (data.showLegend) {
    const y = height - legendHeight * .7;
    data.series.forEach((series, index) => {
      const x = width * .08 + index * Math.min(width * .3, 150);
      output.push(rect(x, y + 4, 10, 10, series.color));
      output.push(text(x + 15, y, Math.min(width * .25, 125), 20, series.name, Math.max(8, height * .027), '#625b69'));
    });
  }
  return output;
}

export function createChartElement(data: ChartData, x: number, y: number, width: number, height: number): GroupElement {
  return {
    kind: 'group',
    name: encodeChartData(data),
    x,
    y,
    w: width,
    h: height,
    rot: 0,
    flipH: false,
    flipV: false,
    childX: 0,
    childY: 0,
    scaleX: 1,
    scaleY: 1,
    children: chartChildren(data, width, height),
  };
}

export function updateChartElement(element: GroupElement, data: ChartData): GroupElement {
  return {
    ...createChartElement(data, element.x, element.y, element.w, element.h),
    rot: element.rot,
    flipH: element.flipH,
    flipV: element.flipV,
  };
}
