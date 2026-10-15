export interface Theme {
  id: string;
  name: string;
  sw: [string, string, string];
}

export interface ThemeVars {
  '--bg': string;
  '--fg': string;
  '--muted': string;
  '--line': string;
  '--soft': string;
  '--soft2': string;
  '--inv-bg': string;
  '--inv-fg': string;
  '--p0': string;
  '--p1': string;
  '--p2': string;
  '--p3': string;
  '--p4': string;
  '--p5': string;
  '--hl-bg': string;
  '--hl-strong-bg': string;
  '--hl-fg': string;
  '--hl-strong-fg': string;
  '--hl-manual-bg': string;
}

export const THEMES: Theme[] = [
  { id: 'light', name: 'روشن', sw: ['#ffffff', '#0b0b0b', '#ffe45c'] },
  { id: 'dark', name: 'تاریک', sw: ['#0b0b0b', '#f5f5f5', '#facc15'] },
  { id: 'ocean', name: 'اقیانوس', sw: ['#eff6ff', '#0c2a4d', '#38bdf8'] },
  { id: 'forest', name: 'جنگل', sw: ['#f2faf3', '#12331c', '#4ade80'] },
  { id: 'sunset', name: 'غروب', sw: ['#fff7ed', '#3d1a08', '#fb923c'] },
  { id: 'lavender', name: 'اسطوخودوس', sw: ['#faf5ff', '#2e1065', '#a78bfa'] },
  { id: 'rose', name: 'رز', sw: ['#fff1f2', '#4c0519', '#fb7185'] },
  { id: 'sepia', name: 'سپیا', sw: ['#f7f3e9', '#3d2e1a', '#fbbf24'] },
  { id: 'midnight', name: 'نیمه‌شب', sw: ['#0a1024', '#e0e7ff', '#facc15'] },
  { id: 'neon', name: 'نئون', sw: ['#080808', '#4ade80', '#4ade80'] },
];

export const THEME_IDS = THEMES.map((theme) => theme.id);
export const DARK_THEMES = ['dark', 'midnight', 'neon'];
export const THEME_STORAGE_KEY = 'deck-theme';

