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
});
