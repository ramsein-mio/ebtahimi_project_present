import { useEffect, useState } from 'react';
import type { Presentation } from '@web-ppt/core';
import { validatePresentationJson } from '../presentation-engine';
import { parsePresentationYaml } from '../yaml-parser';
import { ViewerPage } from '../ViewerPage';
import { Icon } from '../icons';

type RequestItem = {
  id: string; title: string; message: string; status: 'pending'|'in_review'|'approved'|'rejected';
  adminNote: string|null; createdAt: string; updatedAt: string; publishedPresentationId: string|null;
  attachments: Array<{id:string;name:string;mime:string;size:number}>;
  user?: {email:string;displayName:string}; draft?: unknown;
};
async function api<T>(url:string, init?:RequestInit):Promise<T>{
  const response=await fetch(url,{credentials:'same-origin',headers:{Accept:'application/json',...(init?.body?{'Content-Type':'application/json'}:{}),...init?.headers},...init});
  const data=await response.json().catch(()=>({})) as {error?:string}&T;
  if(!response.ok) throw new Error(data.error||'درخواست ناموفق بود.');
  return data;
}
const statusLabel:Record<RequestItem['status'],string>={pending:'در انتظار بررسی',in_review:'در حال بررسی',approved:'تأیید و منتشرشده',rejected:'ردشده'};
const statusClass:Record<RequestItem['status'],string>={pending:'pending',in_review:'review',approved:'approved',rejected:'rejected'};
const date=(value:string)=>new Date(value).toLocaleString('fa-IR',{dateStyle:'medium',timeStyle:'short'});

