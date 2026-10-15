import { describe, expect, it } from 'vitest';
import { disposeDoc, textBodyEditText } from '@web-ppt/edit-core';
import { referenceLineDetails } from './deck-json';
import { presentationLineTargets } from './presentation-interactions';
import { createSamplePresentation, sampleJson } from './sample';
import {
  createRuntimeEditor,
  elementsForSlide,
  initializeShapeText,
  projectPresentation,
  replaceElementText,
  textElementsForSlide,
  validatePresentationJson,
} from './presentation-engine';

describe('چرخهٔ JSON تا ذخیره و بازگشایی', () => {
  it('نمونه را با مدل واقعی Presentation اعتبارسنجی می‌کند', () => {
    const result = validatePresentationJson(sampleJson());
    expect(result.error).toBeNull();
    expect(result.inputFormat).toBe('reference');
    expect(result.suggestedTitle).toBe('هوش مصنوعی و آیندهٔ کار');
    expect(result.presentation?.width).toBe(1280);
    expect(result.presentation?.height).toBe(720);
    expect(result.presentation?.slides).toHaveLength(6);
    const interactiveLines = presentationLineTargets(result.presentation!.slides[1]);
    expect(interactiveLines).toHaveLength(5);
    expect(interactiveLines.filter((line) => line.details)).toHaveLength(2);
  });

  it('details را دقیقاً مطابق قرارداد ساختاری نمونه تشخیص می‌دهد', () => {
    expect(referenceLineDetails({ text: 'خط', details: 'شرح معتبر' })).toBe('شرح معتبر');
    expect(referenceLineDetails({ text: 'خط', details: '   ' })).toBe('');
    expect(referenceLineDetails({ text: 'خط', detail: 'کلید اشتباه' })).toBe('');
    expect(referenceLineDetails({ text: 'خط', details: { body: 'نوع اشتباه' } })).toBe('');
  });

  it('ورودی native قبلی web-ppt را برای سازگاری نگه می‌دارد', () => {
    const result = validatePresentationJson(JSON.stringify(createSamplePresentation()));
    expect(result.error).toBeNull();
    expect(result.inputFormat).toBe('web-ppt');
    expect(result.presentation?.slides).toHaveLength(3);
  });

  it('اسلایدهای قرارداد مرجع را بر اساس order مرتب و نشانه‌گذاری متن را به run تبدیل می‌کند', () => {
    const result = validatePresentationJson(JSON.stringify({
      presentation: { title: 'آزمون قرارداد' },
      slides: [
        { order: 20, layout: 'content', title: 'دوم', body: { lead: 'متن دوم' } },
        { order: 10, layout: 'title', title: 'اول ==مهم== و **ضخیم**' },
      ],
    }));
    expect(result.error).toBeNull();
    const first = result.presentation!.slides[0];
    const title = first.elements.find((element) => element.name === 'deck-title');
    expect(title?.kind).toBe('shape');
    if (title?.kind !== 'shape' || !title.text) throw new Error('عنوان تبدیل نشد');
    expect(textBodyEditText(title.text)).toBe('اول مهم و ضخیم');
    expect(title.text.paragraphs[0].runs.some((run) => run.highlight === '#ffe45c')).toBe(true);
    expect(title.text.paragraphs[0].runs.some((run) => run.text === 'ضخیم' && run.b)).toBe(true);
  });

  it('visualهای قرارداد مرجع، از جمله line-chart، را به عناصر قابل‌رندر تبدیل می‌کند', () => {
    const visuals = [
      { type: 'icon-list', data: { items: [{ icon: '✓', label: 'یک' }] } },
      { type: 'bar-chart', data: { series: [{ values: [{ label: 'یک', value: 10 }] }] } },
      { type: 'line-chart', data: { xAxisLabel: 'زمان', yAxisLabel: 'مقدار', series: [{ name: 'روند', points: [{ x: '۱', y: 10 }, { x: '۲', y: 18 }] }] } },
      { type: 'pie-chart', data: { slices: [{ label: 'یک', value: 100 }] } },
      { type: 'comparison-grid', data: { columns: ['الف'], rows: [['عنوان::مقدار']] } },
      { type: 'table', data: { headers: ['الف'], rows: [['مقدار']] } },
    ];
    const result = validatePresentationJson(JSON.stringify({
      slides: visuals.map((visual, index) => ({
        order: index + 1,
        layout: 'content',
        title: `اسلاید ${index + 1}`,
        visual,
      })),
    }));
    expect(result.error).toBeNull();
    expect(result.presentation?.slides).toHaveLength(6);
    result.presentation?.slides.forEach((slide) => {
      expect(slide.elements.some((element) => element.name === 'visual-frame')).toBe(true);
      expect(slide.elements.length).toBeGreaterThan(5);
    });
    expect(result.presentation?.slides[2].elements.some((element) => element.name === 'line-series-1')).toBe(true);
  });

  it('ویرایش متن را در projection ذخیره می‌کند و پس از بازگشایی نگه می‌دارد', () => {
    const original = createSamplePresentation();
    const first = createRuntimeEditor(original, 'test-a-');
    const firstSlideId = first.doc.slideOrder[0];
    const textElement = textElementsForSlide(first.editor, firstSlideId)[0];
    expect(textElement.editable).toBe(true);

    replaceElementText(first.editor, textElement, 'عنوان ویرایش‌شده و ماندگار');
    const saved = projectPresentation(first.editor, original);
    disposeDoc(first.doc);

    const reopenedData = JSON.parse(JSON.stringify(saved));
    const second = createRuntimeEditor(reopenedData, 'test-b-');
    const reopenedText = textElementsForSlide(second.editor, second.doc.slideOrder[0])[0];
    expect(textBodyEditText(reopenedText.body)).toBe('عنوان ویرایش‌شده و ماندگار');
    disposeDoc(second.doc);
  });

  it('ورودی ناسازگار را با پیام فارسی رد می‌کند', () => {
    const result = validatePresentationJson('{"slides":[]}');
    expect(result.presentation).toBeNull();
    expect(result.error).toContain('slides');
    expect(validatePresentationJson('{}').error).toContain('slides');
  });

  it('شکل افزوده‌شده را جابه‌جا می‌کند، متن می‌دهد و در projection نگه می‌دارد', () => {
    const original = createSamplePresentation();
    const runtime = createRuntimeEditor(original, 'shape-test-');
    const slideId = runtime.doc.slideOrder[0];
    const result = runtime.editor.exec({
      type: 'AddShape',
      slideId,
      preset: 'roundRect',
      rect: { x: 320, y: 210, w: 280, h: 120 },
    });
    const id = result.selection.kind === 'elements' ? result.selection.ids[0] : null;
    expect(id).toBeTruthy();
    initializeShapeText(runtime.editor, id!, 'Editable shape');
    runtime.editor.exec({ type: 'SetXfrm', id: id!, x: 410, y: 260 });

    const inserted = elementsForSlide(runtime.editor, slideId).find((item) => item.id === id);
    expect(inserted?.element.x).toBe(410);
    expect(inserted?.element.y).toBe(260);
    expect(textElementsForSlide(runtime.editor, slideId).find((item) => item.id === id)?.text).toBe('Editable shape');

    const saved = projectPresentation(runtime.editor, original);
    const savedElement = saved.slides[0].elements.at(-1);
    expect(savedElement?.x).toBe(410);
    expect(savedElement?.y).toBe(260);
    disposeDoc(runtime.doc);
  });

  it('منبع تصویر افزوده‌شده را برای ذخیرهٔ مرورگر به data URL تبدیل می‌کند', () => {
    const original = createSamplePresentation();
    const runtime = createRuntimeEditor(original, 'image-test-');
    const slideId = runtime.doc.slideOrder[0];
    const png = Uint8Array.from([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
      0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137,
      0, 0, 0, 13, 73, 68, 65, 84, 8, 215, 99, 248, 207, 192, 240,
      31, 0, 5, 0, 1, 255, 137, 153, 61, 29, 0, 0, 0, 0, 73, 69,
      78, 68, 174, 66, 96, 130,
    ]);
    runtime.editor.exec({
      type: 'AddImage',
      slideId,
      bytes: png,
      mime: 'image/png',
      rect: { x: 100, y: 100, w: 120, h: 120 },
    });
    const saved = projectPresentation(runtime.editor, original);
    const image = saved.slides[0].elements.at(-1);
    expect(image?.kind).toBe('image');
    if (image?.kind === 'image') expect(image.src.startsWith('data:image/png;base64,')).toBe(true);
    disposeDoc(runtime.doc);
  });
});
