/**
 * Single source of truth for the shapes and style fields understood by the
 * shape-composition renderer. Keep this in sync with prompts/shared-json-contract.md.
 */
export const SUPPORTED_COMPOSITION_SHAPE_TYPES = [
  'rectangle',
  'rounded-rectangle',
  'pill',
  'circle',
  'ellipse',
  'ring',
  'triangle',
  'diamond',
  'line',
  'connector',
  'arrow',
  'polygon',
  'text',
  'bracket',
  'arc',
] as const;

export const COMPOSITION_ELEMENT_KEYS = [
  'id',
  'type',
  'x',
  'y',
  'w',
  'h',
  'rotation',
  'zIndex',
  'style',
  'content',
  'points',
] as const;

export const COMPOSITION_STYLE_KEYS = [
  'fill',
  'stroke',
  'strokeWidth',
  'fontSize',
  'color',
  'textAlign',
  'fontWeight',
  'opacity',
  'verticalAlign',
  'radius',
  'lineDash',
  'dash',
  'endArrow',
  'fontScale',
] as const;

export const COMPOSITION_CONTENT_KEYS = ['text', 'value', 'side'] as const;
