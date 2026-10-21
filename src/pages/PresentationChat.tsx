import { useRef, useState } from 'react';
import { Brand } from '../components/Brand';
import { Icon } from '../icons';

type Attachment = { file: File; id: string };
const ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.md,.rtf,.png,.jpg,.jpeg,.webp,.gif,.svg';
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE = 24 * 1024 * 1024;

async function submitRequest(title: string, message: string, files: File[]) {
  const form = new FormData();
  form.set('title', title);
  form.set('message', message);
  files.forEach((file) => form.append('attachments', file, file.name));
  const response = await fetch('/api/presentation-requests', { method: 'POST', credentials: 'same-origin', body: form });
  const data = await response.json().catch(() => ({})) as { error?: string; request?: { id: string } };
  if (!response.ok) throw new Error(data.error || 'ارسال درخواست انجام نشد.');
  return data.request!;
}

export function PresentationChat({ onBack }: { onBack: () => void }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    const all = [...attachments.map((a) => a.file), ...incoming];
    if (all.length > MAX_FILES) { setError('حداکثر ۵ فایل می‌توانید پیوست کنید.'); return; }
    if (all.some((file) => file.size > MAX_FILE_SIZE)) { setError('حجم هر فایل باید حداکثر ۱۰ مگابایت باشد.'); return; }
    if (all.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_SIZE) { setError('حجم مجموع فایل‌ها باید حداکثر ۲۴ مگابایت باشد.'); return; }
    setError('');
    setAttachments(all.map((file) => ({ file, id: `${file.name}-${file.size}-${file.lastModified}` })));
    if (fileInput.current) fileInput.current.value = '';
  };

  const send = async () => {
    if (!message.trim()) { setError('توضیح درخواستت را بنویس.'); return; }
    if (!title.trim()) { setError('یک عنوان برای ارائه وارد کن.'); return; }
    setBusy(true); setError('');
    try { await submitRequest(title.trim(), message.trim(), attachments.map((a) => a.file)); setSent(true); }
    catch (e) { setError(e instanceof Error ? e.message : 'ارسال درخواست ناموفق بود.'); }
    finally { setBusy(false); }
  };

  return <main className="request-chat-page" dir="rtl">
    <header className="request-chat-header"><button className="secondary-button" onClick={onBack}><Icon name="arrow"/> بازگشت</button><Brand/><span className="request-private"><Icon name="lock"/> فضای خصوصی درخواست</span></header>
    {sent ? <section className="request-sent"><div className="request-sent-icon"><Icon name="check-circle"/></div><h1>درخواستت ثبت شد</h1><p>درخواست در صف بررسی ادمین قرار گرفت. پس از تأیید، ارائه در داشبوردت نمایش داده می‌شود.</p><button className="primary-button" onClick={onBack}>بازگشت به داشبورد</button></section> :
    <section className="request-chat-layout"><div className="request-chat-intro"><span className="request-eyebrow">PARDIS PRESENT · PRESENTATION REQUEST</span><h1>بیایید ارائه‌ات را بسازیم.</h1><p>موضوع، مخاطب، سبک و هر نکته‌ای که مهم است را توضیح بده. می‌توانی فایل مرجع هم ضمیمه کنی. درخواستت برای بررسی به تیم مدیریت می‌رسد.</p><div className="request-tips"><span><Icon name="file-text"/> PDF و Word</span><span><Icon name="image"/> تصاویر و نمودارها</span><span><Icon name="check-circle"/> بررسی پیش از انتشار</span></div></div>
      <section className="request-chat-card"><div className="request-chat-card-head"><span className="request-ai-avatar"><Icon name="sparkles"/></span><div><strong>دستیار ساخت ارائه</strong><small>درخواستت را با جزئیات بنویس</small></div><span className="request-online-dot"/></div>
        <div className="request-chat-messages"><div className="request-assistant-bubble">سلام! برای اینکه ارائه دقیقاً مطابق نیازت آماده شود، موضوع، تعداد اسلایدها، مخاطب و لحن دلخواهت را توضیح بده. اگر منبع یا نمونه‌ای داری، فایلش را هم بفرست.</div>
          <label className="request-field-label" htmlFor="request-title">عنوان ارائه</label><input id="request-title" className="request-title-input" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: مقدمه‌ای بر امنیت ابری"/>
          <label className="request-field-label" htmlFor="request-message">توضیحات و نیازمندی‌ها</label><textarea id="request-message" className="request-message-input" rows={7} maxLength={20000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="موضوع، هدف، مخاطب، تعداد اسلاید، زبان، سبک بصری، منابع و هر نکته مهم دیگر..."/>
          {attachments.length > 0 && <div className="request-attachments">{attachments.map(({file,id}) => <div className="request-attachment" key={id}><Icon name={file.type.startsWith('image/')?'image':'file-text'}/><span><strong>{file.name}</strong><small>{(file.size/1024/1024).toFixed(2)} MB</small></span><button aria-label="حذف فایل" onClick={() => setAttachments((items) => items.filter((a) => a.id !== id))}><Icon name="close"/></button></div>)}</div>}
          {error && <p className="request-error" role="alert">{error}</p>}
        </div>
        <div className="request-composer"><input ref={fileInput} type="file" accept={ACCEPT} multiple hidden onChange={(e) => addFiles(e.target.files)}/><button className="request-attach-button" type="button" disabled={busy} onClick={() => fileInput.current?.click()}><Icon name="paperclip"/> افزودن فایل</button><span className="request-file-hint">حداکثر ۵ فایل · هرکدام ۱۰ مگابایت</span><button className="request-send-button" disabled={busy || !message.trim() || !title.trim()} onClick={() => void send()}>{busy?'در حال ارسال…':'ارسال درخواست'} <Icon name="arrow"/></button></div>
      </section>
      <p className="request-disclaimer">فایل‌ها خصوصی ذخیره می‌شوند و فقط در اختیار حساب شما و ادمین‌های مجاز هستند.</p>
    </section>}
  </main>;
}
