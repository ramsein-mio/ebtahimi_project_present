import type { Presentation } from '@web-ppt/core';
import type { StoredPresentation } from './types';

const STORAGE_KEY = 'pardis-presentations-v1';

function safeClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function loadPresentations(): StoredPresentation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed as StoredPresentation[] : [];
  } catch {
    return [];
  }
}

function write(items: StoredPresentation[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function createStoredPresentation(title: string, presentation: Presentation): StoredPresentation {
  const now = new Date().toISOString();
  const item: StoredPresentation = {
    id: globalThis.crypto?.randomUUID?.() ?? `presentation-${Date.now()}`,
    title: title.trim() || 'ارائهٔ بدون عنوان',
    createdAt: now,
    updatedAt: now,
    presentation: safeClone(presentation),
  };
  write([item, ...loadPresentations()]);
  return item;
}

export function updateStoredPresentation(id: string, changes: Partial<Pick<StoredPresentation, 'title' | 'presentation' | 'deletedAt'>>): StoredPresentation | null {
  const items = loadPresentations();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return null;
  items[index] = {
    ...items[index],
    ...changes,
    ...(changes.presentation ? { presentation: safeClone(changes.presentation) } : {}),
    updatedAt: new Date().toISOString(),
  };
  write(items);
  return items[index];
}

export function getStoredPresentation(id: string): StoredPresentation | null {
  return loadPresentations().find((item) => item.id === id) ?? null;
}

export function permanentlyDeletePresentation(id: string): void {
  write(loadPresentations().filter((item) => item.id !== id));
}
