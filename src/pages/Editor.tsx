import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { Presentation, SlideElement } from '@web-ppt/core';
import {
  disposeDoc,
  querySlideBackground,
  querySlideNotes,
  type AlignEdge,
  type ElementId,
  type ElementLayerTarget,
  type RunPropertyOverrides,
  type SlideId,
} from '@web-ppt/edit-core';
import { Brand } from '../components/Brand';
import { SlideSvg } from '../components/SlideSvg';
import { FontPicker } from '../components/editor/FontPicker';
import { ChartInsertDialog, TableInsertDialog } from '../components/editor/InsertDialogs';
import { ChartProperties } from '../components/editor/ChartProperties';
import { ObjectContextMenu } from '../components/editor/ObjectContextMenu';
import { parseReferenceSegments, plainReferenceText } from '../deck-json';
import { BUILT_IN_LAYOUTS, LAYOUT_ELEMENT_PREFIX, layoutElements, type BuiltInLayoutId } from '../editor/layouts';
import { Icon } from '../icons';
import { decodePresentationLineName, presentationLineTargets, type PresentationLineTarget } from '../presentation-interactions';
import { chartDataFromElement, createChartElement, defaultChartData, isChartElement, type ChartData, type ChartType } from '../editor/chart-model';
import {
  createRuntimeEditor,
  elementsForSlide,
  initializeShapeText,
  projectPresentation,
  replaceElementText,
  setWholeTextAlignment,
  setWholeTextParagraphProps,
  setWholeTextRunProps,
  textElementsForSlide,
  type SlideElementInfo,
  type TextElementInfo,
} from '../presentation-engine';
import { getStoredPresentation, updateStoredPresentation } from '../storage';
import type { StoredPresentation } from '../types';

interface EditorProps {
  id: string;
  onBack: () => void;
  onPresent: () => void;
}

type SaveState = 'saved' | 'saving' | 'error';
type GestureMode = 'move' | 'resize';

interface ElementFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
}

interface Gesture {
  mode: GestureMode;
  startX: number;
  startY: number;
  frame: ElementFrame;
}

interface MenuAction {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
  icon?: Parameters<typeof Icon>[0]['name'];
  action?: () => void;
}

