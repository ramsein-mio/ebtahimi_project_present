import { describe, expect, it } from 'vitest';
import { parseCanonicalPresentation, validateCanonicalPresentation } from './canonical-presentation';

const slide = {
  id: 'slide-01', order: 1, section: 'Introduction', layout: 'content',
  title: 'مقدمه', subtitle: null,
  body: { lead: 'مفهوم اصلی', bullets: [{ text: 'نکته', details: 'توضیح کامل\n\nمنبع: https://example.com' }], emphasis: '' },
  visual: { type: 'none', data: {}, caption: null },
  speakerNotes: '', durationSeconds: 40, psychologicalPurpose: 'orient',
  cognitiveLoad: 'low', sourceReference: '',
};
const valid = {
  presentation: {
    title: 'نمونه', subtitle: null, language: 'fa', theme: 'modern',
    targetAudience: 'students', estimatedTotalDurationSeconds: 40,
    learningObjectives: ['هدف'], coverageChecklist: [{ item: 'مفهوم', slideIds: ['slide-01'] }],
    teachingRoadmap: [{ section: 'شروع', slideIds: ['slide-01'], purpose: 'آشنایی' }],
  },
  slides: [slide], recapSlides: [{ afterSlideId: 'slide-01', type: 'retrieval', prompt: 'چه چیزی یاد گرفتید؟' }],
};

