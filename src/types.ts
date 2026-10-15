import type { Presentation } from '@web-ppt/core';

export interface StoredPresentation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  presentation: Presentation;
}

export type DashboardFilter = 'recent' | 'all' | 'trash';

export type Route =
  | { page: 'dashboard' }
  | { page: 'json' }
  | { page: 'editor'; id: string }
  | { page: 'viewer'; id: string };

export interface ValidationResult {
  presentation: Presentation | null;
  error: string | null;
  suggestedTitle?: string;
  inputFormat?: 'reference' | 'web-ppt';
}
