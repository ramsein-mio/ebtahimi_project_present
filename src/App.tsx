import { useCallback, useEffect, useState } from 'react';
import { AuthApiError, getCurrentUser, logoutAccount } from './auth';
import type { AuthUser } from './auth';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { JsonInput } from './pages/JsonInput';
import { EditorPage } from './pages/Editor';
import { ViewerPage } from './ViewerPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { PresentationChat } from './pages/PresentationChat';
import { getStoredPresentation } from './storage';
import type { Route } from './types';

function readRoute(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');

  if (hash === 'new') return { page: 'chat' };
  if (hash === 'json') return { page: 'json' };
  if (hash === 'admin') return { page: 'admin' };

  if (hash.startsWith('editor/')) {
    return {
      page: 'editor',
      id: decodeURIComponent(hash.slice(7)),
    };
  }

  if (hash.startsWith('viewer/')) {
    return {
      page: 'viewer',
      id: decodeURIComponent(hash.slice(7)),
    };
  }

  return { page: 'dashboard' };
}

function navigate(hash: string): void {
  window.location.hash = hash;
}

type AuthStatus = 'checking' | 'signed-in' | 'signed-out' | 'error';

export default function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');
  const [authError, setAuthError] = useState('');
  const [logoutBusy, setLogoutBusy] = useState(false);

  const checkSession = useCallback(async () => {
    setAuthStatus('checking');
    setAuthError('');

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setAuthStatus(currentUser ? 'signed-in' : 'signed-out');
    } catch (error) {
      setUser(null);
      setAuthStatus('error');

      setAuthError(
        error instanceof AuthApiError
          ? error.message
          : 'بررسی نشست کاربری انجام نشد.',
      );
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = 'fa';
    document.documentElement.dir = 'rtl';

    const update = () => setRoute(readRoute());

    window.addEventListener('hashchange', update);
    void checkSession();

    return () => window.removeEventListener('hashchange', update);
  }, [checkSession]);

  const handleLogout = async () => {
    if (logoutBusy) return;

    setLogoutBusy(true);

    try {
      await logoutAccount();
      setUser(null);
      setAuthStatus('signed-out');
      setAuthError('');
      navigate('');
    } catch (error) {
      window.alert(
        error instanceof AuthApiError
          ? error.message
          : 'خروج انجام نشد. دوباره تلاش کنید.',
      );
    } finally {
      setLogoutBusy(false);
    }
  };

  if (authStatus === 'checking') {
    return (
      <main className="auth-status-page" dir="rtl">
        <BrandLoading />
        <p>در حال بررسی حساب کاربری...</p>
      </main>
    );
  }

  if (authStatus === 'error') {
    return (
      <main className="auth-status-page" dir="rtl">
        <BrandLoading />
        <h1>ارتباط با سرور برقرار نشد</h1>
        <p>{authError}</p>
        <button className="auth-submit auth-retry" onClick={() => void checkSession()}>
          تلاش دوباره
        </button>
      </main>
    );
  }

  if (authStatus === 'signed-out' || !user) {
    return (
      <AuthPage
        onLogin={(authenticatedUser) => {
          setUser(authenticatedUser);
          setAuthStatus('signed-in');
          setAuthError('');
        }}
      />
    );
  }

  if (route.page === 'admin') {
    if (!['admin', 'super_admin'].includes(user.role)) {
      navigate('dashboard');
      return <Dashboard currentUser={user} onLogout={() => void handleLogout()} onCreate={() => navigate('new')} onOpen={(id) => navigate(`viewer/${encodeURIComponent(id)}`)} onEdit={(id) => navigate(`editor/${encodeURIComponent(id)}`)} />;
    }
    return <AdminDashboard currentUser={user} onBack={() => navigate('dashboard')} onLogout={() => void handleLogout()} />;
  }

  const dashboard = (
    <Dashboard
      currentUser={user}
      onLogout={() => void handleLogout()}
      onCreate={() => navigate('new')}
      onOpen={(id) => navigate(`viewer/${encodeURIComponent(id)}`)}
      onEdit={(id) => navigate(`editor/${encodeURIComponent(id)}`)}
    />
  );

  if (route.page === 'chat') {
    return <PresentationChat onBack={() => navigate('dashboard')} />;
  }

  if (route.page === 'json') {
    return (
      <JsonInput
        onBack={() => navigate('dashboard')}
        onGenerated={(id) => navigate(`editor/${encodeURIComponent(id)}`)}
      />
    );
  }

  if (route.page === 'editor') {
    return (
      <EditorPage
        id={route.id}
        onBack={() => navigate('dashboard')}
        onPresent={() => navigate(`viewer/${encodeURIComponent(route.id)}`)}
      />
    );
  }

  if (route.page === 'viewer') {
    const record = getStoredPresentation(route.id);

    if (!record) return dashboard;

    return (
      <ViewerPage
        id={record.id}
        title={record.title}
        presentation={record.presentation}
        onBack={() => navigate('dashboard')}
        onEdit={() => navigate(`editor/${encodeURIComponent(record.id)}`)}
      />
    );
  }

  return dashboard;
}

function BrandLoading() {
  return (
    <div className="auth-status-brand">
      <span className="auth-status-mark">پ</span>
      <strong>پردیس</strong>
    </div>
  );
}