const EXACT_THEME_VARS: Record<string, ThemeVars> = {
  light: { '--bg': '#ffffff', '--fg': '#0b0b0b', '--muted': '#5c5c5c', '--line': '#0b0b0b', '--soft': '#f2f2f2', '--soft2': '#e4e4e4', '--inv-bg': '#0b0b0b', '--inv-fg': '#ffffff', '--p0': '#3b82f6', '--p1': '#f97316', '--p2': '#22c55e', '--p3': '#a855f7', '--p4': '#ec4899', '--p5': '#06b6d4', '--hl-bg': '#ffe45c', '--hl-strong-bg': '#ffe45c', '--hl-fg': '#0b0b0b', '--hl-strong-fg': '#0b0b0b', '--hl-manual-bg': '#ffd23f' },
  dark: { '--bg': '#0b0b0b', '--fg': '#f5f5f5', '--muted': '#a2a2a2', '--line': '#f5f5f5', '--soft': '#1a1a1a', '--soft2': '#272727', '--inv-bg': '#f5f5f5', '--inv-fg': '#0b0b0b', '--p0': '#60a5fa', '--p1': '#fb923c', '--p2': '#4ade80', '--p3': '#c084fc', '--p4': '#f472b6', '--p5': '#22d3ee', '--hl-bg': '#facc15', '--hl-strong-bg': '#facc15', '--hl-fg': '#0b0b0b', '--hl-strong-fg': '#0b0b0b', '--hl-manual-bg': '#facc15' },
  ocean: { '--bg': '#eff6ff', '--fg': '#0c2a4d', '--muted': '#5b7ba1', '--line': '#0c2a4d', '--soft': '#dbeafe', '--soft2': '#bfdbfe', '--inv-bg': '#0c2a4d', '--inv-fg': '#eff6ff', '--p0': '#0ea5e9', '--p1': '#06b6d4', '--p2': '#14b8a6', '--p3': '#6366f1', '--p4': '#8b5cf6', '--p5': '#3b82f6', '--hl-bg': '#38bdf8', '--hl-strong-bg': '#38bdf8', '--hl-fg': '#082f49', '--hl-strong-fg': '#082f49', '--hl-manual-bg': '#38bdf8' },
  forest: { '--bg': '#f2faf3', '--fg': '#12331c', '--muted': '#547a5f', '--line': '#12331c', '--soft': '#dcf5e0', '--soft2': '#b8e6c0', '--inv-bg': '#12331c', '--inv-fg': '#f2faf3', '--p0': '#16a34a', '--p1': '#65a30d', '--p2': '#059669', '--p3': '#0d9488', '--p4': '#84cc16', '--p5': '#22c55e', '--hl-bg': '#4ade80', '--hl-strong-bg': '#4ade80', '--hl-fg': '#052e16', '--hl-strong-fg': '#052e16', '--hl-manual-bg': '#4ade80' },
  sunset: { '--bg': '#fff7ed', '--fg': '#3d1a08', '--muted': '#9a5f3a', '--line': '#3d1a08', '--soft': '#ffedd5', '--soft2': '#fed7aa', '--inv-bg': '#3d1a08', '--inv-fg': '#fff7ed', '--p0': '#f97316', '--p1': '#ef4444', '--p2': '#f59e0b', '--p3': '#ec4899', '--p4': '#e11d48', '--p5': '#fb923c', '--hl-bg': '#fb923c', '--hl-strong-bg': '#fb923c', '--hl-fg': '#431407', '--hl-strong-fg': '#431407', '--hl-manual-bg': '#fb923c' },
  lavender: { '--bg': '#faf5ff', '--fg': '#2e1065', '--muted': '#7c6ba8', '--line': '#2e1065', '--soft': '#ede9fe', '--soft2': '#ddd6fe', '--inv-bg': '#2e1065', '--inv-fg': '#faf5ff', '--p0': '#8b5cf6', '--p1': '#a855f7', '--p2': '#d946ef', '--p3': '#ec4899', '--p4': '#6366f1', '--p5': '#c084fc', '--hl-bg': '#a78bfa', '--hl-strong-bg': '#a78bfa', '--hl-fg': '#2e1065', '--hl-strong-fg': '#2e1065', '--hl-manual-bg': '#a78bfa' },
  rose: { '--bg': '#fff1f2', '--fg': '#4c0519', '--muted': '#9f5b6e', '--line': '#4c0519', '--soft': '#ffe4e6', '--soft2': '#fecdd3', '--inv-bg': '#4c0519', '--inv-fg': '#fff1f2', '--p0': '#e11d48', '--p1': '#ec4899', '--p2': '#f43f5e', '--p3': '#d946ef', '--p4': '#f472b6', '--p5': '#fb7185', '--hl-bg': '#fb7185', '--hl-strong-bg': '#fb7185', '--hl-fg': '#4c0519', '--hl-strong-fg': '#4c0519', '--hl-manual-bg': '#fb7185' },
  sepia: { '--bg': '#f7f3e9', '--fg': '#3d2e1a', '--muted': '#7a6a52', '--line': '#3d2e1a', '--soft': '#ebe3d0', '--soft2': '#d9cdb3', '--inv-bg': '#3d2e1a', '--inv-fg': '#f7f3e9', '--p0': '#b45309', '--p1': '#92400e', '--p2': '#a16207', '--p3': '#78350f', '--p4': '#ca8a04', '--p5': '#854d0e', '--hl-bg': '#fbbf24', '--hl-strong-bg': '#fbbf24', '--hl-fg': '#3d2e1a', '--hl-strong-fg': '#3d2e1a', '--hl-manual-bg': '#fbbf24' },
  midnight: { '--bg': '#0a1024', '--fg': '#e0e7ff', '--muted': '#8b95b8', '--line': '#e0e7ff', '--soft': '#141c38', '--soft2': '#1f2a4d', '--inv-bg': '#e0e7ff', '--inv-fg': '#0a1024', '--p0': '#60a5fa', '--p1': '#818cf8', '--p2': '#38bdf8', '--p3': '#a78bfa', '--p4': '#22d3ee', '--p5': '#c084fc', '--hl-bg': '#facc15', '--hl-strong-bg': '#facc15', '--hl-fg': '#0a1024', '--hl-strong-fg': '#0a1024', '--hl-manual-bg': '#facc15' },
  neon: { '--bg': '#080808', '--fg': '#d9ffe1', '--muted': '#6ea87a', '--line': '#4ade80', '--soft': '#0e1a10', '--soft2': '#16301c', '--inv-bg': '#4ade80', '--inv-fg': '#080808', '--p0': '#4ade80', '--p1': '#22d3ee', '--p2': '#a3e635', '--p3': '#f0abfc', '--p4': '#facc15', '--p5': '#2dd4bf', '--hl-bg': '#4ade80', '--hl-strong-bg': '#4ade80', '--hl-fg': '#080808', '--hl-strong-fg': '#080808', '--hl-manual-bg': '#4ade80' },
};

export function themeVars(id: string): ThemeVars {
  return EXACT_THEME_VARS[id] ?? EXACT_THEME_VARS.light;
}

export function themeCss(id: string): string {
  const vars = themeVars(id);
  const body = Object.entries(vars).map(([key, value]) => `${key}:${value};`).join('');
  return `[data-theme="${id}"]{${body}}`;
}

export function allThemeCss(): string {
  return `:root{${Object.entries(EXACT_THEME_VARS.light).map(([key,value]) => `${key}:${value};`).join('')}}${THEMES.map((theme) => themeCss(theme.id)).join('')}`;
}

export function applyTheme(id: string): void {
  if (!THEME_IDS.includes(id)) return;
  document.documentElement.setAttribute('data-theme', id);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // storage unavailable
  }
}

export function readStoredTheme(): string {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && THEME_IDS.includes(saved)) return saved;
  } catch {
    // storage unavailable
  }
  return 'light';
}

export function isDarkTheme(id: string): boolean {
  return DARK_THEMES.includes(id);
}