describe('canonical presentation contract', () => {
  it('accepts the shared root contract and preserves Persian rich-text details and metadata', () => {
    const result = validateCanonicalPresentation(valid);
    expect(result.valid).toBe(true);
    expect(result.value?.slides[0].body.bullets[0]).toEqual(slide.body.bullets[0]);
    expect(result.value?.presentation.teachingRoadmap[0].purpose).toBe('آشنایی');
    expect(result.value?.recapSlides[0].prompt).toBe('چه چیزی یاد گرفتید؟');
  });

  it('reports JSON syntax errors with a useful path', () => {
    const result = parseCanonicalPresentation('{"presentation":');
    expect(result.valid).toBe(false);
    expect(result.errors[0].path).toBe('$');
    expect(result.errors[0].expected).toBe('valid JSON');
  });

  it('rejects extra root keys and missing required root keys', () => {
    const extra = validateCanonicalPresentation({ ...valid, mode: 'teaching' });
    expect(extra.errors.some((issue) => issue.path === 'mode')).toBe(true);
    const missing = validateCanonicalPresentation({ presentation: valid.presentation, slides: valid.slides });
    expect(missing.errors.some((issue) => issue.path === 'recapSlides')).toBe(true);
  });

  it('rejects invalid rich text, duplicate IDs, and invalid cognitive load', () => {
    const result = validateCanonicalPresentation({
      ...valid,
      slides: [
        { ...slide, body: { ...slide.body, bullets: [{ text: 'x', details: '' }] } },
        { ...slide, cognitiveLoad: 'extreme' },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((issue) => issue.path === 'slides[0].body.bullets[0].details')).toBe(true);
    expect(result.errors.some((issue) => issue.path === 'slides[1].id')).toBe(true);
    expect(result.errors.some((issue) => issue.path === 'slides[1].cognitiveLoad')).toBe(true);
  });

  it('validates references from recap, coverage, and roadmap', () => {
    const result = validateCanonicalPresentation({
      ...valid,
      presentation: {
        ...valid.presentation,
        coverageChecklist: [{ item: 'x', slideIds: ['missing'] }],
        teachingRoadmap: [{ section: 'x', slideIds: ['also-missing'], purpose: 'x' }],
      },
      recapSlides: [{ afterSlideId: 'absent', type: 'quiz', prompt: '' }],
    });
    expect(result.errors.some((issue) => issue.path.includes('coverageChecklist[0].slideIds[0]'))).toBe(true);
    expect(result.errors.some((issue) => issue.path.includes('teachingRoadmap[0].slideIds[0]'))).toBe(true);
    expect(result.errors.some((issue) => issue.path === 'recapSlides[0].type')).toBe(true);
    expect(result.errors.some((issue) => issue.path === 'recapSlides[0].afterSlideId')).toBe(true);
  });

  it('allows zero height only for line-like elements', () => {
    const horizontalLine = {
      version: 1,
      elements: [{ id: 'line-01', type: 'line', x: 0.08, y: 0.72, w: 0.42, h: 0, style: {} }],
    };
    const accepted = validateCanonicalPresentation({
      ...valid,
      slides: [{ ...slide, visual: { type: 'shape-composition', data: horizontalLine, caption: null } }],
    });
    expect(accepted.errors.some((issue) => issue.path.endsWith('elements[0].h'))).toBe(false);

    const invalidRectangle = {
      version: 1,
      elements: [{ id: 'rectangle-01', type: 'rectangle', x: 0.08, y: 0.72, w: 0.42, h: 0, style: {} }],
    };
    const rejected = validateCanonicalPresentation({
      ...valid,
      slides: [{ ...slide, visual: { type: 'shape-composition', data: invalidRectangle, caption: null } }],
    });
    expect(rejected.errors.some((issue) => issue.path.endsWith('elements[0].h'))).toBe(true);
  });

  it('accepts signed dimensions for line-like shapes but rejects them for area shapes', () => {
    const signedLine = {
      version: 1,
      elements: [{ id: 'line-negative-height', type: 'line', x: 0.1, y: 0.8, w: 0.8, h: -0.6, style: {} }],
    };
    const accepted = validateCanonicalPresentation({
      ...valid,
      slides: [{ ...slide, visual: { type: 'shape-composition', data: signedLine, caption: null } }],
    });
    expect(accepted.errors.some((issue) => issue.path.endsWith('elements[0].h'))).toBe(false);
    expect(accepted.valid).toBe(true);

    const signedRectangle = {
      version: 1,
      elements: [{ id: 'rectangle-negative-height', type: 'rectangle', x: 0.1, y: 0.2, w: 0.4, h: -0.3, style: {} }],
    };
    const rejected = validateCanonicalPresentation({
      ...valid,
      slides: [{ ...slide, visual: { type: 'shape-composition', data: signedRectangle, caption: null } }],
    });
    expect(rejected.errors.some((issue) => issue.path.endsWith('elements[0].h'))).toBe(true);
  });

  it('validates normalized shape-composition geometry and duplicate element IDs', () => {
    const composition = {
      version: 1, canvas: { aspectRatio: '16:9', background: 'theme' },
      elements: [
        { id: 'shape-a', type: 'rectangle', x: 0.1, y: 0.1, w: 0.4, h: 0.3 },
        { id: 'shape-a', type: 'circle', x: 1.2, y: 0.2, w: -1, h: 0.3 },
      ],
    };
    const result = validateCanonicalPresentation({
      ...valid,
      slides: [{ ...slide, visual: { type: 'shape-composition', data: composition, caption: null } }],
    });
    expect(result.errors.some((issue) => issue.path.endsWith('elements[1].id'))).toBe(true);
    expect(result.errors.some((issue) => issue.path.endsWith('elements[1].x'))).toBe(true);
    expect(result.errors.some((issue) => issue.path.endsWith('elements[1].w'))).toBe(true);
  });
  it('rejects shape types that the renderer cannot faithfully draw', () => {
    const result = validateCanonicalPresentation({
      ...valid,
      slides: [{
        ...slide,
        visual: {
          type: 'shape-composition',
          caption: null,
          data: { version: 1, elements: [{ id: 'image-a', type: 'image', x: 0.1, y: 0.1, w: 0.3, h: 0.3 }] },
        },
      }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((issue) => issue.path.endsWith('elements[0].type'))).toBe(true);
  });

  it('rejects visual types that have no registered renderer', () => {
    const result = validateCanonicalPresentation({
      ...valid,
      slides: [{ ...slide, visual: { type: 'timeline', data: {}, caption: null } }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((issue) => issue.path === 'slides[0].visual.type')).toBe(true);
  });

  it('rejects undeclared shape-composition data fields', () => {
    const result = validateCanonicalPresentation({
      ...valid,
      slides: [{
        ...slide,
        visual: {
          type: 'shape-composition',
          caption: null,
          data: { version: 1, elements: [], accidentalField: true },
        },
      }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((issue) => issue.path === 'slides[0].visual.data.accidentalField')).toBe(true);
  });


  it('accepts the graphic style fields emitted by the design prompt', () => {
    const composition = {
      version: 1,
      canvas: { aspectRatio: '16:9', background: 'theme' },
      elements: [
        { id: 'title', type: 'text', x: 0.1, y: 0.2, w: 0.8, h: 0.2, style: { fontSize: 0.09, fontWeight: 700, color: '#F0F6FC', textAlign: 'right', verticalAlign: 'middle' }, content: { text: 'عنوان' } },
        { id: 'circle', type: 'circle', x: 0.2, y: 0.3, w: 0.2, h: 0.2, style: { fill: '#1F6FEB', opacity: 0.8 } },
      ],
    };
    const result = validateCanonicalPresentation({
      ...valid,
      slides: [{ ...slide, layout: 'graphic-fullscreen', visual: { type: 'shape-composition', data: composition, caption: null } }],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects invalid opacity and vertical alignment values', () => {
    const composition = {
      version: 1,
      elements: [{ id: 'shape', type: 'circle', x: 0.1, y: 0.1, w: 0.2, h: 0.2, style: { opacity: 1.5, verticalAlign: 'center' } }],
    };
    const result = validateCanonicalPresentation({
      ...valid,
      slides: [{ ...slide, visual: { type: 'shape-composition', data: composition, caption: null } }],
    });
    expect(result.errors.some((issue) => issue.path.endsWith('.style.opacity'))).toBe(true);
    expect(result.errors.some((issue) => issue.path.endsWith('.style.verticalAlign'))).toBe(true);
  });

  it('requires unique slide order and preserves the canonical theme-ID contract', () => {
    const ordered = validateCanonicalPresentation({
      ...valid,
      presentation: { ...valid.presentation, theme: 'midnight' },
      slides: [{ ...slide }, { ...slide, id: 'slide-02', title: 'دوم', order: 1 }],
    });
    expect(ordered.errors.some((issue) => issue.path === 'slides[1].order')).toBe(true);

    const knownTheme = validateCanonicalPresentation({
      ...valid,
      presentation: { ...valid.presentation, theme: 'midnight' },
    });
    expect(knownTheme.errors).toEqual([]);
    expect(knownTheme.warnings.some((issue) => issue.path === 'presentation.theme')).toBe(false);
  });

  it('validates chart series, numeric values, table dimensions, and explicit pie units', () => {
    const mismatchedBars = validateCanonicalPresentation({
      ...valid,
      slides: [{
        ...slide,
        visual: { type: 'bar-chart', caption: null, data: {
          unit: '%',
          series: [
            { name: 'A', values: [{ label: 'الف', value: 10 }] },
            { name: 'B', values: [{ label: 'ب', value: 20 }] },
          ],
        } },
      }],
    });
    expect(mismatchedBars.valid).toBe(false);
    expect(mismatchedBars.errors.some((issue) => issue.path === 'slides[0].visual.data.series[1].values')).toBe(true);

    const invalidTable = validateCanonicalPresentation({
      ...valid,
      slides: [{ ...slide, visual: { type: 'table', caption: null, data: { headers: ['الف','ب'], rows: [['تنها یک سلول']] } } }],
    });
    expect(invalidTable.errors.some((issue) => issue.path === 'slides[0].visual.data.rows[0]')).toBe(true);

    const negativePie = validateCanonicalPresentation({
      ...valid,
      slides: [{ ...slide, visual: { type: 'pie-chart', caption: null, data: { unit: 'items', slices: [{ label: 'الف', value: -1 }] } } }],
    });
    expect(negativePie.errors.some((issue) => issue.path === 'slides[0].visual.data.slices[0].value')).toBe(true);
  });

  it('rejects invalid canvas ratios and unknown layoutConfig keys while accepting edge ratios', () => {
    const badCanvas = validateCanonicalPresentation({
      ...valid,
      presentation: { ...valid.presentation, canvas: { aspectRatio: '0:9', width: 0 } },
    });
    expect(badCanvas.errors.some((issue) => issue.path === 'presentation.canvas.aspectRatio')).toBe(true);
    expect(badCanvas.errors.some((issue) => issue.path === 'presentation.canvas.width')).toBe(true);

    const badLayout = validateCanonicalPresentation({
      ...valid,
      slides: [{ ...slide, layoutConfig: { visualWidthRatio: 0.5, mysterious: true } }],
    });
    expect(badLayout.errors.some((issue) => issue.path === 'slides[0].layoutConfig.mysterious')).toBe(true);

    const edgeRatio = validateCanonicalPresentation({
      ...valid,
      slides: [{ ...slide, layoutConfig: { visualWidthRatio: 0.1, padding: 0, gap: 0 } }],
    });
    expect(edgeRatio.errors).toEqual([]);
  });

  it('treats fontSize as pixels and allows explicit zero-width shape strokes', () => {
    const validStroke = validateCanonicalPresentation({
      ...valid,
      slides: [{
        ...slide,
        visual: { type: 'shape-composition', caption: null, data: {
          version: 1,
          elements: [{ id: 'box', type: 'rectangle', x: 0.1, y: 0.1, w: 0.5, h: 0.3, style: { strokeWidth: 0, fontSize: 24 } }],
        } },
      }],
    });
    expect(validStroke.valid).toBe(true);

    const invalidFont = validateCanonicalPresentation({
      ...valid,
      slides: [{
        ...slide,
        visual: { type: 'shape-composition', caption: null, data: {
          version: 1,
          elements: [{ id: 'label', type: 'text', x: 0.1, y: 0.1, w: 0.5, h: 0.3, style: { fontSize: 0.09 }, content: { text: 'عنوان' } }],
        } },
      }],
    });
    expect(invalidFont.errors.some((issue) => issue.path.endsWith('.style.fontSize'))).toBe(true);
  });

});
