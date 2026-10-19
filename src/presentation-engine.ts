import { renderSlideToSvg, type Presentation, type SlideElement, type TableElement, type TextBody } from '@web-ppt/core';
import {
  createDoc,
  disposeDoc,
  Editor,
  textBodyEditText,
  textPositionAtIndex,
  type EditDoc,
  type ElementId,
  type ParagraphPropertyOverrides,
  type RunPropertyOverrides,
  type SlideId,
  type TableCellAddress,
} from '@web-ppt/edit-core';
import { tableCellBody } from './editor/table-model';
import { convertReferenceDeck, isReferenceDeck } from './deck-json';
import { parseCanonicalPresentation } from './canonical-presentation';
import type { ValidationResult } from './types';

export interface TextElementInfo {
  id: ElementId;
  parentId: SlideId | ElementId;
  element: Extract<SlideElement, { kind: 'shape' | 'table' }>;
  body: TextBody;
  text: string;
  editable: boolean;
  topLevel: boolean;
}

export interface SlideElementInfo {
  id: ElementId;
  parentId: SlideId | ElementId;
  element: SlideElement;
  editable: 'full' | 'frame' | 'none';
  locked: boolean;
  topLevel: boolean;
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function persianError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/[\u0600-\u06ff]/.test(message)) return message;
  if (message.includes('JSON')) return `ساختار JSON معتبر نیست: ${message}`;
  return `این داده با مدل Presentation سازگار نیست: ${message}`;
}


function removeEmptyVisualPlaceholders(presentation: Presentation): Presentation {
  const cleanElements = (elements: SlideElement[], preserveVisualFrame = false): SlideElement[] => elements.flatMap((element): SlideElement[] => {
    if (element.kind === 'group') return [{ ...element, children: cleanElements(element.children, preserveVisualFrame) }];
    if (element.kind !== 'shape' || element.text) return [element];
    const name = element.name ?? '';
    const leftHalf = element.x < presentation.width * 0.48 && element.w >= presentation.width * 0.4;
    const fill = element.fill;
    const stroke = element.stroke;
    const emptyFill = !fill || fill.type === 'none' || (fill.type === 'solid' && ['#ffffff', '#fff', '#fefefe', 'transparent'].includes(String(fill.color).toLowerCase()));
    const emptyStroke = !stroke || ['#ffffff', '#fff', '#fefefe', '#e4e4e4', 'transparent'].includes(String(stroke.color).toLowerCase());
    const placeholderName = /(?:visual|placeholder|empty|frame)/i.test(name);
    if (preserveVisualFrame && name === 'visual-frame') return [element];
    return leftHalf && emptyFill && emptyStroke && (placeholderName || !name) ? [] : [element];
  });
  const normalized = JSON.parse(JSON.stringify(presentation)) as Presentation;
  normalized.slides.forEach((slide) => { slide.elements = cleanElements(slide.elements, Boolean(slide.layoutName?.includes('with visual'))); });
  return normalized;
}

export function validatePresentationJson(source: string): ValidationResult {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch (error) {
    return { presentation: null, error: persianError(error) };
  }
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('ریشه باید یک شیء باشد.');
    }
    const rootRecord = isRecordValue(value) ? value : null;
    const canonical = rootRecord !== null && (
      'recapSlides' in rootRecord ||
      (Object.keys(rootRecord).length === 3 && ['presentation', 'slides', 'recapSlides'].every((key) => key in rootRecord))
    );
    // A canonical document is validated against the shared contract before it
    // reaches the legacy-compatible renderer. Non-canonical/native inputs keep
    // their existing import path unchanged.
    if (canonical) {
      const validation = parseCanonicalPresentation(source);
      if (!validation.valid) {
        const issues = validation.errors.slice(0, 8).map((issue) => `${issue.path}: ${issue.message}`);
        const remainder = validation.errors.length > issues.length
          ? `\nو ${validation.errors.length - issues.length} خطای دیگر.`
          : '';
        throw new Error(`ساختار JSON استاندارد نیست:\n${issues.join('\n')}${remainder}`);
      }
    }
    const converted = isReferenceDeck(value) ? convertReferenceDeck(value) : null;
    const candidate = (converted?.presentation ?? value) as Partial<Presentation>;
    if (!Number.isFinite(candidate.width) || Number(candidate.width) <= 0) {
      throw new Error('width باید یک عدد مثبت باشد.');
    }
    if (!Number.isFinite(candidate.height) || Number(candidate.height) <= 0) {
      throw new Error('height باید یک عدد مثبت باشد.');
    }
    if (candidate.source !== 'ppt' && candidate.source !== 'pptx') {
      throw new Error('source باید یکی از دو مقدار ppt یا pptx باشد.');
    }
    if (!Array.isArray(candidate.slides) || candidate.slides.length === 0) {
      throw new Error('slides باید یک آرایهٔ غیرخالی باشد.');
    }
    const presentation = removeEmptyVisualPlaceholders(candidate as Presentation);
    const doc = createDoc(presentation, { idPrefix: 'validate-' });
    const editor = new Editor(doc);
    try {
      for (const slideId of doc.slideOrder) {
        const slide = editor.toSlide(slideId);
        renderSlideToSvg(presentation, slide, { idPrefix: `validate-${slideId}-`, textMode: 'svg' });
      }
    } finally {
      disposeDoc(doc);
    }
    return {
      presentation,
      error: null,
      suggestedTitle: converted?.title,
      inputFormat: canonical || converted ? 'reference' : 'web-ppt',
    };
  } catch (error) {
    return { presentation: null, error: persianError(error) };
  }
}

export function createRuntimeEditor(presentation: Presentation, idPrefix: string): { editor: Editor; doc: EditDoc } {
  const doc = createDoc(presentation, { idPrefix });
  return { doc, editor: new Editor(doc) };
}

