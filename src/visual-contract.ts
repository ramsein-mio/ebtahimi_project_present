/**
 * Central registry of visual types that have both a validator contract and a
 * renderer in deck-json.ts. Add a visual here only when its schema and renderer
 * are implemented together.
 */
export const VISUAL_RENDERER_REGISTRY = {
  none: {
    dataKeys: [],
    requiredDataKeys: [],
  },
  'icon-list': {
    dataKeys: ['items'],
    requiredDataKeys: ['items'],
  },
  'bar-chart': {
    dataKeys: ['series', 'xAxisLabel', 'yAxisLabel', 'unit'],
    requiredDataKeys: ['series'],
  },
  'line-chart': {
    dataKeys: ['series', 'xAxisLabel', 'yAxisLabel'],
    requiredDataKeys: ['series'],
  },
  'pie-chart': {
    dataKeys: ['slices', 'unit'],
    requiredDataKeys: ['slices'],
  },
  'comparison-grid': {
    dataKeys: ['columns', 'rows'],
    requiredDataKeys: ['columns', 'rows'],
  },
  table: {
    dataKeys: ['headers', 'rows'],
    requiredDataKeys: ['headers', 'rows'],
  },
  'shape-composition': {
    dataKeys: ['version', 'canvas', 'elements'],
    requiredDataKeys: ['version', 'elements'],
  },
} as const;

export type SupportedVisualType = keyof typeof VISUAL_RENDERER_REGISTRY;
export const SUPPORTED_VISUAL_TYPES = Object.keys(
  VISUAL_RENDERER_REGISTRY,
) as SupportedVisualType[];

export function isSupportedVisualType(value: unknown): value is SupportedVisualType {
  return typeof value === 'string'
    && Object.prototype.hasOwnProperty.call(VISUAL_RENDERER_REGISTRY, value);
}
