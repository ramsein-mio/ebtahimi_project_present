import { useRef, useState } from 'react';
import { Brand } from '../components/Brand';
import { Icon } from '../icons';
import { sampleJson } from '../sample';
import { createStoredPresentation } from '../storage';
import { validatePresentationJson } from '../presentation-engine';
import { faNumber } from '../persian';
import type { ValidationResult } from '../types';

interface JsonInputProps {
  onBack: () => void;
  onGenerated: (id: string) => void;
}

export function JsonInput({ onBack, onGenerated }: JsonInputProps) {
  const defaultTitle = 'ارائهٔ تازهٔ من';
  const [title, setTitle] = useState(defaultTitle);
  const [source, setSource] = useState(sampleJson);
  const [validated, setValidated] = useState<ValidationResult | null>(null);
  const [status, setStatus] = useState<{ kind: 'idle' | 'success' | 'error'; message?: string }>({ kind: 'idle' });
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const validate = (): ValidationResult => {
    setBusy(true);
    const result = validatePresentationJson(source);
    setBusy(false);
    setValidated(result);
    if (result.error) {
      setStatus({ kind: 'error', message: result.error });
      return result;
    }
    if (result.suggestedTitle && title === defaultTitle) setTitle(result.suggestedTitle);
    setStatus({
      kind: 'success',
      message: `ساختار مرجع معتبر است؛ ${faNumber(result.presentation!.slides.length)} اسلاید مرتب و آمادهٔ تولید است.`,
    });
    return result;
  };

  const generate = () => {
    const result = validated?.presentation ? validated : validate();
    if (!result.presentation) return;
    const effectiveTitle = title === defaultTitle && result.suggestedTitle ? result.suggestedTitle : title;
    const item = createStoredPresentation(effectiveTitle, result.presentation);
    onGenerated(item.id);
  };

  const importFile = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLocaleLowerCase('en').endsWith('.json')) {
      setStatus({ kind: 'error', message: 'فقط فایل با پسوند JSON پذیرفته می‌شود.' });
      return;
    }
    try {
      const text = await file.text();
      setSource(text);
      setValidated(null);
      setStatus({ kind: 'idle' });
    } catch {
      setStatus({ kind: 'error', message: 'خواندن فایل ممکن نبود. دوباره تلاش کنید.' });
    }
  };

  const updateSource = (value: string) => {
    setSource(value);
    setValidated(null);
    if (status.kind !== 'idle') setStatus({ kind: 'idle' });
  };

  return (
    <main className="json-page">
      <header className="json-header">
        <Brand />
        <button className="secondary-button back-button" onClick={onBack}><Icon name="arrow" /> بازگشت به داشبورد</button>
      </header>

      <section className="json-layout">
        <div className="json-intro">
          <div className="step-badge">مرحلهٔ ۱ از ۲</div>
          <h1>داده را به اسلاید تبدیل کنید.</h1>
          <p>JSON ارائه را با قرارداد <bdi dir="ltr">presentation + slides</bdi> وارد کنید. ترتیب، متن‌های نشانه‌گذاری‌شده و visualها دقیقاً به اسلایدهای قابل‌ویرایش تبدیل می‌شوند.</p>

          <div className="schema-card" dir="ltr">
            <div><span className="schema-key">presentation.title</span><span>string</span><b>metadata</b></div>
            <div><span className="schema-key">slides</span><span>Slide[]</span><b>required</b></div>
            <div><span className="schema-key">slide.order</span><span>number</span><b>sorting</b></div>
            <div><span className="schema-key">slide.body</span><span>lead | bullets | emphasis</span><b>content</b></div>
            <div><span className="schema-key">slide.visual</span><span>5 supported types</span><b>optional</b></div>
          </div>

          <div className="privacy-note">
            <Icon name="check" />
            <div>
              <strong>پردازش محلی و خصوصی</strong>
              <span>هیچ فایل یا داده‌ای به سرور ارسال نمی‌شود.</span>
            </div>
          </div>
        </div>

        <div className="json-workbench">
          <div className="json-workbench-header">
            <div>
              <span className="code-dot purple" />
              <span className="code-dot pink" />
              <span className="code-dot green" />
              <strong>presentation.json</strong>
            </div>
            <div className="json-tools">
              <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(event) => void importFile(event.target.files?.[0])} />
              <button onClick={() => fileInput.current?.click()}><Icon name="upload" size={18} /> ورود فایل</button>
              <button onClick={() => updateSource(sampleJson())}><Icon name="code" size={18} /> نمونهٔ معتبر</button>
            </div>
          </div>

          <label className="title-field">
            <span>نام ارائه</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="برای ارائه نامی بنویسید" />
          </label>

          <label className="json-editor-label" htmlFor="json-editor">JSON ارائه</label>
          <div className="json-editor-shell">
            <div className="line-numbers" aria-hidden="true">
              {source.split('\n').slice(0, 60).map((_, index) => <span key={index}>{index + 1}</span>)}
            </div>
            <textarea
              id="json-editor"
              dir="ltr"
              spellCheck={false}
              value={source}
              onChange={(event) => updateSource(event.target.value)}
              aria-describedby="json-help"
            />
          </div>
          <p id="json-help" className="json-help">کد با جهت چپ‌به‌راست نمایش داده می‌شود؛ رابط همچنان راست‌به‌چپ است.</p>

          {status.kind !== 'idle' && (
            <div className={`validation-message ${status.kind}`} role="status">
              <Icon name={status.kind === 'success' ? 'check' : 'warning'} />
              <span>{status.message}</span>
            </div>
          )}

          <div className="json-actions">
              <button className="secondary-button" onClick={() => validate()} disabled={busy || !source.trim()}>
              <Icon name="check" /> اعتبارسنجی JSON
            </button>
            <button className="primary-button generate-button" onClick={generate} disabled={busy || !source.trim() || !title.trim()}>
              <Icon name="presentation" /> تولید و باز کردن ویرایشگر
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
