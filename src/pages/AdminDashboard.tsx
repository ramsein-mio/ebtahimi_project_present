import { useEffect, useState } from 'react';
import type { AuthUser } from '../auth';
import { Icon } from '../icons';

type Overview = {
  users: number; activeUsers: number; presentations: number; activeSessions: number;
  recentUsers: Array<{id:string;email:string;display_name:string;role:string;created_at:string}>;
  recentPresentations: Array<{id:string;title:string;owner_email:string;created_at:string;updated_at:string}>;
};
type AdminUser = {id:string;email:string;display_name:string;role:string;email_verified_at:string|null;created_at:string;deleted_at:string|null;presentation_count:number};

async function api<T>(url:string, init?:RequestInit):Promise<T>{
  const response=await fetch(url,{credentials:'same-origin',headers:{Accept:'application/json',...(init?.body?{'Content-Type':'application/json'}:{}),...init?.headers},...init});
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(typeof data.error==='string'?data.error:'درخواست ناموفق بود.');
  return data as T;
}
const date=(value:string)=>new Date(value).toLocaleDateString('fa-IR',{year:'numeric',month:'short',day:'numeric'});
export function AdminDashboard({currentUser,onBack,onLogout}:{currentUser:AuthUser;onBack:()=>void;onLogout:()=>void}){
  const [overview,setOverview]=useState<Overview|null>(null);
  const [users,setUsers]=useState<AdminUser[]>([]);
  const [query,setQuery]=useState('');
  const [section,setSection]=useState<'overview'|'users'>('overview');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  async function load(){setError('');try{const data=await api<{overview:Overview}>('/api/admin/overview');setOverview(data.overview);const list=await api<{users:AdminUser[]}>('/api/admin/users');setUsers(list.users)}catch(e){setError(e instanceof Error?e.message:'بارگذاری داشبورد انجام نشد.')}} 
  useEffect(()=>{void load()},[]);
  async function search(value:string){setQuery(value);try{const data=await api<{users:AdminUser[]}>('/api/admin/users?q='+encodeURIComponent(value));setUsers(data.users)}catch(e){setError(e instanceof Error?e.message:'جست‌وجو ناموفق بود.')}}
  async function changeRole(user:AdminUser,role:'user'|'admin'){if(!window.confirm('نقش '+user.email+' به '+(role==='admin'?'ادمین':'کاربر عادی')+' تغییر کند؟'))return;setBusy(true);setError('');setNotice('');try{await api('/api/admin/users/'+encodeURIComponent(user.id)+'/role',{method:'PUT',body:JSON.stringify({role})});setNotice('نقش کاربر به‌روزرسانی شد.');await load()}catch(e){setError(e instanceof Error?e.message:'تغییر نقش انجام نشد.')}finally{setBusy(false)}}
  return <main className="admin-shell" dir="rtl">
    <aside className="admin-sidebar"><div className="admin-brand"><span>پ</span><div><strong>پردیس</strong><small>کنسول مدیریت</small></div></div>
      <button className={section==='overview'?'selected':''} onClick={()=>setSection('overview')}><Icon name="grid"/> نمای کلی</button>
      <button className={section==='users'?'selected':''} onClick={()=>setSection('users')}><Icon name="users"/> مدیریت کاربران</button>
      <button onClick={onBack}><Icon name="arrow"/> بازگشت به برنامه</button>
      <div className="admin-sidebar-bottom"><span className="admin-avatar">{currentUser.displayName.slice(0,1)}</span><div><strong>{currentUser.displayName}</strong><small dir="ltr">{currentUser.email}</small><small className="admin-role">{currentUser.role==='super_admin'?'Super Admin':'Administrator'}</small></div><button onClick={onLogout} aria-label="خروج"><Icon name="logout"/></button></div>
    </aside>
    <section className="admin-content"><header className="admin-topbar"><div><small>کنسول / {section==='overview'?'نمای کلی':'کاربران'}</small><h1>{section==='overview'?'داشبورد مدیریت':'مدیریت کاربران'}</h1></div><button className="admin-refresh" onClick={()=>void load()}><Icon name="refresh"/> بروزرسانی</button></header>
    {error&&<div className="admin-alert error">{error}</div>}{notice&&<div className="admin-alert success">{notice}</div>}
    {section==='overview'&&<>{overview?<><div className="admin-metrics">
      <article><span>کل کاربران</span><strong>{overview.users.toLocaleString('fa-IR')}</strong><small>{overview.activeUsers.toLocaleString('fa-IR')} حساب فعال</small></article>
      <article><span>کل ارائه‌ها</span><strong>{overview.presentations.toLocaleString('fa-IR')}</strong><small>ذخیره‌شده در سامانه</small></article>
      <article><span>نشست‌های فعال</span><strong>{overview.activeSessions.toLocaleString('fa-IR')}</strong><small>نشست‌های منقضی‌نشده</small></article>
      <article><span>نقش شما</span><strong className="admin-role-value">{currentUser.role==='super_admin'?'سوپر ادمین':'ادمین'}</strong><small>دسترسی کنترل‌شده سمت سرور</small></article>
    </div><div className="admin-panels"><section className="admin-panel"><header><h2>کاربران جدید</h2><button onClick={()=>setSection('users')}>مشاهده همه</button></header><div className="admin-table-wrap"><table><thead><tr><th>کاربر</th><th>نقش</th><th>تاریخ عضویت</th></tr></thead><tbody>{overview.recentUsers.map(u=><tr key={u.id}><td><strong>{u.display_name}</strong><small dir="ltr">{u.email}</small></td><td><span className={'admin-pill '+u.role}>{u.role}</span></td><td>{date(u.created_at)}</td></tr>)}</tbody></table></div></section>
    <section className="admin-panel"><header><h2>آخرین ارائه‌ها</h2></header><div className="admin-table-wrap"><table><thead><tr><th>عنوان</th><th>مالک</th><th>آخرین تغییر</th></tr></thead><tbody>{overview.recentPresentations.map(p=><tr key={p.id}><td><strong>{p.title}</strong></td><td dir="ltr">{p.owner_email}</td><td>{date(p.updated_at)}</td></tr>)}</tbody></table></div></section></div></>:<div className="admin-loading">در حال دریافت آمار واقعی سامانه…</div>}</>}
    {section==='users'&&<section className="admin-panel admin-users-panel"><header><h2>حساب‌های کاربری</h2><div className="admin-user-search"><Icon name="search"/><input value={query} onChange={e=>void search(e.target.value)} placeholder="جست‌وجوی نام یا ایمیل"/></div></header><p className="admin-helper">حداکثر ۲۰۰ حساب اخیر نمایش داده می‌شود. فقط سوپر ادمین می‌تواند نقش ادمین را تغییر دهد.</p><div className="admin-table-wrap"><table><thead><tr><th>کاربر</th><th>نقش</th><th>ارائه‌ها</th><th>وضعیت</th><th>عضویت</th>{currentUser.role==='super_admin'&&<th>عملیات</th>}</tr></thead><tbody>{users.map(u=><tr key={u.id}><td><strong>{u.display_name}</strong><small dir="ltr">{u.email}</small></td><td><span className={'admin-pill '+u.role}>{u.role}</span></td><td>{u.presentation_count.toLocaleString('fa-IR')}</td><td><span className={'admin-status '+(u.deleted_at?'disabled':'enabled')}>{u.deleted_at?'حذف‌شده':'فعال'}</span></td><td>{date(u.created_at)}</td>{currentUser.role==='super_admin'&&<td>{u.role==='super_admin'?<span className="admin-protected">محافظت‌شده</span>:<button disabled={busy} className="admin-role-action" onClick={()=>void changeRole(u,u.role==='admin'?'user':'admin')}>{u.role==='admin'?'لغو ادمینی':'ارتقا به ادمین'}</button>}</td>}</tr>)}</tbody></table>{users.length===0&&<p className="admin-empty">کاربری پیدا نشد.</p>}</div></section>}
    <footer className="admin-footer">PARDIS PRESENT · پنل مدیریت · داده‌ها از API و دیتابیس خوانده می‌شوند</footer></section>
  </main>;
}
