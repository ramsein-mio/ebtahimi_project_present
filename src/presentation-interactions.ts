import type { ShapeElement, Slide, SlideElement, TextBody } from '@web-ppt/core';

const LINE_PREFIX = 'pardis-line:';
const LEGACY_LINE_NAME = /^(?:deck-(?:lead|emphasis)|lead|emphasis|bullet-\d+)$/;

interface EncodedLine {
  version: 1;
  id: string;
  text: string;
  details: string;
}

export interface PresentationLineTarget {
  id: string;
  text: string;
  details: string;
  x: number;
  y: number;
  w: number;
  h: number;
  element: ShapeElement;
}

export function encodePresentationLineName(id: string, text: string, details: string): string {
  const payload: EncodedLine = { version: 1, id, text, details };
  return `${LINE_PREFIX}${encodeURIComponent(JSON.stringify(payload))}`;
}

export function decodePresentationLineName(name: string | undefined): EncodedLine | null {
  if (!name?.startsWith(LINE_PREFIX)) return null;
  try {
    const value = JSON.parse(decodeURIComponent(name.slice(LINE_PREFIX.length))) as Partial<EncodedLine>;
    if (value.version !== 1 || typeof value.id !== 'string' || typeof value.text !== 'string' || typeof value.details !== 'string') {
      return null;
    }
    return value as EncodedLine;
  } catch {
    return null;
  }
}

function bodyText(body: TextBody): string {
  return body.paragraphs
    .map((paragraph) => paragraph.runs.map((run) => run.text).join(''))
    .join('\n');
}

function legacyDetails(notes: string | undefined, label: string): string {
  if (!notes || !label) return '';
  const prefix = `${label}:`;
  const match = notes.split(/\n\s*\n/).find((entry) => entry.trim().startsWith(prefix));
  return match ? match.trim().slice(prefix.length).trim() : '';
}

function lineTarget(element: ShapeElement, notes: string | undefined): PresentationLineTarget | null {
  if (!element.text) return null;
  const encoded = decodePresentationLineName(element.name);
  const legacy = !encoded && Boolean(element.name && LEGACY_LINE_NAME.test(element.name));
  if (!encoded && !legacy) return null;
  const currentText = bodyText(element.text).trim();
  const detailSpace = encoded?.details ? 28 : 0;
  const bulletSpace = encoded?.id.startsWith('bullet-') ? 19 : 0;
  return {
    id: encoded?.id ?? element.name ?? 'line',
    text: currentText || encoded?.text || '',
    details: encoded?.details || legacyDetails(notes, currentText),
    x: Math.max(0, element.x - detailSpace),
    y: element.y,
    w: element.w + detailSpace + bulletSpace,
    h: element.h,
    element,
  };
}

export function presentationLineTargets(slide: Slide): PresentationLineTarget[] {
  const output: PresentationLineTarget[] = [];
  const visit = (elements: SlideElement[]) => {
    elements.forEach((element) => {
      if (element.kind === 'shape') {
        const target = lineTarget(element, slide.notes);
        if (target) output.push(target);
      } else if (element.kind === 'group') {
        visit(element.children);
      }
    });
  };
  visit(slide.elements);
  return output;
}
