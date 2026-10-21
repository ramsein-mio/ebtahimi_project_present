import { useMemo, useState } from 'react';
import type { DashboardFilter, StoredPresentation } from '../types';
import type { AuthUser } from '../auth';
import { faNumber, faRelativeDate } from '../persian';
import { loadPresentations, permanentlyDeletePresentation, updateStoredPresentation } from '../storage';
import { Brand } from '../components/Brand';
import { Icon } from '../icons';
import { Modal } from '../components/Modal';
import { SlideSvg } from '../components/SlideSvg';

interface DashboardProps {
  currentUser: AuthUser;
  onLogout: () => void;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
}

export function Dashboard({
  currentUser,
  onLogout,
  onCreate,
  onOpen,
  onEdit,
}: DashboardProps) {
  const [items, setItems] = useState<StoredPresentation[]>(() => loadPresentations());
  const [filter, setFilter] = useState<DashboardFilter>('recent');
  const [query, setQuery] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [renameItem, setRenameItem] = useState<StoredPresentation | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const visible = useMemo(() => {
    const deleted = filter === 'trash';
    return items
      .filter((item) => Boolean(item.deletedAt) === deleted)
      .filter((item) => item.title.toLocaleLowerCase('fa').includes(query.trim().toLocaleLowerCase('fa')))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [filter, items, query]);

  const refresh = () => setItems(loadPresentations());

  const moveToTrash = (item: StoredPresentation) => {
    updateStoredPresentation(item.id, { deletedAt: new Date().toISOString() });
    setMenuId(null);
    refresh();
  };

  const restore = (item: StoredPresentation) => {
    updateStoredPresentation(item.id, { deletedAt: undefined });
    setMenuId(null);
    refresh();
  };

  const removeForever = (item: StoredPresentation) => {
    if (!window.confirm(`ارائهٔ «${item.title}» برای همیشه حذف شود؟`)) return;
    permanentlyDeletePresentation(item.id);
    setMenuId(null);
    refresh();
  };

  const startRename = (item: StoredPresentation) => {
    setRenameItem(item);
    setRenameValue(item.title);
    setMenuId(null);
  };

  const submitRename = () => {
    if (!renameItem || !renameValue.trim()) return;
    updateStoredPresentation(renameItem.id, { title: renameValue.trim() });
    setRenameItem(null);
    refresh();
  };

  const changeFilter = (next: DashboardFilter) => {
    setFilter(next);
    setSidebarOpen(false);
  };

  return (
    <main className="dashboard-shell">
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="sidebar-top">
          <Brand />
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="بستن فهرست"><Icon name="close" /></button>
        </div>
        <nav className="dashboard-nav" aria-label="فهرست ارائه‌ها">
          <button className={filter === 'recent' ? 'active' : ''} onClick={() => changeFilter('recent')}>
            <Icon name="clock" />
            <span>اخیراً ویرایش‌شده</span>
          </button>
          <button className={filter === 'all' ? 'active' : ''} onClick={() => changeFilter('all')}>
            <Icon name="folder" />
            <span>ارائه‌های من</span>
            <b>{faNumber(items.filter((item) => !item.deletedAt).length)}</b>
          </button>
          <button className={filter === 'trash' ? 'active' : ''} onClick={() => changeFilter('trash')}>
            <Icon name="trash" />
            <span>حذف‌شده‌ها</span>
          </button>
        </nav>
        {['admin','super_admin'].includes(currentUser.role) && <button className="dashboard-nav admin-nav-link" onClick={() => { window.location.hash = 'admin'; }}><Icon name="shield" /><span>پنل مدیریت</span></button>}
        <div className="sidebar-divider" />
        <div className="sidebar-workspace">
          <span className="workspace-icon" aria-hidden="true">
            {currentUser.displayName.trim().charAt(0) || 'پ'}
          </span>
          <span className="sidebar-account-details">
            <strong>{currentUser.displayName}</strong>
            <small dir="ltr">{currentUser.email}</small>
          </span>
        </div>
        <button className="sidebar-logout" onClick={onLogout}>
          <span aria-hidden="true">↪</span>
          خروج از حساب
        </button>
        <div className="storage-note">
          <span>ذخیره‌سازی محلی</span>
          <div><i /></div>
          <small>داده‌ها از دستگاه شما خارج نمی‌شوند.</small>
        </div>
      </aside>

      {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="بستن فهرست" />}

      <section className="dashboard-main">
        <header className="dashboard-header">
          <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="باز کردن فهرست"><Icon name="menu" /></button>
          <div className="search-field">
            <Icon name="search" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جست‌وجوی ارائه‌ها" />
          </div>
          <button className="notification-button" aria-label="اعلان‌ها" onClick={() => {
            setToast('اعلان تازه‌ای ندارید.');
            window.setTimeout(() => setToast(null), 2200);
          }}><Icon name="bell" /></button>
          <button className="create-button" onClick={onCreate}><Icon name="plus" /><span>ارائهٔ جدید</span></button>
        </header>

        <div className="dashboard-content">
          <div className="dashboard-heading">
            <div>
              <p>کتابخانهٔ شخصی</p>
              <h1>{filter === 'trash' ? 'حذف‌شده‌ها' : filter === 'all' ? 'همهٔ ارائه‌ها' : 'اخیراً ویرایش‌شده'}</h1>
            </div>
            <span>{faNumber(visible.length)} ارائه</span>
          </div>

          {visible.length > 0 ? (
            <div className="presentation-grid">
              {visible.map((item, index) => (
                <article className="presentation-card" key={item.id}>
                  <button
                    className="presentation-preview"
                    onClick={() => !item.deletedAt && onOpen(item.id)}
                    disabled={Boolean(item.deletedAt)}
                    aria-label={`باز کردن ${item.title}`}
                  >
                    <SlideSvg
                      presentation={item.presentation}
                      slide={item.presentation.slides[0]}
                      idPrefix={`dashboard-${index}-${item.id}-`}
                      textMode="svg"
                    />
                    <span className="slide-count">{faNumber(item.presentation.slides.length)} اسلاید</span>
                    {!item.deletedAt && <span className="open-hint"><Icon name="arrow" size={18} /> باز کردن</span>}
                  </button>
                  <div className="presentation-meta">
                    <div>
                      <h2>{item.title}</h2>
                      <p>ویرایش {faRelativeDate(item.updatedAt)}</p>
                    </div>
                    <div className="card-menu-wrap">
                      <button className="card-menu-button" onClick={() => setMenuId(menuId === item.id ? null : item.id)} aria-label="گزینه‌های ارائه"><Icon name="more" /></button>
                      {menuId === item.id && (
                        <div className="card-menu">
                          {item.deletedAt ? (
                            <>
                              <button onClick={() => restore(item)}><Icon name="restore" size={17} /> بازگردانی</button>
                              <button className="danger" onClick={() => removeForever(item)}><Icon name="trash" size={17} /> حذف همیشگی</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startRename(item)}><Icon name="edit" size={17} /> تغییر نام</button>
                              <button onClick={() => onOpen(item.id)}><Icon name="play" size={17} /> باز کردن و نمایش</button>
                              <button onClick={() => onEdit(item.id)}><Icon name="text" size={17} /> ویرایشگر ارائه</button>
                              <button className="danger" onClick={() => moveToTrash(item)}><Icon name="trash" size={17} /> انتقال به حذف‌شده‌ها</button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-library">
              <div className="empty-art"><i /><i /><i /></div>
              <h2>{filter === 'trash' ? 'حذف‌شده‌ای وجود ندارد' : query ? 'نتیجه‌ای پیدا نشد' : 'اولین ارائه‌تان را بسازید'}</h2>
              <p>{filter === 'trash' ? 'ارائه‌های حذف‌شده اینجا دیده می‌شوند.' : query ? 'عبارت دیگری را جست‌وجو کنید.' : 'JSON خود را وارد کنید یا از نمونهٔ آماده شروع کنید.'}</p>
              {!query && filter !== 'trash' && <button className="create-button" onClick={onCreate}><Icon name="plus" /> ساخت ارائه</button>}
            </div>
          )}
        </div>
      </section>

      {renameItem && (
        <Modal title="تغییر نام ارائه" onClose={() => setRenameItem(null)}>
          <form className="rename-form" onSubmit={(event) => { event.preventDefault(); submitRename(); }}>
            <label htmlFor="rename">نام ارائه</label>
            <input id="rename" autoFocus value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setRenameItem(null)}>انصراف</button>
              <button type="submit" className="primary-button" disabled={!renameValue.trim()}>ذخیرهٔ نام</button>
            </div>
          </form>
        </Modal>
      )}
      {toast && <div className="toast"><Icon name="bell" />{toast}</div>}
    </main>
  );
}
