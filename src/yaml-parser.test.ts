import { describe, expect, it } from 'vitest';
import { parsePresentationYaml, stringifyPresentationYaml } from './yaml-parser';

describe('presentation YAML parser', () => {
  it('parses nested mappings, sequences, booleans, numbers and null', () => {
    const source = [
      'presentation:',
      '  title: "ارائهٔ آزمایشی"',
      '  direction: rtl',
      'slides:',
      '  - id: "slide-1"',
      '    order: 1',
      '    body:',
      '      lead: "متن آغازین"',
      '      bullets:',
      '        - "مورد اول"',
      '        - "مورد دوم"',
      '    visual:',
      '      type: "shape-composition"',
      '      data:',
      '        enabled: true',
      '        ratio: 0.75',
      '        optional: null',
      'recapSlides: []',
    ].join('\n');

    expect(parsePresentationYaml(source)).toEqual({
      presentation: { title: 'ارائهٔ آزمایشی', direction: 'rtl' },
      slides: [{
        id: 'slide-1',
        order: 1,
        body: { lead: 'متن آغازین', bullets: ['مورد اول', 'مورد دوم'] },
        visual: { type: 'shape-composition', data: { enabled: true, ratio: 0.75, optional: null } },
      }],
      recapSlides: [],
    });
  });

  it('round-trips the supported presentation data types', () => {
    const value = {
      presentation: { title: 'A: "quoted" title', enabled: true, count: 3 },
      slides: [{ id: 'one', body: { lead: 'line one\nline two', bullets: ['first', 'second'] } }],
      recapSlides: [],
    };
    expect(parsePresentationYaml(stringifyPresentationYaml(value))).toEqual(value);
  });

  it('rejects duplicate mapping keys', () => {
    expect(() => parsePresentationYaml('presentation:\n  title: "one"\n  title: "two"')).toThrow(/کلید تکراری/);
  });

  it('rejects tabs used for indentation', () => {
    expect(() => parsePresentationYaml('presentation:\n\ttitle: "bad"')).toThrow(/Tab/);
  });

  it('rejects aliases and custom tags', () => {
    expect(() => parsePresentationYaml('presentation: &meta {}')).toThrow(/anchor/);
    expect(() => parsePresentationYaml('presentation: !custom value')).toThrow(/anchor/);
  });
});