export function projectPresentation(editor: Editor, original: Presentation): Presentation {
  const slides = editor.doc.slideOrder.map((id) => editor.toSlide(id));
  const materializedSlides = JSON.parse(JSON.stringify(slides, (_key, value: unknown) => {
    if (typeof value !== 'string' || !value.startsWith('web-ppt-resource:')) return value;
    const resource = editor.doc.imageResources[value.slice('web-ppt-resource:'.length)];
    return resource ? `data:${resource.mime};base64,${resource.bytes}` : value;
  })) as Presentation['slides'];
  return {
    ...original,
    width: editor.doc.meta.width,
    height: editor.doc.meta.height,
    slides: materializedSlides,
    dispose: undefined,
    package: undefined,
  };
}

export function elementsForSlide(editor: Editor, slideId: SlideId): SlideElementInfo[] {
  const output: SlideElementInfo[] = [];
  const visit = (parentId: SlideId | ElementId, topLevel: boolean) => {
    const children = editor.doc.slides[parentId]?.children ?? editor.doc.elements[parentId]?.children ?? [];
    for (const id of children) {
      const record = editor.doc.elements[id];
      if (!record) continue;
      output.push({
        id,
        parentId,
        element: editor.effectiveElement(id),
        editable: record.meta.editable,
        locked: Boolean(record.meta.locked),
        topLevel,
      });
      if (record.children?.length) visit(id, false);
    }
  };
  visit(slideId, true);
  return output;
}

export function textElementsForSlide(editor: Editor, slideId: SlideId): TextElementInfo[] {
  const output: TextElementInfo[] = [];
  const visit = (parentId: SlideId | ElementId, topLevel: boolean) => {
    const children = editor.doc.slides[parentId]?.children ?? editor.doc.elements[parentId]?.children ?? [];
    for (const id of children) {
      const record = editor.doc.elements[id];
      if (!record) continue;
      const element = editor.effectiveElement(id);
      if (element.kind === 'shape' && element.text) {
        output.push({
          id,
          parentId,
          element,
          body: element.text,
          text: textBodyEditText(element.text),
          editable: record.meta.editable === 'full',
          topLevel,
        });
      }
      if (record.children?.length) visit(id, false);
    }
  };
  visit(slideId, true);
  return output;
}

export function replaceElementText(editor: Editor, info: TextElementInfo, text: string): void {
  const from = textPositionAtIndex(info.body, 0);
  const to = textPositionAtIndex(info.body, textBodyEditText(info.body).length);
  editor.transaction((transaction) => {
    transaction.exec({ type: 'EditText', id: info.id, ops: [{ type: 'replace', from, to, text }] });
  }, 'ویرایش متن');
}

export function setWholeTextRunProps(
  editor: Editor,
  info: TextElementInfo,
  props: RunPropertyOverrides,
): void {
  const from = textPositionAtIndex(info.body, 0);
  const to = textPositionAtIndex(info.body, textBodyEditText(info.body).length);
  editor.exec({ type: 'SetRunProps', id: info.id, range: { from, to }, props });
}

export function initializeShapeText(editor: Editor, id: ElementId, text: string): void {
  const record = editor.doc.elements[id];
  const element = record ? editor.effectiveElement(id) : null;
  if (!record || !element || element.kind !== 'shape') return;
  const body = element.text ?? record.meta.textTemplate;
  if (!body) return;
  const at = textPositionAtIndex(body, 0);
  editor.exec({ type: 'EditText', id, ops: [{ type: 'replace', from: at, to: at, text }] });
}

export function replaceTableCellText(
  editor: Editor,
  id: ElementId,
  table: TableElement,
  cell: TableCellAddress,
  text: string,
): void {
  const body = tableCellBody(table, cell);
  if (!body) return;
  const from = textPositionAtIndex(body, 0);
  const to = textPositionAtIndex(body, textBodyEditText(body).length);
  editor.transaction((transaction) => {
    transaction.exec({ type: 'EditText', id, cell, ops: [{ type: 'replace', from, to, text }] });
  }, 'Edit table cell', { mergeKey: `table-cell:${id}:${cell.r}:${cell.c}` });
}

export function setTableCellRunProps(
  editor: Editor,
  id: ElementId,
  table: TableElement,
  cell: TableCellAddress,
  props: RunPropertyOverrides,
): void {
  const body = tableCellBody(table, cell);
  if (!body) return;
  const from = textPositionAtIndex(body, 0);
  const to = textPositionAtIndex(body, textBodyEditText(body).length);
  editor.exec({ type: 'SetRunProps', id, cell, range: { from, to }, props });
}

export function setTableCellAlignment(
  editor: Editor,
  id: ElementId,
  table: TableElement,
  cell: TableCellAddress,
  align: 'left' | 'center' | 'right',
): void {
  const body = tableCellBody(table, cell);
  if (!body) return;
  const from = textPositionAtIndex(body, 0);
  const to = textPositionAtIndex(body, textBodyEditText(body).length);
  editor.exec({ type: 'SetParaProps', id, cell, range: { from, to }, props: { align } });
}

export function setWholeTextAlignment(
  editor: Editor,
  info: TextElementInfo,
  align: 'left' | 'center' | 'right',
): void {
  setWholeTextParagraphProps(editor, info, { align });
}

export function setWholeTextParagraphProps(
  editor: Editor,
  info: TextElementInfo,
  props: ParagraphPropertyOverrides,
): void {
  const from = textPositionAtIndex(info.body, 0);
  const to = textPositionAtIndex(info.body, textBodyEditText(info.body).length);
  editor.exec({ type: 'SetParaProps', id: info.id, range: { from, to }, props });
}