function safePrefix(id: string): string {
  return `local-${id.replace(/[^a-zA-Z0-9_-]/g, '')}-`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function colorInputValue(color: string | undefined, fallback: string): string {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

function firstRun(info: TextElementInfo | null) {
  return info?.body.paragraphs[0]?.runs[0] ?? null;
}

function elementLabel(element: SlideElement): string {
  if (element.kind === 'shape') return element.text ? 'Text box' : element.openGeom ? 'Line' : 'Shape';
  if (element.kind === 'image') return element.media ? 'Media' : 'Image';
  if (element.kind === 'group') return 'Group';
  if (element.kind === 'table') return 'Table';
  return 'Object';
}

function elementDisplayName(element: SlideElement): string {
  const line = decodePresentationLineName(element.name);
  if (line) return `Presentation line · ${line.id}`;
  return element.name || elementLabel(element);
}

function compactNumber(value: number): number {
  return Math.round(value * 10) / 10;
}


function menuActionIcon(label: string): Parameters<typeof Icon>[0]['name'] {
  const value = label.toLowerCase();
  if (value.includes('undo')) return 'undo';
  if (value.includes('redo')) return 'redo';
  if (value.includes('save')) return 'save';
  if (value.includes('present') || value.includes('slideshow')) return 'play';
  if (value.includes('export') || value.includes('download')) return 'upload';
  if (value.includes('fit') || value.includes('zoom')) return 'fit';
  if (value.includes('slide') || value.includes('layout')) return 'layout';
  if (value.includes('text') || value.includes('font')) return 'text';
  if (value.includes('image') || value.includes('crop')) return 'image';
  if (value.includes('shape') || value.includes('line')) return 'shape';
  if (value.includes('table') || value.includes('row') || value.includes('column')) return 'table';
  if (value.includes('chart') || value.includes('data')) return 'chart';
  if (value.includes('delete') || value.includes('remove')) return 'trash';
  if (value.includes('copy')) return 'copy';
  if (value.includes('paste')) return 'paste';
  if (value.includes('cut')) return 'cut';
  if (value.includes('property')) return 'properties';
  if (value.includes('background')) return 'background';
  if (value.includes('back')) return 'chevronLeft';
  if (value.includes('help') || value.includes('shortcut')) return 'note';
  return 'menu';
}

function MenuBar({ menus }: { menus: Array<{ label: string; items: MenuAction[] }> }) {
  const [open, setOpen] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(null);
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', escape);
    };
  }, []);

  return (
    <nav className="editor-menu-bar" aria-label="Application menus" ref={rootRef}>
      {menus.map((menu) => (
        <div className="editor-menu" key={menu.label}>
          <button
            type="button"
            className={open === menu.label ? 'active' : ''}
            aria-expanded={open === menu.label}
            onClick={() => setOpen((value) => value === menu.label ? null : menu.label)}
          >
            {menu.label}
          </button>
          {open === menu.label && (
            <div className="editor-menu-popover" role="menu">
              {menu.items.map((item, index) => item.divider ? (
                <div className="editor-menu-divider" key={`divider-${index}`} />
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  className={item.danger ? 'danger' : ''}
                  disabled={item.disabled}
                  key={`${item.label}-${index}`}
                  onClick={() => {
                    item.action?.();
                    setOpen(null);
                  }}
                >
                  <span className="editor-menu-item-label"><Icon name={item.icon ?? menuActionIcon(item.label)} size={15} /><span>{item.label}</span></span>
                  {item.shortcut && <kbd>{item.shortcut}</kbd>}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}

function ReferenceDetailsText({ value }: { value: string }) {
  return value.split('\n').map((line, lineIndex) => (
    <span className="present-details-line" key={`${lineIndex}-${line}`}>
      {parseReferenceSegments(line).map((segment, segmentIndex) => {
        const content = segment.bold ? <strong>{segment.text}</strong> : segment.text;
        return segment.highlight
          ? <mark key={`${segmentIndex}-${segment.text}`}>{content}</mark>
          : <span key={`${segmentIndex}-${segment.text}`}>{content}</span>;
      })}
    </span>
  ));
}

function PresentMode({
  presentation,
  initialIndex,
  onClose,
}: {
  presentation: Presentation;
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [details, setDetails] = useState<PresentationLineTarget | null>(null);
  const [focusedLine, setFocusedLine] = useState<{
    line: PresentationLineTarget;
    rotateX: number;
    rotateY: number;
  } | null>(null);
  const previous = useCallback(() => setIndex((value) => Math.max(0, value - 1)), []);
  const next = useCallback(
    () => setIndex((value) => Math.min(presentation.slides.length - 1, value + 1)),
    [presentation.slides.length],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (details) {
        if (event.key === 'Escape') {
          event.preventDefault();
          setDetails(null);
        }
        return;
      }
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') next();
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') previous();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [details, next, onClose, previous]);

  useEffect(() => {
    setDetails(null);
    setFocusedLine(null);
  }, [index]);

  const currentSlide = presentation.slides[index];
  const lineTargets = useMemo(() => presentationLineTargets(currentSlide), [currentSlide]);
  const lineStyle = useCallback((line: PresentationLineTarget) => ({
    left: `${line.x / presentation.width * 100}%`,
    top: `${line.y / presentation.height * 100}%`,
    width: `${line.w / presentation.width * 100}%`,
    height: `${line.h / presentation.height * 100}%`,
  }), [presentation.height, presentation.width]);
  const focusLine = useCallback((line: PresentationLineTarget, event?: ReactPointerEvent<HTMLElement>) => {
    if (!event) {
      setFocusedLine({ line, rotateX: 0, rotateY: 0 });
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = Math.max(-.5, Math.min(.5, (event.clientX - rect.left) / Math.max(1, rect.width) - .5));
    const relativeY = Math.max(-.5, Math.min(.5, (event.clientY - rect.top) / Math.max(1, rect.height) - .5));
    setFocusedLine({ line, rotateX: relativeY * -6, rotateY: relativeX * 6 });
  }, []);
  const clearFocusedLine = useCallback((line: PresentationLineTarget) => {
    setFocusedLine((current) => current?.line.id === line.id ? null : current);
  }, []);
  const focusedLineStyle = useMemo<CSSProperties | undefined>(() => {
    if (!focusedLine) return undefined;
    const { line, rotateX, rotateY } = focusedLine;
    return {
      ...lineStyle(line),
      transformOrigin: '50% 50%',
      transform: `perspective(600px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(1.05)`,
    };
  }, [focusedLine, lineStyle]);
  const focusedSlideStyle = useMemo<CSSProperties | undefined>(() => {
    if (!focusedLine) return undefined;
    const { line } = focusedLine;
    return {
      left: `${-line.x / line.w * 100}%`,
      top: `${-line.y / line.h * 100}%`,
      width: `${presentation.width / line.w * 100}%`,
      height: `${presentation.height / line.h * 100}%`,
    };
  }, [focusedLine, presentation.height, presentation.width]);
  const slideBackground = currentSlide.background?.type === 'solid' ? currentSlide.background.color : '#ffffff';

  return (
    <div className="present-mode" dir="ltr" lang="en">
      <button type="button" className="present-close" onClick={onClose} aria-label="Exit slideshow">
        <Icon name="close" />
      </button>
      <div
        className={`present-stage ${focusedLine ? 'focus-mode' : ''}`}
        style={{ aspectRatio: `${presentation.width}/${presentation.height}`, background: slideBackground }}
      >
        <SlideSvg presentation={presentation} slide={currentSlide} idPrefix={`present-${index}-`} />
        {focusedLine && (
          <div className="present-focused-line" style={focusedLineStyle} aria-hidden="true">
            <div className="present-focused-slide-canvas" style={focusedSlideStyle}>
              <SlideSvg presentation={presentation} slide={currentSlide} idPrefix={`present-focus-${index}-`} />
            </div>
          </div>
        )}
        <div className="present-line-layer" aria-label="Interactive presentation lines">
          {lineTargets.map((line, lineIndex) => line.details ? (
            <button
              type="button"
              className={`present-line-hitbox has-details ${details?.id === line.id ? 'active' : ''}`}
              style={lineStyle(line)}
              onPointerMove={(event) => focusLine(line, event)}
              onPointerLeave={() => clearFocusedLine(line)}
              onFocus={() => focusLine(line)}
              onBlur={() => clearFocusedLine(line)}
              onClick={() => {
                setFocusedLine(null);
                setDetails(line);
              }}
              aria-label={`توضیحات بیشتر: ${plainReferenceText(line.text)}`}
              key={`${line.id}-${lineIndex}`}
            />
          ) : (
            <span
              className="present-line-hitbox"
              style={lineStyle(line)}
              onPointerMove={(event) => focusLine(line, event)}
              onPointerLeave={() => clearFocusedLine(line)}
              aria-hidden="true"
              key={`${line.id}-${lineIndex}`}
            />
          ))}
        </div>
      </div>
      <div className="present-controls">
        <button type="button" onClick={previous} disabled={index === 0}>
          <Icon name="chevronLeft" /> Previous
        </button>
        <span>{index + 1} / {presentation.slides.length}</span>
        <button type="button" onClick={next} disabled={index === presentation.slides.length - 1}>
          Next <Icon name="chevronRight" />
        </button>
      </div>
      {details && (
        <div className="present-details-backdrop" role="presentation" onPointerDown={() => setDetails(null)}>
          <section
            className="present-details-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="present-details-title"
            dir="rtl"
            lang="fa"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button className="present-details-close" type="button" onClick={() => setDetails(null)} aria-label="بستن توضیحات">
              <Icon name="close" />
            </button>
            <h2 id="present-details-title">
              <span className="present-details-qmark" aria-hidden="true">؟</span>
              <span>توضیحات بیشتر</span>
            </h2>
            <div className="present-details-content"><ReferenceDetailsText value={details.details} /></div>
          </section>
        </div>
      )}
    </div>
  );
}

function ToolButton({
  label,
  icon,
  active = false,
  disabled = false,
  onClick,
}: {
  label: string;
  icon: Parameters<typeof Icon>[0]['name'];
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`editor-tool-icon ${active ? 'active' : ''}`}
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={icon} size={18} />
    </button>
  );
}

function PropertiesPanel({
  selected,
  selectedText,
  background,
  layouts,
  currentLayout,
  objects,
  panelOpen,
  onClose,
  onSelect,
  onFormat,
  onAlign,
  onLineHeight,
  onTransform,
  onFill,
  onStroke,
  onBackground,
  onLayout,
  onLayer,
  onDelete,
}: {
  selected: SlideElementInfo | null;
  selectedText: TextElementInfo | null;
  background: string;
  layouts: Array<{ id: string; name: string }>;
  currentLayout: string;
  objects: SlideElementInfo[];
  panelOpen: boolean;
  onClose: () => void;
  onSelect: (id: ElementId) => void;
  onFormat: (props: RunPropertyOverrides) => void;
  onAlign: (align: 'left' | 'center' | 'right') => void;
  onLineHeight: (value: number) => void;
  onTransform: (value: Partial<ElementFrame>) => void;
  onFill: (color: string) => void;
  onStroke: (color: string) => void;
  onBackground: (color: string) => void;
  onLayout: (layoutId: string) => void;
  onLayer: (target: ElementLayerTarget) => void;
  onDelete: () => void;
}) {
  const [backgroundPaletteOpen, setBackgroundPaletteOpen] = useState(false);
  const element = selected?.element;
  const canEditFrame = Boolean(selected && selected.editable !== 'none' && !selected.locked);
  const run = firstRun(selectedText);
  const paragraph = selectedText?.body.paragraphs[0];
  const fill = element?.kind === 'shape' && element.fill?.type === 'solid' ? element.fill.color : '#7257ff';
  const stroke = element && (element.kind === 'shape' || element.kind === 'image') ? element.stroke?.color : undefined;

  return (
    <aside className={`editor-properties ${panelOpen ? 'is-open' : ''}`} aria-label="Properties panel">
      <header className="properties-heading">
        <div>
          <span className="properties-icon"><Icon name={selected ? 'edit' : 'panel'} size={17} /></span>
          <div>
            <h2>{selected ? elementLabel(selected.element) : 'Slide properties'}</h2>
            <p>{selected ? 'Format and arrange the selected object' : 'Customize the current slide'}</p>
          </div>
        </div>
        <button type="button" className="properties-mobile-close" onClick={onClose} aria-label="Close properties">
          <Icon name="close" />
        </button>
      </header>

      {selected && element ? (
        <div className="properties-scroll">
          <section className="property-group">
            <div className="property-group-title">
              <h3>Size &amp; position</h3>
              {selected.locked && <span className="property-badge">Locked</span>}
            </div>
            <div className="property-grid property-grid-four">
              {(['x', 'y', 'w', 'h'] as const).map((key) => (
                <label key={key}>
                  <span>{key.toUpperCase()}</span>
                  <input
                    type="number"
                    value={compactNumber(element[key])}
                    disabled={!canEditFrame}
                    onChange={(event) => onTransform({ [key]: Number(event.target.value) })}
                  />
                </label>
              ))}
            </div>
            <label className="property-wide-field">
              <span>Rotation</span>
              <input
                type="number"
                value={compactNumber(element.rot)}
                disabled={!canEditFrame}
                onChange={(event) => onTransform({ rot: Number(event.target.value) })}
              />
              <b>°</b>
            </label>
          </section>

          {selectedText && (
            <section className="property-group">
              <h3>Text</h3>
              <p className="inline-edit-hint">Double-click the text on the slide to edit it in place.</p>
              <div className="property-grid property-grid-two text-property-grid">
                <label>
                  <span>Font</span>
                  <select
                    value={run?.fonts?.[0] ?? 'Vazirmatn'}
                    onChange={(event) => onFormat({ font: event.target.value })}
                    disabled={!selectedText.editable}
                  >
                    <option value="MAD Social">MAD Social</option>
                    <option value="Vazirmatn">Vazirmatn</option>
                    <option value="IRANSansX">IRANSansX</option>
                    <option value="IRANSans">IRANSans</option>
                    <option value="Tahoma">Tahoma</option>
                    <option value="Segoe UI">Segoe UI</option>
                    <option value="Inter">Inter</option>
                    <option value="JetBrains Mono">JetBrains Mono</option>
                    <option value="Arial">Arial</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Times New Roman">Times New Roman</option>
                  </select>
                </label>
                <label>
                  <span>Size</span>
                  <input
                    type="number"
                    min="6"
                    max="240"
                    value={Math.round(run?.size ?? 24)}
                    onChange={(event) => onFormat({ size: Number(event.target.value) })}
                    disabled={!selectedText.editable}
                  />
                </label>
              </div>
              <div className="property-format-row" aria-label="Text formatting">
                <button type="button" className={run?.b ? 'active' : ''} onClick={() => onFormat({ b: !run?.b })} aria-label="Bold"><b>B</b></button>
                <button type="button" className={run?.i ? 'active' : ''} onClick={() => onFormat({ i: !run?.i })} aria-label="Italic"><i>I</i></button>
                <button type="button" className={run?.u ? 'active' : ''} onClick={() => onFormat({ u: !run?.u })} aria-label="Underline"><u>U</u></button>
                <label className="property-color-button" title="Text color">
                  <span>A</span>
                  <input type="color" value={colorInputValue(run?.color, '#17141d')} onChange={(event) => onFormat({ color: event.target.value })} aria-label="Text color" />
                </label>
              </div>
              <div className="property-format-row" aria-label="Text alignment">
                <button type="button" className={paragraph?.align === 'left' ? 'active' : ''} onClick={() => onAlign('left')} aria-label="Align left"><Icon name="alignLeft" size={17} /></button>
                <button type="button" className={paragraph?.align === 'center' ? 'active' : ''} onClick={() => onAlign('center')} aria-label="Align center"><Icon name="alignCenter" size={17} /></button>
                <button type="button" className={paragraph?.align === 'right' ? 'active' : ''} onClick={() => onAlign('right')} aria-label="Align right"><Icon name="alignRight" size={17} /></button>
                <select value={paragraph?.lineHeight ?? 1.15} onChange={(event) => onLineHeight(Number(event.target.value))} aria-label="Line spacing">
                  <option value="1">1.0</option>
                  <option value="1.15">1.15</option>
                  <option value="1.5">1.5</option>
                  <option value="2">2.0</option>
                </select>
              </div>
            </section>
          )}

          {(element.kind === 'shape' || element.kind === 'image') && (
            <section className="property-group">
              <h3>Appearance</h3>
              <div className="property-grid property-grid-two">
                {element.kind === 'shape' && (
                  <label className="property-color-field">
                    <span>Fill</span>
                    <input type="color" value={colorInputValue(fill, '#7257ff')} onChange={(event) => onFill(event.target.value)} disabled={!canEditFrame} />
                  </label>
                )}
                <label className="property-color-field">
                  <span>Border</span>
                  <input type="color" value={colorInputValue(stroke, '#2f5597')} onChange={(event) => onStroke(event.target.value)} disabled={!canEditFrame} />
                </label>
              </div>
            </section>
          )}

          <section className="property-group">
            <h3>Arrange</h3>
            <div className="arrange-grid">
              <button type="button" onClick={() => onLayer('front')} disabled={!canEditFrame}><Icon name="bringFront" size={17} /> Bring to front</button>
              <button type="button" onClick={() => onLayer('back')} disabled={!canEditFrame}><Icon name="sendBack" size={17} /> Send to back</button>
              <button type="button" onClick={() => onLayer('forward')} disabled={!canEditFrame}>Bring forward</button>
              <button type="button" onClick={() => onLayer('backward')} disabled={!canEditFrame}>Send backward</button>
            </div>
          </section>

          <section className="property-group property-danger-zone">
            <button type="button" onClick={onDelete} disabled={!canEditFrame}><Icon name="trash" size={17} /> Delete object</button>
          </section>
        </div>
      ) : (
        <div className="properties-scroll">
          <section className="property-group">
            <h3>Canvas</h3>
            <div className="background-color-control">
              <button type="button" className="property-color-field property-slide-color background-color-trigger" aria-expanded={backgroundPaletteOpen} onClick={() => setBackgroundPaletteOpen((open) => !open)}>
                <span>Background</span><i style={{ background }} aria-hidden="true" /><span className="background-hex">{background.toUpperCase()}</span><Icon name="chevronDown" size={13} />
              </button>
              {backgroundPaletteOpen && <div className="background-color-popover" role="group" aria-label="Background colors">
                <strong>Choose a background</strong>
                <div className="background-swatch-grid">{['#FFFFFF','#F8FAFC','#E2E8F0','#CBD5E1','#94A3B8','#64748B','#334155','#0F172A','#FFF7ED','#FFEDD5','#FED7AA','#FDBA74','#FEE2E2','#FCA5A5','#FBCFE8','#F5D0FE','#EDE9FE','#C4B5FD','#A5B4FC','#BFDBFE','#BAE6FD','#A7F3D0','#BBF7D0','#D9F99D','#FEF08A','#FDE68A','#FDE047','#FACC15','#F97316','#EF4444','#DB2777','#7C3AED','#4F46E5','#2563EB','#0284C7','#0D9488','#16A34A','#65A30D'].map((color) => <button key={color} type="button" title={color} aria-label={`Set background ${color}`} style={{ background: color }} onClick={() => { onBackground(color); setBackgroundPaletteOpen(false); }} />)}</div>
                <label className="custom-background-color"><span>Custom color</span><input type="color" value={background} onChange={(event) => onBackground(event.target.value)} /></label>
              </div>}
            </div>
            <label className="property-select-field">
              <span>Layout</span>
              <select value={currentLayout} disabled={!layouts.length} onChange={(event) => onLayout(event.target.value)}>
                {!layouts.length && <option value="">Source layout</option>}
                {layouts.map((layout) => <option value={layout.id} key={layout.id}>{layout.name}</option>)}
              </select>
            </label>
          </section>
          <section className="property-group object-list-section">
            <div className="property-group-title"><h3>Objects</h3><span>{objects.length}</span></div>
            <div className="object-list">
              {[...objects].reverse().map((item) => (
                <button type="button" key={item.id} onClick={() => onSelect(item.id)}>
                  <Icon name={item.element.kind === 'image' ? 'image' : item.element.kind === 'shape' && item.element.text ? 'text' : 'shape'} size={16} />
                  <span>{elementDisplayName(item.element)}</span>
                </button>
              ))}
              {!objects.length && <p>This slide has no editable objects.</p>}
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}

export function EditorPage({ id, onBack, onPresent }: EditorProps) {
  const [record, setRecord] = useState<StoredPresentation | null>(() => getStoredPresentation(id));
  const [runtime, setRuntime] = useState(() => record ? createRuntimeEditor(record.presentation, safePrefix(record.id)) : null);
  const [version, setVersion] = useState(0);
  const [slideId, setSlideId] = useState<SlideId | null>(() => runtime?.doc.slideOrder[0] ?? null);
  const [selectedElementId, setSelectedElementId] = useState<ElementId | null>(null);
  const [editingTextId, setEditingTextId] = useState<ElementId | null>(null);
  const [inlineText, setInlineText] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [notesOverrides, setNotesOverrides] = useState<Record<SlideId, string>>({});
  const [notesOpen, setNotesOpen] = useState(true);
  const [zoom, setZoom] = useState(.72);
  const [zoomMode, setZoomMode] = useState<'fit' | 'manual'>('fit');
  const [panMode, setPanMode] = useState(false);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const panGestureRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [title, setTitle] = useState(record?.title ?? '');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [toast, setToast] = useState<string | null>(null);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [chartDialogOpen, setChartDialogOpen] = useState(false);
  const [chartEditOpen, setChartEditOpen] = useState(false);
  const [chartDraft, setChartDraft] = useState<ChartData | null>(null);
  const [layoutOverrides, setLayoutOverrides] = useState<Record<string, string>>({});
  const [contextMenu, setContextMenu] = useState<{ id: SlideId; x: number; y: number } | null>(null);
  const [objectContextMenu, setObjectContextMenu] = useState<{ id: ElementId; x: number; y: number } | null>(null);
  const [draggedSlideId, setDraggedSlideId] = useState<SlideId | null>(null);
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [gesturePreview, setGesturePreview] = useState<ElementFrame | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const stageViewportRef = useRef<HTMLDivElement>(null);
  const slideCanvasRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const gesturePreviewRef = useRef<ElementFrame | null>(null);
  const autosaveRevision = useRef(0);
  const autosaveReady = useRef(false);

  useEffect(() => {
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
    return () => {
      document.documentElement.lang = 'fa';
      document.documentElement.dir = 'rtl';
    };
  }, []);

  useEffect(() => {
    if (!runtime) return;
    const unsubscribe = runtime.editor.subscribe(() => setVersion((value) => value + 1));
    return () => {
      unsubscribe();
      disposeDoc(runtime.doc);
    };
  }, [runtime]);

  const projected = useMemo(() => {
    if (!runtime || !record) return null;
    const presentation = projectPresentation(runtime.editor, record.presentation);
    runtime.doc.slideOrder.forEach((itemSlideId, index) => {
      if (Object.prototype.hasOwnProperty.call(notesOverrides, itemSlideId)) {
        presentation.slides[index].notes = notesOverrides[itemSlideId];
      }
    });
    return presentation;
  }, [notesOverrides, runtime, record, version]);

  const slideIndex = runtime && slideId ? runtime.doc.slideOrder.indexOf(slideId) : -1;
  const currentSlide = projected && slideIndex >= 0 ? projected.slides[slideIndex] : null;
  const allElements = useMemo(
    () => runtime && slideId ? elementsForSlide(runtime.editor, slideId) : [],
    [runtime, slideId, version],
  );
  const topLevelElements = useMemo(() => allElements.filter((item) => item.topLevel), [allElements]);
  const textElements = useMemo(
    () => runtime && slideId ? textElementsForSlide(runtime.editor, slideId) : [],
    [runtime, slideId, version],
  );
  const selected = allElements.find((item) => item.id === selectedElementId) ?? null;
  const selectedText = textElements.find((item) => item.id === selectedElementId) ?? null;
  const notesValue = runtime && slideId
    ? notesOverrides[slideId] ?? querySlideNotes(runtime.doc, [slideId]).value
    : '';
  const backgroundState = runtime && slideId ? querySlideBackground(runtime.doc, [slideId]).value : null;
  const background = colorInputValue(backgroundState?.type === 'solid' ? backgroundState.color : undefined, '#ffffff');


  useEffect(() => {
    setNotesDraft(notesValue);
  }, [slideId, notesValue]);

  useEffect(() => {
    if (!objectContextMenu) return;
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('.object-context-menu')) return;
      setObjectContextMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setObjectContextMenu(null);
    };
    window.addEventListener('pointerdown', closeOnOutside);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('pointerdown', closeOnOutside);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [objectContextMenu]);

  useEffect(() => {
    if (selectedElementId && !selected) {
      setSelectedElementId(null);
      setEditingTextId(null);
    }
  }, [selected, selectedElementId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const close = () => {
      setContextMenu(null);
      setObjectContextMenu(null);
      setShapeMenuOpen(false);
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('scroll', close, true);
    };
  }, []);

  const snapshotPresentation = useCallback(() => {
    if (!runtime || !record) return null;
    const presentation = projectPresentation(runtime.editor, record.presentation);
    runtime.doc.slideOrder.forEach((itemSlideId, index) => {
      if (Object.prototype.hasOwnProperty.call(notesOverrides, itemSlideId)) {
        presentation.slides[index].notes = notesOverrides[itemSlideId];
      }
    });
    if (slideId) {
      const currentIndex = runtime.doc.slideOrder.indexOf(slideId);
      if (currentIndex >= 0) presentation.slides[currentIndex].notes = notesDraft;
    }
    return presentation;
  }, [notesDraft, notesOverrides, record, runtime, slideId]);

  const persist = useCallback((announce = false) => {
    if (!runtime || !record) return false;
    try {
      const presentation = snapshotPresentation();
      if (!presentation) return false;
      const updated = updateStoredPresentation(record.id, {
        title: title.trim() || 'Untitled presentation',
        presentation,
      });
      if (!updated) throw new Error('Missing presentation');
      runtime.editor.markSaved();
      setRecord(updated);
      setTitle(updated.title);
      setSaveState('saved');
      if (announce) setToast('Presentation saved');
      return true;
    } catch {
      setSaveState('error');
      if (announce) setToast('Could not save this presentation');
      return false;
    }
  }, [record, runtime, snapshotPresentation, title]);



  useEffect(() => {
    if (!runtime || !record) return;
    if (!autosaveReady.current) {
      autosaveReady.current = true;
      return;
    }
    const revision = ++autosaveRevision.current;
    setSaveState('saving');
    const timer = window.setTimeout(() => {
      if (revision !== autosaveRevision.current) return;
      persist(false);
    }, 850);
    return () => window.clearTimeout(timer);
  }, [notesDraft, notesOverrides, version, title]);

  const fitToScreen = useCallback(() => {
    if (!projected || !stageViewportRef.current) return;
    const viewport = stageViewportRef.current;
    // Measure the actual canvas viewport (not the full editor, toolbar, or notes).
    // In landscape mode the available height can change dramatically when browser
    // chrome and the mobile toolbar resize.
    const availableWidth = Math.max(1, viewport.clientWidth - 24);
    const availableHeight = Math.max(1, viewport.clientHeight - 24);
    const next = clamp(Math.min(availableWidth / projected.width, availableHeight / projected.height), .1, 1.5);
    setZoom(Math.round(next * 1000) / 1000);
    setCanvasPan({ x: 0, y: 0 });
    viewport.scrollTo({ left: 0, top: 0, behavior: 'auto' });
  }, [projected]);

  useEffect(() => {
    if (zoomMode !== 'fit' || !stageViewportRef.current) return;
    const observer = new ResizeObserver(fitToScreen);
    observer.observe(stageViewportRef.current);
    const frame = window.requestAnimationFrame(fitToScreen);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [fitToScreen, notesOpen, zoomMode]);

  const commitNotes = useCallback(() => {
    if (!runtime || !slideId || notesDraft === notesValue) return;
    if (runtime.doc.package && !runtime.doc.meta.readonly) {
      try {
        runtime.editor.exec({ type: 'SetNotes', id: slideId, text: notesDraft });
      } catch {
        setToast('Speaker notes could not be updated');
      }
      return;
    }
    setNotesOverrides((value) => ({ ...value, [slideId]: notesDraft }));
  }, [notesDraft, notesValue, runtime, slideId]);

  const handlePresent = useCallback(() => {
    commitNotes();
    persist(false);
    try {
      sessionStorage.setItem('pardis-present-index', String(Math.max(0, slideIndex)));
    } catch {
      // storage unavailable
    }
    onPresent();
  }, [commitNotes, persist, onPresent, slideIndex]);

  useEffect(() => {
    if (!runtime || !slideId || notesDraft === notesValue) return;
    const timer = window.setTimeout(commitNotes, 650);
    return () => window.clearTimeout(timer);
  }, [commitNotes, notesDraft, notesValue, runtime, slideId]);

  const selectSlide = useCallback((nextId: SlideId) => {
    commitNotes();
    setSlideId(nextId);
    setSelectedElementId(null);
    setEditingTextId(null);
    setNavigatorOpen(false);
  }, [commitNotes]);

  const selectElement = useCallback((elementId: ElementId) => {
    setSelectedElementId(elementId);
    setPropertiesOpen(true);
    setEditingTextId(null);
  }, []);

  const runSafely = useCallback((action: () => void, errorMessage = 'This action is not available for the selected object') => {
    try {
      action();
    } catch {
      setToast(errorMessage);
    }
  }, []);


  const formatText = useCallback((props: RunPropertyOverrides) => {
    if (!runtime || !selectedText?.editable) return;
    runSafely(() => setWholeTextRunProps(runtime.editor, selectedText, props), 'Text formatting is not available for this object');
  }, [runSafely, runtime, selectedText]);

  const alignText = useCallback((align: 'left' | 'center' | 'right') => {
    if (!runtime || !selectedText?.editable) return;
    runSafely(() => setWholeTextAlignment(runtime.editor, selectedText, align));
  }, [runSafely, runtime, selectedText]);

  const setLineHeight = useCallback((lineHeight: number) => {
    if (!runtime || !selectedText?.editable) return;
    runSafely(() => setWholeTextParagraphProps(runtime.editor, selectedText, { lineHeight }));
  }, [runSafely, runtime, selectedText]);

  const transformElement = useCallback((frame: Partial<ElementFrame>) => {
    if (!runtime || !selected) return;
    runSafely(() => runtime.editor.exec({ type: 'SetXfrm', id: selected.id, ...frame }));
  }, [runSafely, runtime, selected]);

  const removeSelected = useCallback(() => {
    if (!runtime || !selected) return;
    runSafely(() => {
      runtime.editor.exec({ type: 'RemoveElement', id: selected.id });
      setSelectedElementId(null);
      setEditingTextId(null);
    }, 'This object cannot be deleted');
  }, [runSafely, runtime, selected]);

  const duplicateObject = useCallback(() => {
    if (!runtime || !record || !projected || !selected || slideIndex < 0) return;
    try {
      const nextPresentation = structuredClone(projected);
      const slide = nextPresentation.slides[slideIndex];
      if (!slide) return;
      let originalIndex = slide.elements.findIndex((element) => JSON.stringify(element) === JSON.stringify(selected.element));
      if (originalIndex < 0) {
        originalIndex = slide.elements.findIndex((element) => element.kind === selected.element.kind
          && element.x === selected.element.x && element.y === selected.element.y
          && element.w === selected.element.w && element.h === selected.element.h
          && (!selected.element.name || element.name === selected.element.name));
      }
      const original = originalIndex >= 0 ? slide.elements[originalIndex] : null;
      if (!original) {
        setToast('Could not duplicate this object');
        return;
      }
      const duplicate = structuredClone(original);
      const baseName = original.name || `object-${Date.now()}`;
      const duplicateName = `${baseName}-copy-${Date.now()}`;
      duplicate.name = duplicateName;
      duplicate.x = Math.min(Math.max(0, original.x + 24), Math.max(0, projected.width - original.w));
      duplicate.y = Math.min(Math.max(0, original.y + 24), Math.max(0, projected.height - original.h));
      slide.elements.push(duplicate);
      const nextRuntime = createRuntimeEditor(nextPresentation, `${safePrefix(record.id)}duplicate-${Date.now()}-`);
      const nextSlideId = nextRuntime.doc.slideOrder[slideIndex];
      const created = nextSlideId ? elementsForSlide(nextRuntime.editor, nextSlideId).find((item) => item.element.name === duplicateName) : null;
      setRuntime(nextRuntime);
      setRecord((value) => value ? { ...value, presentation: nextPresentation } : value);
      setSlideId(nextSlideId ?? null);
      setSelectedElementId(created?.id ?? null);
      setEditingTextId(null);
      setObjectContextMenu(null);
      setToast('Object duplicated');
    } catch {
      setToast('Could not duplicate this object');
    }
  }, [projected, record, runtime, selected, slideIndex]);

  const setLayer = useCallback((to: ElementLayerTarget) => {
    if (!runtime || !selected) return;
    runSafely(() => runtime.editor.exec({ type: 'SetZ', id: selected.id, to }));
  }, [runSafely, runtime, selected]);

  const alignElement = useCallback((edge: AlignEdge) => {
    if (!runtime || !selected) return;
    runSafely(() => runtime.editor.exec({ type: 'AlignElements', ids: [selected.id], edge }));
  }, [runSafely, runtime, selected]);

  const addShape = useCallback((preset: 'rect' | 'roundRect' | 'ellipse' | 'line') => {
    if (!runtime || !slideId || !projected) return;
    runSafely(() => {
      const line = preset === 'line';
      const result = runtime.editor.exec({
        type: 'AddShape',
        slideId,
        preset,
        rect: line
          ? { x: projected.width * .3, y: projected.height * .45, w: projected.width * .4, h: projected.height * .1 }
          : { x: projected.width * .35, y: projected.height * .3, w: projected.width * .3, h: projected.height * .28 },
      });
      const created = result.selection.kind === 'elements' ? result.selection.ids[0] : null;
      if (created) selectElement(created);
      setShapeMenuOpen(false);
    }, 'A shape could not be added to this document');
  }, [projected, runSafely, runtime, selectElement, slideId]);

  const addTextBox = useCallback(() => {
    if (!runtime || !slideId || !projected) return;
    runSafely(() => {
      const result = runtime.editor.exec({
        type: 'AddShape',
        slideId,
        preset: 'rect',
        rect: { x: projected.width * .2, y: projected.height * .35, w: projected.width * .6, h: projected.height * .16 },
      });
      const created = result.selection.kind === 'elements' ? result.selection.ids[0] : null;
      if (!created) return;
      runtime.editor.exec(
        { type: 'SetFill', id: created, fill: { type: 'none' } },
        { type: 'SetStroke', id: created, stroke: { type: 'none' } },
      );
      initializeShapeText(runtime.editor, created, 'Double-click to edit');
      selectElement(created);
    }, 'A text box could not be added to this document');
  }, [projected, runSafely, runtime, selectElement, slideId]);

  const insertTable = useCallback((rows: number, columns: number) => {
    if (!runtime || !slideId || !projected) return;
    runSafely(() => {
      const result = runtime.editor.exec({
        type: 'AddTable',
        slideId,
        rows,
        cols: columns,
        rect: { x: projected.width * .16, y: projected.height * .2, w: projected.width * .68, h: projected.height * .56 },
      });
      const created = result.selection.kind === 'elements' ? result.selection.ids[0] : null;
      if (created) selectElement(created);
      setTableDialogOpen(false);
    }, 'A table could not be added to this slide');
  }, [projected, runSafely, runtime, selectElement, slideId]);

  const insertChart = useCallback((type: ChartType) => {
    if (!runtime || !record || !projected || slideIndex < 0) return;
    try {
      const nextPresentation = structuredClone(projected);
      const slide = nextPresentation.slides[slideIndex];
      if (!slide) return;
      slide.elements.push(createChartElement(defaultChartData(type), projected.width * .18, projected.height * .18, projected.width * .64, projected.height * .58));
      const nextRuntime = createRuntimeEditor(nextPresentation, `${safePrefix(record.id)}chart-${Date.now()}-`);
      const nextSlideId = nextRuntime.doc.slideOrder[slideIndex];
      const chart = nextSlideId ? elementsForSlide(nextRuntime.editor, nextSlideId).find((item) => isChartElement(item.element)) : null;
      setRuntime(nextRuntime);
      setRecord((value) => value ? { ...value, presentation: nextPresentation } : value);
      setSlideId(nextSlideId ?? null);
      setSelectedElementId(chart?.id ?? null);
      setPropertiesOpen(true);
      setChartDialogOpen(false);
      setToast('Chart inserted. Edit its data from the chart context menu.');
    } catch {
      setToast('The chart could not be inserted');
    }
  }, [projected, record, runtime, slideIndex]);

  const openChartEditor = useCallback(() => {
    if (!selected || !isChartElement(selected.element)) return;
    const data = chartDataFromElement(selected.element);
    if (!data) return;
    setChartDraft(structuredClone(data));
    setChartEditOpen(true);
    setObjectContextMenu(null);
  }, [selected]);

  const applyChartDraft = useCallback(() => {
    if (!runtime || !record || !projected || !chartDraft || !selected || !isChartElement(selected.element) || slideIndex < 0) return;
    try {
      const nextPresentation = structuredClone(projected);
      const slide = nextPresentation.slides[slideIndex];
      if (!slide) return;
      const selectedName = selected.element.name;
      const index = slide.elements.findIndex((element) => element.kind === 'group' && element.name === selectedName);
      if (index < 0) return;
      const previous = slide.elements[index];
      if (previous.kind !== 'group') return;
      slide.elements[index] = createChartElement(chartDraft, previous.x, previous.y, previous.w, previous.h);
      slide.elements[index].rot = previous.rot;
      slide.elements[index].flipH = previous.flipH;
      slide.elements[index].flipV = previous.flipV;
      const nextRuntime = createRuntimeEditor(nextPresentation, `${safePrefix(record.id)}chart-edit-${Date.now()}-`);
      const nextSlideId = nextRuntime.doc.slideOrder[slideIndex];
      const chart = nextSlideId ? elementsForSlide(nextRuntime.editor, nextSlideId).find((item) => isChartElement(item.element)) : null;
      setRuntime(nextRuntime);
      setRecord((value) => value ? { ...value, presentation: nextPresentation } : value);
      setSlideId(nextSlideId ?? null);
      setSelectedElementId(chart?.id ?? null);
      setChartEditOpen(false);
      setToast('Chart data updated');
    } catch {
      setToast('Chart data could not be applied');
    }
  }, [chartDraft, projected, record, runtime, selected, slideIndex]);

  const applySlideLayout = useCallback((layoutId: string) => {
    if (!runtime || !slideId || !projected) return;
    if (!BUILT_IN_LAYOUTS.some((layout) => layout.id === layoutId)) {
      runSafely(() => runtime.editor.exec({ type: 'SetLayout', id: slideId, layoutId }), 'The selected layout could not be applied');
      return;
    }
    runSafely(() => {
      const existing = elementsForSlide(runtime.editor, slideId).filter((item) =>
        item.topLevel && item.element.name?.startsWith(LAYOUT_ELEMENT_PREFIX));
      for (const item of existing) runtime.editor.exec({ type: 'RemoveElement', id: item.id });
      const placeholders = layoutElements(layoutId as BuiltInLayoutId, projected.width, projected.height);
      for (const placeholder of placeholders) {
        const result = runtime.editor.exec({
          type: 'AddShape',
          slideId,
          preset: 'rect',
          rect: { x: placeholder.x, y: placeholder.y, w: placeholder.w, h: placeholder.h },
        });
        const id = result.selection.kind === 'elements' ? result.selection.ids[0] : null;
        if (!id) continue;
        runtime.editor.exec(
          { type: 'SetName', id, name: placeholder.name ?? `${LAYOUT_ELEMENT_PREFIX}placeholder` },
          { type: 'SetFill', id, fill: { type: 'none' } },
          { type: 'SetStroke', id, stroke: { type: 'none' } },
        );
        const label = placeholder.text?.paragraphs.map((paragraph) => paragraph.runs.map((run) => run.text).join('')).join('\n') ?? '';
        if (label) initializeShapeText(runtime.editor, id, label);
        if (placeholder.text?.paragraphs[0]?.align) {
          const infos = textElementsForSlide(runtime.editor, slideId);
          const info = infos.find((item) => item.id === id);
          if (info && ['left', 'center', 'right'].includes(placeholder.text.paragraphs[0].align)) setWholeTextAlignment(runtime.editor, info, placeholder.text.paragraphs[0].align as 'left' | 'center' | 'right');
        }
      }
      setLayoutOverrides((value) => ({ ...value, [slideId]: layoutId }));
      setSelectedElementId(null);
      setVersion((value) => value + 1);
    }, 'The selected layout could not be applied');
  }, [projected, runSafely, runtime, slideId]);

  const addSlide = useCallback((afterId: SlideId = slideId!) => {
    if (!runtime || !afterId) return;
    const source = runtime.doc.slides[afterId];
    const layoutId = source?.layoutId ?? runtime.doc.layoutOrder[0];
    if (layoutId && runtime.doc.package && !runtime.doc.meta.readonly) {
      runSafely(() => {
        const result = runtime.editor.exec({ type: 'AddSlide', layoutId, at: { after: afterId } });
        const created = [...result.createdSlides][0];
        if (created) {
          const inheritedChildren = [...(runtime.doc.slides[created]?.children ?? [])];
          for (const childId of inheritedChildren) runtime.editor.exec({ type: 'RemoveElement', id: childId });
          selectSlide(created);
        }
      }, 'A new slide could not be created');
      return;
    }
    commitNotes();
    runSafely(() => {
      if (!record) return;
      const presentation = snapshotPresentation();
      if (!presentation) return;
      const sourceIndex = runtime.doc.slideOrder.indexOf(afterId);
      const sourceSlide = presentation.slides[sourceIndex];
      const copy = JSON.parse(JSON.stringify({
        ...sourceSlide,
        elements: [],
        background: sourceSlide.background ?? { type: 'solid', color: '#ffffff' },
      })) as typeof presentation.slides[number];
      presentation.slides.splice(sourceIndex + 1, 0, copy);
      const nextRuntime = createRuntimeEditor(presentation, `${safePrefix(record.id)}${Date.now()}-`);
      ++autosaveRevision.current;
      setRecord((value) => value ? { ...value, presentation } : value);
      setRuntime(nextRuntime);
      setNotesOverrides({});
      setVersion((value) => value + 1);
      setSlideId(nextRuntime.doc.slideOrder[sourceIndex + 1]);
      setSelectedElementId(null);
      setEditingTextId(null);
      setNavigatorOpen(false);
    }, 'A new slide could not be created');
  }, [commitNotes, record, runSafely, runtime, selectSlide, slideId, snapshotPresentation]);

  const duplicateSlide = useCallback((targetId: SlideId = slideId!) => {
    if (!runtime || !targetId) return;
    if (!runtime.doc.package || runtime.doc.meta.readonly) {
      addSlide(targetId);
      return;
    }
    runSafely(() => {
      const result = runtime.editor.exec({ type: 'DuplicateSlide', id: targetId });
      const created = [...result.createdSlides][0];
      if (created) selectSlide(created);
    }, 'This slide could not be duplicated');
  }, [addSlide, runSafely, runtime, selectSlide, slideId]);

  const removeSlide = useCallback((targetId: SlideId = slideId!) => {
    if (!runtime || !targetId) return;
    if (runtime.doc.slideOrder.length === 1) {
      setToast('A presentation must contain at least one slide');
      return;
    }
    runSafely(() => {
      const index = runtime.doc.slideOrder.indexOf(targetId);
      runtime.editor.exec({ type: 'RemoveSlide', id: targetId });
      if (targetId === slideId) {
        const fallback = runtime.doc.slideOrder[Math.min(index, runtime.doc.slideOrder.length - 1)];
        if (fallback) selectSlide(fallback);
      }
    }, 'This slide could not be deleted');
  }, [runSafely, runtime, selectSlide, slideId]);

  const reorderSlide = useCallback((movingId: SlideId, targetId: SlideId, after: boolean) => {
    if (!runtime || movingId === targetId) return;
    const remaining = runtime.doc.slideOrder.filter((item) => item !== movingId);
    const targetIndex = remaining.indexOf(targetId);
    if (targetIndex < 0) return;
    const insertionIndex = targetIndex + (after ? 1 : 0);
    const anchor = insertionIndex === 0 ? null : remaining[insertionIndex - 1];
    runSafely(() => runtime.editor.exec({ type: 'MoveSlide', id: movingId, at: { after: anchor } }), 'Slides could not be reordered');
  }, [runSafely, runtime]);

  const openImagePicker = useCallback(() => imageInputRef.current?.click(), []);

  const insertImage = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !runtime || !slideId || !projected) return;
    const supported = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const;
    if (!supported.includes(file.type as typeof supported[number])) {
      setToast('Choose a PNG, JPEG, GIF, or WebP image');
      return;
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const maxW = projected.width * .42;
      const maxH = projected.height * .46;
      let width = maxW;
      let height = maxH;
      try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(maxW / bitmap.width, maxH / bitmap.height, 1);
        width = bitmap.width * scale;
        height = bitmap.height * scale;
        bitmap.close();
      } catch {
        // The editor can still insert formats the browser cannot decode for measurement.
      }
      const result = runtime.editor.exec({
        type: 'AddImage',
        slideId,
        bytes,
        mime: file.type as typeof supported[number],
        rect: { x: (projected.width - width) / 2, y: (projected.height - height) / 2, w: width, h: height },
      });
      const created = result.selection.kind === 'elements' ? result.selection.ids[0] : null;
      if (created) selectElement(created);
      setToast('Image added');
    } catch {
      setToast('The image could not be inserted');
    }
  }, [projected, runtime, selectElement, slideId]);

  const beginTextEdit = useCallback((info: TextElementInfo) => {
    if (!info.editable) {
      setToast('This text is read-only');
      return;
    }
    setSelectedElementId(info.id);
    setInlineText(info.text);
    setEditingTextId(info.id);
  }, []);

  const commitInlineText = useCallback(() => {
    if (!runtime || !editingTextId) return;
    const info = textElements.find((item) => item.id === editingTextId);
    if (info?.editable && inlineText !== info.text) {
      runSafely(() => replaceElementText(runtime.editor, info, inlineText), 'Text could not be updated');
    }
    setEditingTextId(null);
  }, [editingTextId, inlineText, runSafely, runtime, textElements]);

  const beginGesture = useCallback((mode: GestureMode, event: ReactPointerEvent, info: SlideElementInfo) => {
    if (info.editable === 'none' || info.locked) return;
    event.preventDefault();
    event.stopPropagation();
    selectElement(info.id);
    const frame = { x: info.element.x, y: info.element.y, w: info.element.w, h: info.element.h, rot: info.element.rot };
    gesturePreviewRef.current = frame;
    setGesturePreview(frame);
    setGesture({ mode, startX: event.clientX, startY: event.clientY, frame });
  }, [selectElement]);

  useEffect(() => {
    if (!gesture || !runtime || !selectedElementId || !slideCanvasRef.current || !projected) return;
    const move = (event: PointerEvent) => {
      event.preventDefault();
      const rect = slideCanvasRef.current!.getBoundingClientRect();
      const dx = (event.clientX - gesture.startX) * projected.width / rect.width;
      const dy = (event.clientY - gesture.startY) * projected.height / rect.height;
      const next = gesture.mode === 'move'
        ? {
          ...gesture.frame,
          x: clamp(gesture.frame.x + dx, 0, projected.width - gesture.frame.w),
          y: clamp(gesture.frame.y + dy, 0, projected.height - gesture.frame.h),
        }
        : {
          ...gesture.frame,
          w: clamp(gesture.frame.w + dx, 20, projected.width - gesture.frame.x),
          h: clamp(gesture.frame.h + dy, 20, projected.height - gesture.frame.y),
        };
      gesturePreviewRef.current = next;
      setGesturePreview(next);
    };
    const end = () => {
      const next = gesturePreviewRef.current;
      if (next) {
        runSafely(() => runtime.editor.exec({
          type: 'SetXfrm',
          id: selectedElementId,
          x: next.x,
          y: next.y,
          w: next.w,
          h: next.h,
        }));
      }
      gesturePreviewRef.current = null;
      setGesturePreview(null);
      setGesture(null);
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', end, { once: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
    };
  }, [gesture, projected, runSafely, runtime, selectedElementId]);

  const navigateRelative = useCallback((delta: number) => {
    if (!runtime || !slideId) return;
    const index = runtime.doc.slideOrder.indexOf(slideId);
    const next = runtime.doc.slideOrder[clamp(index + delta, 0, runtime.doc.slideOrder.length - 1)];
    if (next && next !== slideId) selectSlide(next);
  }, [runtime, selectSlide, slideId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT' || target?.isContentEditable;
      const mod = event.ctrlKey || event.metaKey;
      if (typing) {
        if (mod && event.key.toLowerCase() === 's') {
          event.preventDefault();
          commitNotes();
          persist(true);
        }
        return;
      }
      if (!runtime) return;
      if (mod && event.key.toLowerCase() === 's') {
        event.preventDefault();
        commitNotes();
        persist(true);
      } else if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) runtime.editor.redo(); else runtime.editor.undo();
      } else if (mod && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        runtime.editor.redo();
      } else if (mod && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        if (selected) duplicateObject(); else duplicateSlide();
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && selected) {
        event.preventDefault();
        removeSelected();
      } else if (event.key === 'Escape') {
        setObjectContextMenu(null);
        setSelectedElementId(null);
        setEditingTextId(null);
        setShortcutsOpen(false);
      } else if (selected && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const x = selected.element.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0);
        const y = selected.element.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0);
        transformElement({ x, y });
      } else if (!selected && event.key === 'PageDown') {
        event.preventDefault();
        navigateRelative(1);
      } else if (!selected && event.key === 'PageUp') {
        event.preventDefault();
        navigateRelative(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commitNotes, duplicateObject, duplicateSlide, navigateRelative, persist, removeSelected, runtime, selected, transformElement]);

  if (!record || !runtime || !projected || !slideId || !currentSlide) {
    return (
      <main className="missing-page" dir="ltr" lang="en">
        <Icon name="warning" size={40} />
        <h1>Presentation not found</h1>
        <p>The presentation may have been deleted or its saved data cannot be opened.</p>
        <button type="button" className="primary-button" onClick={onBack}>Back to dashboard</button>
      </main>
    );
  }

  const undoDisabled = runtime.editor.history.undoCount === 0;
  const redoDisabled = runtime.editor.history.redoCount === 0;
  const canArrange = Boolean(selected && selected.editable !== 'none' && !selected.locked);
  const layouts = [
    ...BUILT_IN_LAYOUTS,
    ...runtime.doc.layoutOrder.map((layoutId) => ({ id: layoutId, name: runtime.doc.layouts[layoutId]?.name ?? 'Layout' }))
      .filter((layout) => !BUILT_IN_LAYOUTS.some((builtIn) => builtIn.id === layout.id || builtIn.name === layout.name)),
  ];
  const activeSlidePresentation = projected.slides[runtime.doc.slideOrder.indexOf(slideId)];
  const currentLayout = layoutOverrides[slideId]
    ?? BUILT_IN_LAYOUTS.find((layout) => layout.name === activeSlidePresentation?.layoutName)?.id
    ?? runtime.doc.slides[slideId]?.layoutId
    ?? 'blank';

  const menus: Array<{ label: string; items: MenuAction[] }> = [
    { label: 'File', items: [
      { label: 'Save', shortcut: 'Ctrl+S', action: () => { commitNotes(); persist(true); } },
      { label: '', divider: true },
      { label: 'Back to dashboard', action: onBack },
    ] },
    { label: 'Edit', items: [
      { label: 'Undo', shortcut: 'Ctrl+Z', disabled: undoDisabled, action: () => runtime.editor.undo() },
      { label: 'Redo', shortcut: 'Ctrl+Y', disabled: redoDisabled, action: () => runtime.editor.redo() },
      { label: '', divider: true },
      { label: 'Delete object', shortcut: 'Delete', disabled: !selected, danger: true, action: removeSelected },
    ] },
    { label: 'View', items: [
      { label: 'Fit to screen', action: () => { setZoomMode('fit'); fitToScreen(); } },
      { label: 'Zoom to 100%', action: () => { setZoomMode('manual'); setZoom(1); } },
      { label: '', divider: true },
      { label: notesOpen ? 'Hide speaker notes' : 'Show speaker notes', action: () => setNotesOpen((value) => !value) },
      { label: navigatorOpen ? 'Hide slide navigator' : 'Show slide navigator', action: () => setNavigatorOpen((value) => !value) },
    ] },
    { label: 'Insert', items: [
      { label: 'Text box', action: addTextBox },
      { label: 'Image', action: openImagePicker },
      { label: 'Rectangle', action: () => addShape('rect') },
      { label: 'Rounded rectangle', action: () => addShape('roundRect') },
      { label: 'Ellipse', action: () => addShape('ellipse') },
      { label: 'Line', action: () => addShape('line') },
    ] },
    { label: 'Format', items: [
      { label: 'Bold', shortcut: 'Ctrl+B', disabled: !selectedText, action: () => formatText({ b: !firstRun(selectedText)?.b }) },
      { label: 'Italic', shortcut: 'Ctrl+I', disabled: !selectedText, action: () => formatText({ i: !firstRun(selectedText)?.i }) },
      { label: 'Underline', shortcut: 'Ctrl+U', disabled: !selectedText, action: () => formatText({ u: !firstRun(selectedText)?.u }) },
    ] },
    { label: 'Slide', items: [
      { label: 'Add slide', action: () => addSlide() },
      { label: 'Duplicate slide', shortcut: 'Ctrl+D', action: () => duplicateSlide() },
      { label: 'Delete slide', disabled: runtime.doc.slideOrder.length === 1, danger: true, action: () => removeSlide() },
    ] },
    { label: 'Arrange', items: [
      { label: 'Bring to front', disabled: !canArrange, action: () => setLayer('front') },
      { label: 'Send to back', disabled: !canArrange, action: () => setLayer('back') },
      { label: '', divider: true },
      { label: 'Center on slide', disabled: !canArrange, action: () => alignElement('center') },
      { label: 'Middle on slide', disabled: !canArrange, action: () => alignElement('middle') },
    ] },
    { label: 'Tools', items: [
      { label: notesOpen ? 'Collapse speaker notes' : 'Open speaker notes', action: () => setNotesOpen((value) => !value) },
      { label: 'Open properties', action: () => setPropertiesOpen(true) },
    ] },
    { label: 'Help', items: [
      { label: 'Keyboard shortcuts', action: () => setShortcutsOpen(true) },
    ] },
  ];

  return (
    <main className="editor-shell" dir="ltr" lang="en">
      <header className="editor-app-header">
        <div className="editor-document-block">
          <button type="button" className="editor-home-button editor-back" onClick={onBack} aria-label="Back to dashboard">
            <Brand compact label="Pardis" />
          </button>
          <div className="editor-document-copy">
            <div className="editor-title-line">
              <input value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Presentation title" />
              <span className={`save-status ${saveState}`}>
                {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed' : 'Saved'}
              </span>
            </div>
            <MenuBar menus={menus} />
          </div>
        </div>
        <div className="editor-header-actions">
          <button type="button" className="header-present-button present-button" onClick={handlePresent}>
            <Icon name="play" size={17} /> Present
          </button>
          <button type="button" className="header-save-button save-button" onClick={() => { commitNotes(); persist(true); }}>
            <Icon name="save" size={17} /> Save
          </button>
          <span className="local-account" title="Stored in this browser">L</span>
        </div>
      </header>

      <div className="editor-format-toolbar" aria-label="Editing toolbar">
        <div className="toolbar-group mobile-panel-tools">
          <ToolButton label="Slides" icon="layers" active={navigatorOpen} onClick={() => setNavigatorOpen((value) => !value)} />
        </div>
        <div className="toolbar-group add-slide-toolbar">
          <button type="button" className="toolbar-add-slide" onClick={() => addSlide()} title="Add slide">
            <Icon name="plus" size={17} />
            <span>Add slide</span>
          </button>
        </div>
        <div className="toolbar-group">
          <ToolButton label="Undo" icon="undo" disabled={undoDisabled} onClick={() => runtime.editor.undo()} />
          <ToolButton label="Redo" icon="redo" disabled={redoDisabled} onClick={() => runtime.editor.redo()} />
        </div>
        <div className="toolbar-group zoom-toolbar">
          <select
            aria-label="Zoom"
            value={zoomMode === 'fit' ? 'fit' : String(Math.round(zoom * 100))}
            onChange={(event) => {
              if (event.target.value === 'fit') {
                setZoomMode('fit');
                fitToScreen();
              } else {
                setZoomMode('manual');
                setZoom(Number(event.target.value) / 100);
                setCanvasPan({ x: 0, y: 0 });
                stageViewportRef.current?.scrollTo({ left: 0, top: 0, behavior: 'auto' });
              }
            }}
          >
            <option value="fit">Fit</option>
            <option value="50">50%</option>
            <option value="75">75%</option>
            <option value="100">100%</option>
            <option value="125">125%</option>
            <option value="150">150%</option>
          </select>
        </div>
        <div className="toolbar-group">
          <ToolButton label="Select" icon="pointer" active={!panMode} onClick={() => { setPanMode(false); panGestureRef.current = null; setSelectedElementId(null); }} />
          <ToolButton label="Pan canvas" icon="hand" active={panMode} onClick={() => { setPanMode((value) => !value); panGestureRef.current = null; }} />
          <ToolButton label="Text box" icon="text" onClick={addTextBox} />
          <div className="toolbar-popover-wrap" onPointerDown={(event) => event.stopPropagation()}>
            <ToolButton label="Shape" icon="shape" active={shapeMenuOpen} onClick={() => setShapeMenuOpen((value) => !value)} />
            {shapeMenuOpen && (
              <div className="shape-popover">
                <button type="button" onClick={() => addShape('rect')}><span className="shape-swatch rectangle" />Rectangle</button>
                <button type="button" onClick={() => addShape('roundRect')}><span className="shape-swatch rounded" />Rounded</button>
                <button type="button" onClick={() => addShape('ellipse')}><span className="shape-swatch ellipse" />Ellipse</button>
                <button type="button" onClick={() => addShape('line')}><Icon name="line" size={17} />Line</button>
              </div>
            )}
          </div>
          <ToolButton label="Line" icon="line" onClick={() => addShape('line')} />
          <ToolButton label="Image" icon="image" onClick={openImagePicker} />
          <ToolButton label="Table" icon="table" onClick={() => setTableDialogOpen(true)} />
          <ToolButton label="Chart" icon="chart" onClick={() => setChartDialogOpen(true)} />
        </div>

        {selectedText && (
          <>
            <div className="toolbar-group toolbar-text-controls">
              <FontPicker compact value={firstRun(selectedText)?.fonts?.[0] ?? 'Vazirmatn'} onChange={(family) => formatText({ font: family })} />
              <input type="number" min="6" max="240" value={Math.round(firstRun(selectedText)?.size ?? 24)} onChange={(event) => formatText({ size: Number(event.target.value) })} aria-label="Font size" />
            </div>
            <div className="toolbar-group">
              <button type="button" className={`toolbar-letter ${firstRun(selectedText)?.b ? 'active' : ''}`} onClick={() => formatText({ b: !firstRun(selectedText)?.b })} aria-label="Bold"><b>B</b></button>
              <button type="button" className={`toolbar-letter ${firstRun(selectedText)?.i ? 'active' : ''}`} onClick={() => formatText({ i: !firstRun(selectedText)?.i })} aria-label="Italic"><i>I</i></button>
              <button type="button" className={`toolbar-letter ${firstRun(selectedText)?.u ? 'active' : ''}`} onClick={() => formatText({ u: !firstRun(selectedText)?.u })} aria-label="Underline"><u>U</u></button>
              <label className="toolbar-color" title="Text color">
                <span>A</span>
                <input type="color" value={colorInputValue(firstRun(selectedText)?.color, '#17141d')} onChange={(event) => formatText({ color: event.target.value })} aria-label="Text color" />
              </label>
            </div>
            <div className="toolbar-group toolbar-alignment">
              <ToolButton label="Align left" icon="alignLeft" active={selectedText.body.paragraphs[0]?.align === 'left'} onClick={() => alignText('left')} />
              <ToolButton label="Align center" icon="alignCenter" active={selectedText.body.paragraphs[0]?.align === 'center'} onClick={() => alignText('center')} />
              <ToolButton label="Align right" icon="alignRight" active={selectedText.body.paragraphs[0]?.align === 'right'} onClick={() => alignText('right')} />
            </div>
          </>
        )}

        <div className="toolbar-spacer" />
        <div className="toolbar-group">
          <button type="button" className="toolbar-text-button" onClick={() => setSelectedElementId(null)}>Background</button>
          <ToolButton label="Properties" icon="panel" active={propertiesOpen} onClick={() => setPropertiesOpen((value) => !value)} />
        </div>
      </div>

      <div className="editor-workspace">
        <aside className={`slide-navigator ${navigatorOpen ? 'is-open' : ''}`}>
          <div className="slide-navigator-heading">
            <span>Slides</span>
            <div>
              <button type="button" onClick={() => addSlide()} aria-label="Add slide" title="Add slide"><Icon name="plus" size={17} /></button>
              <button type="button" onClick={() => duplicateSlide()} aria-label="Duplicate slide" title="Duplicate slide"><Icon name="duplicate" size={16} /></button>
            </div>
          </div>
          <div className="slide-thumbnail-list" role="listbox" aria-label="Slides">
            {runtime.doc.slideOrder.map((itemSlideId, index) => (
              <div
                className={`slide-thumbnail-row ${itemSlideId === slideId ? 'active' : ''}`}
                key={itemSlideId}
                draggable
                onDragStart={() => setDraggedSlideId(itemSlideId)}
                onDragEnd={() => setDraggedSlideId(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (!draggedSlideId) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  reorderSlide(draggedSlideId, itemSlideId, event.clientY > rect.top + rect.height / 2);
                  setDraggedSlideId(null);
                }}
              >
                <span className="slide-row-number">{index + 1}</span>
                <button
                  type="button"
                  className="slide-thumbnail"
                  role="option"
                  aria-selected={itemSlideId === slideId}
                  onClick={() => selectSlide(itemSlideId)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setContextMenu({ id: itemSlideId, x: event.clientX, y: event.clientY });
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown') navigateRelative(1);
                    if (event.key === 'ArrowUp') navigateRelative(-1);
                  }}
                >
                  <SlideSvg
                    presentation={projected}
                    slide={projected.slides[index]}
                    idPrefix={`thumb-${itemSlideId}-${version}-`}
                    textMode="svg"
                  />
                </button>
              </div>
            ))}
          </div>
        </aside>

        <section className="editor-center">
          <div className="canvas-status-bar">
            <span>Slide {slideIndex + 1} of {projected.slides.length}</span>
            <span>{Math.round(zoom * 100)}%</span>
          </div>
          <div
            className={`editor-stage-viewport ${panMode ? 'pan-mode' : ''}`}
            ref={stageViewportRef}
            onPointerDown={(event) => {
              if (panMode) {
                event.preventDefault(); event.stopPropagation();
                panGestureRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: canvasPan.x, originY: canvasPan.y };
                event.currentTarget.setPointerCapture(event.pointerId); return;
              }
              if (event.target === event.currentTarget) setSelectedElementId(null);
            }}
            onPointerMove={(event) => {
              const drag = panGestureRef.current;
              if (!drag || drag.pointerId !== event.pointerId) return;
              setCanvasPan({ x: drag.originX + event.clientX - drag.startX, y: drag.originY + event.clientY - drag.startY });
            }}
            onPointerUp={(event) => { if (panGestureRef.current?.pointerId === event.pointerId) panGestureRef.current = null; }}
            onPointerCancel={() => { panGestureRef.current = null; }}
            onLostPointerCapture={() => { panGestureRef.current = null; }}
          >
            <div className="editor-stage-pad">
              <div
                className="slide-canvas"
                ref={slideCanvasRef}
                style={{
                  width: `${projected.width * zoom}px`,
                  height: `${projected.height * zoom}px`,
                  aspectRatio: `${projected.width}/${projected.height}`,
                  transform: `translate(${canvasPan.x}px, ${canvasPan.y}px)`,
                }}
                onPointerDown={(event) => {
                  // Let the viewport receive this pointer event so panning also
                  // works when the gesture starts directly on the slide.
                  if (panMode) { event.preventDefault(); return; }
                  if (event.target === event.currentTarget) setSelectedElementId(null);
                }}
              >
                <SlideSvg presentation={projected} slide={currentSlide} idPrefix={`main-${slideId}-${version}-`} />
                <div className="element-interaction-layer">
                  {topLevelElements.map((info) => {
                    const isSelected = info.id === selectedElementId;
                    const isEditing = info.id === editingTextId;
                    const frame = isSelected && gesturePreview ? gesturePreview : info.element;
                    const textInfo = textElements.find((item) => item.id === info.id);
                    return (
                      <div
                        key={info.id}
                        className={`element-frame ${isSelected ? 'selected' : ''} ${info.editable === 'none' ? 'readonly' : ''}`}
                        style={{
                          left: `${frame.x / projected.width * 100}%`,
                          top: `${frame.y / projected.height * 100}%`,
                          width: `${frame.w / projected.width * 100}%`,
                          height: `${frame.h / projected.height * 100}%`,
                          transform: frame.rot ? `rotate(${frame.rot}deg)` : undefined,
                        }}
                        onPointerDown={(event) => beginGesture('move', event, info)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setSelectedElementId(info.id);
                          setObjectContextMenu({ id: info.id, x: event.clientX, y: event.clientY });
                        }}
                        onDoubleClick={(event) => {
                          event.stopPropagation();
                          if (textInfo) beginTextEdit(textInfo);
                        }}
                        aria-label={`Select ${elementLabel(info.element)}`}
                      >
                        {isSelected && (
                          <>
                            <span className="selection-label">{elementLabel(info.element)}</span>
                            <button
                              type="button"
                              className="resize-handle handle-se"
                              aria-label="Resize object"
                              onPointerDown={(event) => beginGesture('resize', event, info)}
                            />
                            <span className="resize-handle handle-nw" />
                            <span className="resize-handle handle-ne" />
                            <span className="resize-handle handle-sw" />
                          </>
                        )}
                        {isEditing && textInfo && (
                          <textarea
                            className="inline-text-editor"
                            autoFocus
                            value={inlineText}
                            dir="auto"
                            style={{
                              fontFamily: `"${firstRun(textInfo)?.fonts?.[0] ?? 'Vazirmatn'}", Vazirmatn, Arial, sans-serif`,
                              fontSize: `${Math.max(8, (firstRun(textInfo)?.size ?? 24) * zoom)}px`,
                              fontWeight: firstRun(textInfo)?.b ? 700 : 400,
                              fontStyle: firstRun(textInfo)?.i ? 'italic' : 'normal',
                              color: firstRun(textInfo)?.color ?? '#24202a',
                              textAlign: textInfo.body.paragraphs[0]?.align ?? 'left',
                              lineHeight: textInfo.body.paragraphs[0]?.lineHeight ?? 1.15,
                            }}
                            aria-label="Edit text"
                            onPointerDown={(event) => event.stopPropagation()}
                            onChange={(event) => setInlineText(event.target.value)}
                            onBlur={commitInlineText}
                            onKeyDown={(event) => {
                              if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                                event.preventDefault();
                                commitInlineText();
                              }
                              if (event.key === 'Escape') {
                                event.preventDefault();
                                setEditingTextId(null);
                              }
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <section className={`speaker-notes ${notesOpen ? 'is-open' : ''}`}>
            <button type="button" className="speaker-notes-toggle" onClick={() => setNotesOpen((value) => !value)} aria-expanded={notesOpen}>
              <Icon name="note" size={16} />
              <span>Speaker notes</span>
              <Icon name="chevronDown" size={15} />
            </button>
            {notesOpen && (
              <textarea
                value={notesDraft}
                onChange={(event) => setNotesDraft(event.target.value)}
                onBlur={commitNotes}
                placeholder="Click to add speaker notes"
                aria-label="Speaker notes"
                dir="auto"
              />
            )}
          </section>
        </section>

        <PropertiesPanel
          selected={selected}
          selectedText={selectedText}
          background={background}
          layouts={layouts}
          currentLayout={currentLayout}
          objects={topLevelElements}
          panelOpen={propertiesOpen}
          onClose={() => setPropertiesOpen(false)}
          onSelect={selectElement}
          onFormat={formatText}
          onAlign={alignText}
          onLineHeight={setLineHeight}
          onTransform={transformElement}
          onFill={(color) => {
            if (selected) runSafely(() => runtime.editor.exec({ type: 'SetFill', id: selected.id, fill: { type: 'solid', color } }));
          }}
          onStroke={(color) => {
            if (selected) runSafely(() => runtime.editor.exec({ type: 'SetStroke', id: selected.id, stroke: { color, width: 1.5, dash: null } }));
          }}
          onBackground={(color) => runSafely(() => runtime.editor.exec({ type: 'SetBackground', id: slideId, fill: { type: 'solid', color } }))}
          onLayout={applySlideLayout}
          onLayer={setLayer}
          onDelete={removeSelected}
        />
      </div>

      <input ref={imageInputRef} className="editor-file-input" type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={insertImage} />
      {tableDialogOpen && <TableInsertDialog onClose={() => setTableDialogOpen(false)} onInsert={insertTable} />}
      {chartDialogOpen && <ChartInsertDialog onClose={() => setChartDialogOpen(false)} onInsert={insertChart} />}
      {chartEditOpen && chartDraft && (
        <div className="editor-dialog-backdrop" onPointerDown={() => setChartEditOpen(false)}>
          <section className="insert-dialog chart-edit-dialog" role="dialog" aria-modal="true" aria-label="Edit chart data" onPointerDown={(event) => event.stopPropagation()}>
            <header><div><span><Icon name="chart" /></span><div><h2>Edit chart</h2><p>Changes are applied to the selected chart</p></div></div><button type="button" onClick={() => setChartEditOpen(false)} aria-label="Close"><Icon name="close" /></button></header>
            <div className="chart-edit-scroll"><ChartProperties data={chartDraft} onChange={setChartDraft} /></div>
            <footer><button type="button" className="secondary-button" onClick={() => setChartEditOpen(false)}>Cancel</button><button type="button" className="primary-button" onClick={applyChartDraft}><Icon name="check" size={17} /> Apply changes</button></footer>
          </section>
        </div>
      )}

      {objectContextMenu && selected && objectContextMenu.id === selected.id && (
        <ObjectContextMenu
          x={objectContextMenu.x}
          y={objectContextMenu.y}
          element={selected.element}
          locked={selected.locked}
          canPaste={false}
          onClose={() => setObjectContextMenu(null)}
          actions={{
            duplicate: duplicateObject,
            remove: removeSelected,
            front: () => setLayer('front'),
            back: () => setLayer('back'),
            centerHorizontally: () => transformElement({ x: Math.max(0, (projected.width - selected.element.w) / 2) }),
            centerVertically: () => transformElement({ y: Math.max(0, (projected.height - selected.element.h) / 2) }),
            properties: () => setPropertiesOpen(true),
            editText: selectedText ? () => beginTextEdit(selectedText) : undefined,
            editTable: selected.element.kind === 'table' ? () => setPropertiesOpen(true) : undefined,
            editChart: isChartElement(selected.element) ? openChartEditor : undefined,
            changeChartType: isChartElement(selected.element) ? openChartEditor : undefined,
            addRow: selected.element.kind === 'table' ? () => runSafely(() => runtime.editor.exec({ type: 'InsertRow', id: selected.id })) : undefined,
          }}
        />
      )}

      {contextMenu && (
        <div className="slide-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onPointerDown={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => { addSlide(contextMenu.id); setContextMenu(null); }}><Icon name="plus" size={16} /> Add slide after</button>
          <button type="button" onClick={() => { duplicateSlide(contextMenu.id); setContextMenu(null); }}><Icon name="duplicate" size={16} /> Duplicate slide</button>
          <div />
          <button type="button" className="danger" disabled={runtime.doc.slideOrder.length === 1} onClick={() => { removeSlide(contextMenu.id); setContextMenu(null); }}><Icon name="trash" size={16} /> Delete slide</button>
        </div>
      )}

      {toast && <div className="editor-toast" role="status"><Icon name="check" size={17} />{toast}</div>}

      {shortcutsOpen && (
        <div className="editor-dialog-backdrop" onPointerDown={() => setShortcutsOpen(false)}>
          <section className="editor-shortcuts-dialog" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title" onPointerDown={(event) => event.stopPropagation()}>
            <header><h2 id="shortcuts-title">Keyboard shortcuts</h2><button type="button" onClick={() => setShortcutsOpen(false)} aria-label="Close"><Icon name="close" /></button></header>
            <div><span>Save presentation</span><kbd>Ctrl + S</kbd></div>
            <div><span>Undo</span><kbd>Ctrl + Z</kbd></div>
            <div><span>Redo</span><kbd>Ctrl + Y</kbd></div>
            <div><span>Duplicate slide</span><kbd>Ctrl + D</kbd></div>
            <div><span>Move selected object</span><kbd>Arrow keys</kbd></div>
            <div><span>Move by 10 pixels</span><kbd>Shift + Arrow</kbd></div>
            <div><span>Delete selected object</span><kbd>Delete</kbd></div>
            <div><span>Previous / next slide</span><kbd>Page Up / Down</kbd></div>
          </section>
        </div>
      )}

    </main>
  );
}
