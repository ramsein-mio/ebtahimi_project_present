import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../icons';
import {
  FONT_CATALOG,
  FONT_CATALOG_COUNTS,
  fontEntry,
  loadFontFamily,
  type FontCategory,
  type FontEntry,
  type FontLanguage,
} from '../../editor/font-catalog';

type Filter = 'All' | FontLanguage | FontCategory;

function FontRow({ font, active, onSelect }: { font: FontEntry; active: boolean; onSelect: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [ready, setReady] = useState(font.source === 'local');

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return;
      observer.disconnect();
      void loadFontFamily(font).then(setReady);
    }, { rootMargin: '100px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [font]);

  return (
    <button ref={ref} type="button" className={`font-picker-row ${active ? 'active' : ''}`} onClick={onSelect} role="option" aria-selected={active}>
      <span className="font-picker-meta"><b>{font.family}</b><small>{font.language} · {font.category}</small></span>
      <span className={`font-picker-preview ${ready ? 'ready' : ''}`} style={ready ? { fontFamily: `"${font.family}", sans-serif` } : undefined} dir={font.language === 'Persian' ? 'rtl' : 'ltr'}>
        {font.sample}
      </span>
      {active && <Icon name="check" size={16} />}
    </button>
  );
}

export function FontPicker({ value, onChange, compact = false }: { value: string; onChange: (family: string) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const current = fontEntry(value);
    if (current) void loadFontFamily(current);
  }, [value]);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', escape);
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return FONT_CATALOG.filter((font) => {
      const category = filter === 'All' || font.language === filter || font.category === filter;
      return category && (!needle || font.family.toLowerCase().includes(needle));
    });
  }, [filter, query]);

  const filters: Filter[] = ['All', 'Persian', 'English', 'Sans Serif', 'Serif', 'Monospace', 'Display'];

  return (
    <div className={`font-picker ${compact ? 'compact' : ''}`} ref={rootRef}>
      <button type="button" className="font-picker-trigger" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-haspopup="listbox" title="Font family">
        <Icon name="font" size={compact ? 15 : 16} />
        <span>{value}</span>
        <Icon name="chevronDown" size={13} />
      </button>
      {open && (
        <div className="font-picker-popover">
          <header>
            <div><strong>Font library</strong><span>{FONT_CATALOG_COUNTS.total} cataloged families</span></div>
            <label><Icon name="search" size={15} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search fonts" aria-label="Search fonts" /></label>
          </header>
          <div className="font-picker-filters" role="tablist">
            {filters.map((item) => <button type="button" className={filter === item ? 'active' : ''} onClick={() => setFilter(item)} key={item}>{item}</button>)}
          </div>
          <div className="font-picker-list" role="listbox" aria-label="Font families">
            {filtered.map((font) => (
              <FontRow
                key={`${font.language}-${font.family}`}
                font={font}
                active={value === font.family}
                onSelect={() => {
                  void loadFontFamily(font).then((loaded) => {
                    if (loaded) onChange(font.family);
                  });
                  setOpen(false);
                }}
              />
            ))}
            {!filtered.length && <p className="font-picker-empty">No matching fonts</p>}
          </div>
          <footer>Fonts load only when previewed or selected. Google Fonts · OFL 1.1 · system fonts use their installed licenses</footer>
        </div>
      )}
    </div>
  );
}
