import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { Presentation, Slide } from '@web-ppt/core';
import { SlideSvg } from '../components/SlideSvg';
import { Icon } from '../icons';
import { parseReferenceSegments } from '../deck-json';
import { presentationLineTargets, type PresentationLineTarget } from '../presentation-interactions';
import {
  THEMES,
  applyTheme,
  isDarkTheme,
  readStoredTheme,
} from '../viewer/themes';

interface ViewerProps {
  presentation: Presentation;
  title: string;
  initialIndex?: number;
  onBack: () => void;
  onEdit: () => void;
}

interface ManualHighlight {
  id: string;
  rects: Array<{ x: number; y: number; w: number; h: number }>;
}

interface FocusState {
  line: PresentationLineTarget;
  rotateX: number;
  rotateY: number;
}

declare global {
  interface Window {
    qrcode?: (typeNumber: number, errorCorrectionLevel: string) => {
      addData: (data: string) => void;
      make: () => void;
      getModuleCount: () => number;
      isDark: (row: number, col: number) => boolean;
    };
    PptxGenJS?: new () => {
      layout: string;
      rtlMode: boolean;
      title: string;
      addSlide: () => {
        background: { color: string };
        addText: (text: string, options: Record<string, unknown>) => void;
      };
      writeFile: (options: { fileName: string }) => void;
    };
  }
}

function elementText(slide: Slide, name: string): string {
  const element = slide.elements.find((item) => item.kind === 'shape' && item.name === name);
  if (!element || element.kind !== 'shape' || !element.text) return '';
  return element.text.paragraphs.map((paragraph) => paragraph.runs.map((run) => run.text).join('')).join(' ').trim();
}

function slideTitle(slide: Slide): string {
  return elementText(slide, 'slide-title') || elementText(slide, 'deck-title') || '';
}

function slideSection(slide: Slide): string {
  return elementText(slide, 'section-tag');
}

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.15;

function DetailsContent({ value }: { value: string }) {
  return (
    <div className="viewer-detail-content" dir="rtl" lang="fa">
      {value.split('\n').map((line, lineIndex) => (
        <span className="viewer-detail-line" key={`${lineIndex}-${line}`}>
          {parseReferenceSegments(line).map((segment, segmentIndex) => {
            const content = segment.bold ? <strong>{segment.text}</strong> : segment.text;
            return segment.highlight
              ? <mark key={`${segmentIndex}-${segment.text}`}>{content}</mark>
              : <span key={`${segmentIndex}-${segment.text}`}>{content}</span>;
          })}
        </span>
      ))}
    </div>
  );
}

