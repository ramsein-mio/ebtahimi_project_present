import { useEffect, useState } from 'react';
import type { Presentation } from '@web-ppt/core';
import { Icon } from './icons';
import { Viewer } from './pages/Viewer';
import { getStoredPresentation } from './storage';

const PRESENT_INDEX_KEY = 'pardis-present-index';

export function readPresentIndex(): number {
  try {
    const raw = sessionStorage.getItem(PRESENT_INDEX_KEY);
    const value = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

interface ViewerPageProps {
  id: string;
  title: string;
  presentation: Presentation;
  onBack: () => void;
  onEdit: () => void;
}

export function ViewerPage({ id, title, presentation, onBack, onEdit }: ViewerPageProps) {
  const [draft, setDraft] = useState<Presentation>(presentation);

  useEffect(() => {
    const reload = () => {
      const record = getStoredPresentation(id);
      if (record) setDraft(record.presentation);
    };
    window.addEventListener('focus', reload);
    reload();
    return () => window.removeEventListener('focus', reload);
  }, [id]);

  return (
    <Viewer
      presentation={draft}
      title={title}
      initialIndex={readPresentIndex()}
      onBack={onBack}
      onEdit={onEdit}
    />
  );
}

export function ViewerMissing({ onBack }: { onBack: () => void }) {
  return (
    <main className="missing-page" dir="rtl" lang="fa">
      <Icon name="warning" size={40} />
      <h1>ارائه یافت نشد</h1>
      <p>این ارائه حذف شده یا داده‌های آن قابل بازگشایی نیست.</p>
      <button className="primary-button" onClick={onBack}>بازگشت به داشبورد</button>
    </main>
  );
}