export function AdminRequests(){
 const [items,setItems]=useState<RequestItem[]>([]);
 const [selected,setSelected]=useState<RequestItem|null>(null);
 const [statusFilter,setStatusFilter]=useState('pending');
 const [format,setFormat]=useState<'json'|'yaml'>('json');
 const [source,setSource]=useState('');
 const [note,setNote]=useState('');
 const [preview,setPreview]=useState<Presentation|null>(null);
 const [previewTitle,setPreviewTitle]=useState('');
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [busy,setBusy]=useState(false);
 async function load(){setError('');try{const result=await api<{requests:RequestItem[]}>('/api/admin/presentation-requests'+(statusFilter?'?status='+statusFilter:''));setItems(result.requests)}catch(e){setError(e instanceof Error?e.message:'بارگذاری درخواست‌ها ناموفق بود.')}}
 useEffect(()=>{void load()},[statusFilter]);
 async function open(item:RequestItem){setBusy(true);setError('');setNotice('');try{const result=await api<{request:RequestItem}>('/api/admin/presentation-requests/'+encodeURIComponent(item.id));const r=result.request;setSelected(r);setNote(r.adminNote||'');setPreview(null);if(r.draft){setFormat('json');setSource(JSON.stringify(r.draft,null,2))}else{setFormat('json');setSource('')} }catch(e){setError(e instanceof Error?e.message:'بازکردن درخواست ناموفق بود.')}finally{setBusy(false)}}
 function validate(){try{const value=format==='json'?source:JSON.stringify(parsePresentationYaml(source));const result=validatePresentationJson(value);if(result.error||!result.presentation){setError(result.error||'ساختار ارائه معتبر نیست.');setPreview(null);return}setError('');setPreview(result.presentation);setPreviewTitle(result.suggestedTitle||selected?.title||'پیش‌نمایش ارائه');setNotice('ساختار معتبر است؛ پیش‌نمایش اسلایدها آماده است.')}catch(e){setError(e instanceof Error?e.message:'اعتبارسنجی انجام نشد.');setPreview(null)}}
 async function update(status:RequestItem['status']){if(!selected)return;if(status==='approved'&&!preview){setError('قبل از انتشار، JSON/YAML را اعتبارسنجی و پیش‌نمایش را بررسی کن.');return}if(status==='approved'&&!window.confirm('این ارائه برای کاربر منتشر شود؟'))return;setBusy(true);setError('');setNotice('');try{await api('/api/admin/presentation-requests/'+encodeURIComponent(selected.id),{method:'PUT',body:JSON.stringify({status,adminNote:note,...(preview?{presentation:preview}:{})})});setNotice(status==='approved'?'ارائه تأیید شد و در حساب کاربر منتشر شد.':'وضعیت درخواست به‌روزرسانی شد.');setSelected(null);setPreview(null);await load()}catch(e){setError(e instanceof Error?e.message:'ذخیره تغییرات ناموفق بود.')}finally{setBusy(false)}}
 return <section className="request-admin">
  <header className="request-admin-toolbar"><div><h2>درخواست‌های ساخت ارائه</h2><p>درخواست را بررسی کن، JSON/YAML را اعتبارسنجی کن و فقط پس از بازبینی منتشر کن.</p></div><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="pending">در انتظار بررسی</option><option value="in_review">در حال بررسی</option><option value="approved">تأییدشده</option><option value="rejected">ردشده</option><option value="">همه درخواست‌ها</option></select><button className="admin-refresh" onClick={()=>void load()}><Icon name="restore"/> بروزرسانی</button></header>
  {error&&<div className="admin-alert error">{error}</div>}{notice&&<div className="admin-alert success">{notice}</div>}
  <div className="request-admin-grid"><aside className="request-queue">{items.map(item=><button key={item.id} className={'request-queue-item '+(selected?.id===item.id?'active':'')} onClick={()=>void open(item)}><span className={'request-status-dot '+statusClass[item.status]}/><strong>{item.title}</strong><small>{item.user?.displayName||item.user?.email||'کاربر'} · {date(item.createdAt)}</small><span className={'request-status-pill '+statusClass[item.status]}>{statusLabel[item.status]}</span></button>)}{items.length===0&&<div className="request-queue-empty">در این دسته درخواستی وجود ندارد.</div>}</aside>
  <div className="request-review-panel">{!selected?<div className="request-review-empty"><Icon name="inbox"/><h3>یک درخواست انتخاب کن</h3><p>جزئیات، فایل‌های مرجع و ابزار بررسی پس از انتخاب نمایش داده می‌شوند.</p></div>:<><div className="request-review-heading"><div><small>درخواست از {selected.user?.displayName||'کاربر'} · {selected.user?.email}</small><h3>{selected.title}</h3><span className={'request-status-pill '+statusClass[selected.status]}>{statusLabel[selected.status]}</span></div><button className="secondary-button" onClick={()=>setSelected(null)}>بستن</button></div><div className="request-user-message">{selected.message}</div>
  {selected.attachments.length>0&&<div className="request-admin-files"><strong>فایل‌های پیوست</strong>{selected.attachments.map(file=><a key={file.id} href={'/api/presentation-requests/'+encodeURIComponent(selected.id)+'/files/'+file.id} target="_blank" rel="noreferrer"><Icon name={file.mime.startsWith('image/')?'image':'file-text'}/><span>{file.name}<small>{(file.size/1024/1024).toFixed(2)} MB</small></span><Icon name="download"/></a>)}</div>}
  <div className="request-source-head"><strong>خروجی ارائه</strong><div><button className={format==='json'?'active':''} onClick={()=>setFormat('json')}>JSON</button><button className={format==='yaml'?'active':''} onClick={()=>setFormat('yaml')}>YAML</button><label className="request-upload-source">بارگذاری فایل<input type="file" accept=".json,.yaml,.yml" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;const ext=f.name.toLowerCase();setFormat(ext.endsWith('.json')?'json':'yaml');setSource(await f.text());setPreview(null);e.currentTarget.value=''}}/></label></div></div>
  <textarea className="request-source-editor" dir="ltr" spellCheck={false} value={source} onChange={e=>{setSource(e.target.value);setPreview(null)}} placeholder="JSON یا YAML مطابق قرارداد presentation + slides را اینجا وارد کن..."/>
  <div className="request-admin-actions"><button className="secondary-button" disabled={busy||!source.trim()} onClick={validate}><Icon name="check-circle"/> اعتبارسنجی و پیش‌نمایش</button><button className="secondary-button" disabled={busy} onClick={()=>void update('in_review')}>ثبت در حال بررسی</button><button className="secondary-button request-reject" disabled={busy} onClick={()=>void update('rejected')}>رد درخواست</button></div>
  <label className="request-field-label" htmlFor="request-admin-note">یادداشت ادمین (اختیاری)</label><textarea id="request-admin-note" className="request-note-input" rows={2} value={note} onChange={e=>setNote(e.target.value)} placeholder="یادداشت داخلی یا دلیل رد درخواست"/>
  {preview&&<div className="request-preview-wrap"><div className="request-preview-head"><div><strong>پیش‌نمایش تعاملی</strong><small>{preview.slides.length} اسلاید · پیش‌نمایش برای بررسی</small></div><button className="primary-button" disabled={busy} onClick={()=>void update('approved')}><Icon name="check-circle"/> تأیید و انتشار</button></div><div className="request-live-preview"><ViewerPage id={'review-'+selected.id} title={previewTitle} presentation={preview} onBack={()=>setPreview(null)} onEdit={()=>setPreview(null)}/></div></div>}
  </>}</div></div>
 </section>
}