export function Viewer({ presentation, title, initialIndex = 0, onBack, onEdit }: ViewerProps) {
  const [index, setIndex] = useState(() => Math.max(0, Math.min(initialIndex, presentation.slides.length - 1)));
  const [direction, setDirection] = useState<1 | -1>(1);
  const [theme, setTheme] = useState(readStoredTheme);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [fitScale, setFitScale] = useState(1);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [themePanelOpen, setThemePanelOpen] = useState(false);
  const [highlightMode, setHighlightMode] = useState(false);
  const [details, setDetails] = useState<PresentationLineTarget | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [focusLine, setFocusLine] = useState<FocusState | null>(null);
  const [highlights, setHighlights] = useState<Record<string, ManualHighlight[]>>({});
  const [chromeHidden, setChromeHidden] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const slideRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number; moved: boolean } | null>(null);
  const idleTimer = useRef<number | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const slideCount = presentation.slides.length;
  const currentSlide = presentation.slides[index];
  const lineTargets = useMemo(() => presentationLineTargets(currentSlide), [currentSlide]);
  const slideHighlights = highlights[`slide-${index}`] ?? [];

  const totalScale = fitScale * zoom;

  const goTo = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(slideCount - 1, next));
    setIndex((current) => {
      if (clamped === current) return current;
      setDirection(clamped > current ? 1 : -1);
      return clamped;
    });
  }, [slideCount]);

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const previous = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    setDetails(null);
    setFocusLine(null);
  }, [index]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const compute = () => {
      const rect = stage.getBoundingClientRect();
      // The stage is the space BETWEEN the header and the bottom navigation.
      // Never enforce a 0.2 minimum: on short landscape screens that minimum
      // can make a 16:9 slide taller than the stage and push it under the footer.
      const availableWidth = Math.max(1, rect.width - 24);
      const availableHeight = Math.max(1, rect.height - 24);
      const scale = Math.min(
        availableWidth / presentation.width,
        availableHeight / presentation.height,
      );
      setFitScale(Math.max(0.01, Math.min(scale, 1.5)));
      // Recenter and refit after viewport/orientation changes on mobile.
      setPan({ x: 0, y: 0 });
    };
    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [presentation.width, presentation.height]);

  const clampPan = useCallback((x: number, y: number, scale: number) => {
    const stage = stageRef.current;
    if (!stage) return { x, y };
    const rect = stage.getBoundingClientRect();
    const mx = Math.max(0, (scale - 1) * rect.width / 2);
    const my = Math.max(0, (scale - 1) * rect.height / 2);
    return { x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) };
  }, []);

  const applyZoom = useCallback((value: number) => {
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, value));
    setZoom(clamped);
    if (clamped <= 1) setPan({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => applyZoom(zoom + ZOOM_STEP), [applyZoom, zoom]);
  const zoomOut = useCallback(() => applyZoom(zoom - ZOOM_STEP), [applyZoom, zoom]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const onFs = () => {
      const isFull = Boolean(document.fullscreenElement);
      setChromeHidden(isFull);
      if (isFull) setPan({ x: 0, y: 0 });
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const poke = useCallback(() => {
    if (!document.fullscreenElement) return;
    setChromeHidden(false);
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setChromeHidden(true), 2600);
  }, []);

  useEffect(() => {
    const events = ['mousemove', 'pointermove', 'touchstart', 'keydown'] as const;
    events.forEach((event) => window.addEventListener(event, poke, { passive: true }));
    return () => events.forEach((event) => window.removeEventListener(event, poke));
  }, [poke]);

  const focusLineAt = useCallback((line: PresentationLineTarget, event?: ReactPointerEvent<HTMLElement>) => {
    if (!event) {
      setFocusLine({ line, rotateX: 0, rotateY: 0 });
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = Math.max(-.5, Math.min(.5, (event.clientX - rect.left) / Math.max(1, rect.width) - .5));
    const relativeY = Math.max(-.5, Math.min(.5, (event.clientY - rect.top) / Math.max(1, rect.height) - .5));
    setFocusLine({ line, rotateX: relativeY * -6, rotateY: relativeX * 6 });
  }, []);

  const clearFocusLine = useCallback((line: PresentationLineTarget) => {
    setFocusLine((current) => (current?.line.id === line.id ? null : current));
  }, []);

  const lineStyle = useCallback((line: PresentationLineTarget): CSSProperties => ({
    left: `${(line.x / presentation.width) * 100}%`,
    top: `${(line.y / presentation.height) * 100}%`,
    width: `${(line.w / presentation.width) * 100}%`,
    height: `${(line.h / presentation.height) * 100}%`,
  }), [presentation.width, presentation.height]);

  const focusedLineStyle = useMemo<CSSProperties | undefined>(() => {
    if (!focusLine) return undefined;
    const { line, rotateX, rotateY } = focusLine;
    return {
      ...lineStyle(line),
      transformOrigin: '50% 50%',
      transform: `perspective(600px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(1.06)`,
    };
  }, [focusLine, lineStyle]);

  const focusedSlideStyle = useMemo<CSSProperties | undefined>(() => {
    if (!focusLine) return undefined;
    const { line } = focusLine;
    return {
      left: `${(-line.x / line.w) * 100}%`,
      top: `${(-line.y / line.h) * 100}%`,
      width: `${(presentation.width / line.w) * 100}%`,
      height: `${(presentation.height / line.h) * 100}%`,
    };
  }, [focusLine, presentation.width, presentation.height]);

  const onStagePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (overviewOpen || details || qrOpen) return;
    if (highlightMode) return;
    if (event.button !== 0) return;
    dragRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y, moved: false };
  };

  const onStagePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.moved = true;
    if (zoom > 1) {
      const next = clampPan(drag.panX + dx, drag.panY + dy, totalScale);
      setPan(next);
    }
  };

  const onStagePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && zoom <= 1 && Math.abs(dx) > 55 && Math.abs(dy) < 90) {
      if (dx < 0) next();
      else previous();
    }
  };

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (event.ctrlKey) {
      applyZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
    }
  };

  const captureHighlights = () => {
    if (!highlightMode) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    const slide = slideRef.current;
    if (!slide) return;
    const slideRect = slide.getBoundingClientRect();
    const range = selection.getRangeAt(0);
    if (!slide.contains(range.startContainer) || !slide.contains(range.endContainer)) return;
    const rects = Array.from(range.getClientRects()).map((rect) => ({
      x: rect.left - slideRect.left,
      y: rect.top - slideRect.top,
      w: rect.width,
      h: rect.height,
    })).filter((rect) => rect.w > 0 && rect.h > 0);
    if (!rects.length) return;
    setHighlights((current) => ({
      ...current,
      [`slide-${index}`]: [
        ...(current[`slide-${index}`] ?? []),
        { id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, rects },
      ],
    }));
    selection.removeAllRanges();
  };

  const removeHighlight = (id: string) => {
    setHighlights((current) => ({
      ...current,
      [`slide-${index}`]: (current[`slide-${index}`] ?? []).filter((item) => item.id !== id),
    }));
  };

  const clearHighlights = () => {
    setHighlights((current) => ({ ...current, [`slide-${index}`]: [] }));
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT' || target?.isContentEditable;
      if (typing) return;
      if (details) {
        if (event.key === 'Escape') setDetails(null);
        return;
      }
      if (qrOpen) {
        if (event.key === 'Escape') setQrOpen(false);
        return;
      }
      if (event.key === 'Escape') {
        if (overviewOpen) setOverviewOpen(false);
        else if (themePanelOpen) setThemePanelOpen(false);
        else if (highlightMode) setHighlightMode(false);
        return;
      }
      if (overviewOpen || themePanelOpen) return;
      switch (event.key) {
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          event.preventDefault();
          if (event.key === ' ' && event.shiftKey) previous();
          else next();
          break;
        case 'ArrowLeft':
        case 'PageUp':
          event.preventDefault();
          previous();
          break;
        case 'Home':
          event.preventDefault();
          goTo(0);
          break;
        case 'End':
          event.preventDefault();
          goTo(slideCount - 1);
          break;
        case 'f':
        case 'F':
          event.preventDefault();
          toggleFullscreen();
          break;
        case 'o':
        case 'O':
          event.preventDefault();
          setOverviewOpen((open) => !open);
          break;
        case 'd':
        case 'D':
          event.preventDefault();
          if (event.shiftKey) {
            setTheme((current) => {
              const nextTheme = isDarkTheme(current) ? 'light' : 'dark';
              applyTheme(nextTheme);
              return nextTheme;
            });
          } else {
            setThemePanelOpen((open) => !open);
          }
          break;
        case 'h':
        case 'H':
          event.preventDefault();
          setHighlightMode((mode) => !mode);
          break;
        case 'm':
        case 'M':
          event.preventDefault();
          setQrOpen(true);
          break;
        case '+':
        case '=':
          event.preventDefault();
          zoomIn();
          break;
        case '-':
        case '_':
          event.preventDefault();
          zoomOut();
          break;
        case '0':
          event.preventDefault();
          applyZoom(1);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [details, qrOpen, overviewOpen, themePanelOpen, highlightMode, next, previous, goTo, slideCount, toggleFullscreen, zoomIn, zoomOut, applyZoom]);

  const openQr = () => {
    setQrOpen(true);
    const url = `${window.location.origin}/remote?sid=${Math.random().toString(36).slice(2, 12)}`;
    window.setTimeout(() => renderQr(url), 30);
  };

  const renderQr = (url: string) => {
    const canvas = qrCanvasRef.current;
    if (!canvas) return;
    const start = () => {
      const qrFactory = window.qrcode;
      if (!qrFactory) throw new Error('QR library is not loaded');
      const qr = qrFactory(0, 'M');
      qr.addData(url);
      qr.make();
      const count = qr.getModuleCount();
      const margin = 2;
      const cell = Math.max(2, Math.floor(240 / (count + margin * 2)));
      const size = (count + margin * 2) * cell;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#0b0b0b';
      for (let r = 0; r < count; r += 1) {
        for (let c = 0; c < count; c += 1) {
          if (qr.isDark(r, c)) ctx.fillRect((c + margin) * cell, (r + margin) * cell, cell, cell);
        }
      }
    };
    if (window.qrcode) {
      start();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
    script.onload = start;
    document.head.appendChild(script);
  };

  const exportPptx = () => {
    const start = () => {
      const PptxGenJS = window.PptxGenJS;
      if (!PptxGenJS) throw new Error('PPTX export library is not loaded');
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_16x9';
      pptx.rtlMode = true;
      pptx.title = title;
      presentation.slides.forEach((slide) => {
        const pptxSlide = pptx.addSlide();
        const bg = slide.background?.type === 'solid' ? slide.background.color : '#ffffff';
        pptxSlide.background = { color: bg.replace('#', '').toUpperCase() };
        slide.elements.forEach((element) => {
          if (element.kind === 'shape' && element.text) {
            const text = element.text.paragraphs
              .map((paragraph) => paragraph.runs.map((run) => run.text).join(''))
              .join('\n');
            pptxSlide.addText(text, {
              x: element.x / 100,
              y: element.y / 100,
              w: element.w / 100,
              h: element.h / 100,
              rtlMode: true,
              fontFace: 'Vazirmatn',
              fontSize: Math.max(8, element.text.paragraphs[0]?.runs[0]?.size ?? 18),
              color: (element.text.paragraphs[0]?.runs[0]?.color ?? '#0b0b0b').replace('#', '').toUpperCase(),
              align: element.text.paragraphs[0]?.align ?? 'right',
              valign: 'mid',
            });
          }
        });
      });
      pptx.writeFile({ fileName: `${title.replace(/[\\/:*?"<>|]/g, '-').slice(0, 80)}.pptx` });
    };
    if (window.PptxGenJS) {
      start();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
    script.onload = start;
    document.head.appendChild(script);
  };

  const sectionLabel = slideSection(currentSlide);

  return (
    <div className={`viewer-root ${chromeHidden ? 'chrome-hidden' : ''}`} dir="rtl" lang="fa">
      <header className="viewer-topbar">
        <div className="viewer-brand">
          <span className="viewer-brand-dot" />
          <span className="viewer-brand-text">{title}</span>
        </div>
        <div className="viewer-tools">
          <button className="viewer-btn" onClick={() => {
            try { sessionStorage.setItem('pardis-present-index', String(index)); } catch { /* storage unavailable */ }
            onEdit();
          }} title="ویرایشگر" aria-label="ویرایشگر">
            <Icon name="edit" />
          </button>
          <button className="viewer-btn" onClick={exportPptx} title="خروجی پاورپوینت" aria-label="خروجی پاورپوینت">
            <Icon name="upload" />
          </button>
          <button className={`viewer-btn ${highlightMode ? 'is-active' : ''}`} onClick={() => setHighlightMode((mode) => !mode)} title="حالت شبرنگ (H)" aria-label="حالت شبرنگ">
            <Icon name="note" />
          </button>
          <button className="viewer-btn" onClick={openQr} title="کنترل هوشمند موبایل (M)" aria-label="کنترل هوشمند">
            <Icon name="pointer" />
          </button>
          <button className="viewer-btn" onClick={clearHighlights} title="حذف شبرنگ‌ها" aria-label="حذف شبرنگ‌ها">
            <Icon name="trash" />
          </button>
          <button className="viewer-btn" onClick={() => setOverviewOpen((open) => !open)} title="نمای کلی (O)" aria-label="نمای کلی">
            <Icon name="layers" />
          </button>
          <button className="viewer-btn" onClick={zoomOut} title="کوچک‌نمایی" aria-label="کوچک‌نمایی">
            <Icon name="zoomOut" />
          </button>
          <span className="viewer-zoomtag">{Math.round(zoom * 100)}%</span>
          <button className="viewer-btn" onClick={zoomIn} title="بزرگ‌نمایی" aria-label="بزرگ‌نمایی">
            <Icon name="zoomIn" />
          </button>
          <button className={`viewer-btn ${themePanelOpen ? 'is-active' : ''}`} onClick={() => setThemePanelOpen((open) => !open)} title="انتخاب تم (D)" aria-label="انتخاب تم">
            <Icon name="background" />
          </button>
          <button className="viewer-btn" onClick={toggleFullscreen} title="تمام‌صفحه (F)" aria-label="تمام‌صفحه">
            <Icon name="fit" />
          </button>
        </div>
      </header>

      <main
        className={`viewer-stage ${highlightMode ? 'highlight-mode' : ''}`}
        ref={stageRef}
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={onStagePointerUp}
        onWheel={onWheel}
        onMouseUp={captureHighlights}
      >
        <div
          className="viewer-viewport"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${totalScale})` }}
        >
          <div
            className={`viewer-slide slide-${direction > 0 ? 'enter-next' : 'enter-prev'} ${focusLine ? 'focus-mode' : ''}`}
            ref={slideRef}
            style={{ width: presentation.width, height: presentation.height }}
          >
            <SlideSvg presentation={presentation} slide={currentSlide} idPrefix={`viewer-${index}-`} />
            <div className="viewer-line-layer">
              {lineTargets.map((line, lineIndex) => line.details ? (
                <button
                  type="button"
                  className={`viewer-line-hitbox has-details ${details?.id === line.id ? 'active' : ''}`}
                  data-details={line.details}
                  aria-haspopup="dialog"
                  tabIndex={0}
                  style={lineStyle(line)}
                  onPointerMove={(event) => focusLineAt(line, event)}
                  onPointerLeave={() => clearFocusLine(line)}
                  onFocus={() => focusLineAt(line)}
                  onBlur={() => clearFocusLine(line)}
                  onClick={() => {
                    setFocusLine(null);
                    setDetails(line);
                  }}
                  aria-label={`توضیحات بیشتر: ${line.text}`}
                  key={`${line.id}-${lineIndex}`}
                />
              ) : (
                <span
                  className="viewer-line-hitbox"
                  style={lineStyle(line)}
                  onPointerMove={(event) => focusLineAt(line, event)}
                  onPointerLeave={() => clearFocusLine(line)}
                  aria-hidden="true"
                  key={`${line.id}-${lineIndex}`}
                />
              ))}
            </div>
            {focusLine && (
              <div className="viewer-focused-line" style={focusedLineStyle} aria-hidden="true">
                <div className="viewer-focused-slide-canvas" style={focusedSlideStyle}>
                  <SlideSvg presentation={presentation} slide={currentSlide} idPrefix={`viewer-focus-${index}-`} />
                </div>
              </div>
            )}
            {slideHighlights.map((highlight) => (
              <div className="viewer-highlight-layer" key={highlight.id}>
                {highlight.rects.map((rect, rectIndex) => (
                  <button
                    type="button"
                    className="viewer-highlight-mark"
                    style={{
                      left: `${(rect.x / presentation.width) * 100}%`,
                      top: `${(rect.y / presentation.height) * 100}%`,
                      width: `${(rect.w / presentation.width) * 100}%`,
                      height: `${(rect.h / presentation.height) * 100}%`,
                    }}
                    onClick={() => removeHighlight(highlight.id)}
                    aria-label="حذف شبرنگ"
                    key={rectIndex}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="viewer-bottombar">
        <button className="viewer-nav-btn" onClick={previous} disabled={index === 0} title="اسلاید قبلی">
          <Icon name="chevronRight" />
          <span>قبلی</span>
        </button>
        <div className="viewer-center">
          <div className="viewer-progress">
            <i style={{ width: `${((index + 1) / slideCount) * 100}%` }} />
          </div>
          <div className="viewer-meta">
            <b>{index + 1}</b> / {slideCount} &nbsp;·&nbsp; {sectionLabel}
          </div>
        </div>
        <button className="viewer-nav-btn" onClick={next} disabled={index === slideCount - 1} title="اسلاید بعدی">
          <span>بعدی</span>
          <Icon name="chevronLeft" />
        </button>
      </footer>

      {overviewOpen && (
        <div className="viewer-overview">
          <button className="viewer-overview-close" onClick={() => setOverviewOpen(false)} aria-label="بازگشت">
            <Icon name="close" />
          </button>
          {presentation.slides.map((slide, slideIndex) => (
            <button
              type="button"
              className={`viewer-overview-card ${slideIndex === index ? 'is-current' : ''}`}
              onClick={() => {
                goTo(slideIndex);
                setOverviewOpen(false);
              }}
              key={slideIndex}
            >
              <span className="viewer-overview-top">
                <span className="viewer-overview-num">{slideIndex + 1}</span>
                <span className="viewer-overview-sec">{slideSection(slide)}</span>
              </span>
              <span className="viewer-overview-title">{slideTitle(slide)}</span>
            </button>
          ))}
        </div>
      )}

      {themePanelOpen && (
        <div className="viewer-theme-panel">
          <div className="viewer-theme-panel-head">
            <span className="viewer-theme-panel-title">انتخاب تم</span>
            <button className="viewer-theme-close" onClick={() => setThemePanelOpen(false)} aria-label="بستن">
              <Icon name="close" />
            </button>
          </div>
          {THEMES.map((item) => (
            <button
              type="button"
              className={`viewer-theme-opt ${theme === item.id ? 'is-active' : ''}`}
              onClick={() => {
                setTheme(item.id);
                applyTheme(item.id);
              }}
              key={item.id}
            >
              <span className="viewer-theme-sw">
                {item.sw.map((color) => <i style={{ background: color }} key={color} />)}
              </span>
              <span className="viewer-theme-opt-name">{item.name}</span>
            </button>
          ))}
        </div>
      )}

      {details && (
        <div className="viewer-detail-modal" role="dialog" aria-modal="true" onClick={() => setDetails(null)}>
          <div className="viewer-detail-card" role="document" onClick={(event) => event.stopPropagation()}>
            <button className="viewer-detail-close" onClick={() => setDetails(null)} aria-label="بستن">
              <Icon name="close" />
            </button>
            <h3>
              <span className="viewer-detail-qmark">؟</span>
              <span>توضیحات بیشتر</span>
            </h3>
            <DetailsContent value={details.details} />
          </div>
        </div>
      )}

      {qrOpen && (
        <div className="viewer-qr-modal" role="dialog" aria-modal="true" onClick={() => setQrOpen(false)}>
          <div className="viewer-qr-card" role="document" onClick={(event) => event.stopPropagation()}>
            <button className="viewer-qr-close" onClick={() => setQrOpen(false)} aria-label="بستن">
              <Icon name="close" />
            </button>
            <h3>
              <span className="viewer-detail-qmark">📱</span>
              <span>کنترل هوشمند</span>
            </h3>
            <p className="viewer-qr-sub">گوشی خود را روی کد زیر بگیرید تا این ارائه را از گوشی کنترل کنید.</p>
            <div className="viewer-qr-canvas-wrap">
              <canvas ref={qrCanvasRef} width="240" height="240" />
            </div>
            <div className="viewer-qr-status">
              <span className="viewer-qr-dot" />
              <span>در انتظار اتصال موبایل…</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
