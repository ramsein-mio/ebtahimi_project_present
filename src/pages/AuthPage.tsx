import { useState, type FormEvent } from 'react';
import { AuthApiError, loginAccount, registerAccount } from '../auth';
import type { AuthUser } from '../auth';
import { Brand } from '../components/Brand';

interface AuthPageProps {
  onLogin: (user: AuthUser) => void;
}

type AuthMode = 'login' | 'register';

export function AuthPage({ onLogin }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';

  function changeMode(next: AuthMode) {
    setMode(next);
    setError('');
    setNotice('');
    setPassword('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setNotice('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('لطفاً ایمیل خود را وارد کنید.');
      return;
    }

    if (isRegister && !displayName.trim()) {
      setError('لطفاً نام نمایشی خود را وارد کنید.');
      return;
    }

    if (password.length < (isRegister ? 10 : 1)) {
      setError(
        isRegister
          ? 'رمز عبور باید حداقل ۱۰ نویسه داشته باشد.'
          : 'لطفاً رمز عبور خود را وارد کنید.',
      );
      return;
    }

    if (isRegister && password.length > 128) {
      setError('رمز عبور نمی‌تواند بیشتر از ۱۲۸ نویسه باشد.');
      return;
    }

    setBusy(true);

    try {
      if (isRegister) {
        await registerAccount({
          displayName: displayName.trim(),
          email: normalizedEmail,
          password,
        });

        setMode('login');
        setPassword('');
        setNotice('حساب شما ساخته شد. اکنون با ایمیل و رمز عبور وارد شوید.');
      } else {
        const user = await loginAccount({
          email: normalizedEmail,
          password,
        });

        onLogin(user);
      }
    } catch (cause) {
      if (cause instanceof AuthApiError) {
        if (cause.status === 0) {
          setError(cause.message);
        } else if (cause.status === 409) {
          setError('این ایمیل قبلاً ثبت شده است. وارد حساب خود شوید.');
        } else if (cause.status === 401) {
          setError('ایمیل یا رمز عبور صحیح نیست.');
        } else if (cause.status === 400) {
          setError('اطلاعات واردشده معتبر نیست. لطفاً آن‌ها را بررسی کنید.');
        } else if (cause.status === 403) {
          setError('درخواست از مبدأ مجاز پذیرفته نشد. تنظیمات سرور را بررسی کنید.');
        } else {
          setError(cause.message);
        }
      } else {
        setError('خطای غیرمنتظره‌ای رخ داد. دوباره تلاش کنید.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page" dir="rtl">
      <div className="auth-decoration auth-decoration--one" aria-hidden="true" />
      <div className="auth-decoration auth-decoration--two" aria-hidden="true" />

      <section className="auth-card">
        <header className="auth-brand">
          <Brand />
          <span className="auth-brand-caption">فضای کاری شما</span>
        </header>

        <div className="auth-intro">
          <div className="auth-eyebrow">
            <span />
            ارائه‌ها، ایده‌ها، یک فضای شخصی
          </div>

          <h1>{isRegister ? 'به پردیس بپیوندید' : 'خوش برگشتید'}</h1>

          <p>
            {isRegister
              ? 'حساب خود را بسازید و فضای کاری شخصی‌تان را آغاز کنید.'
              : 'برای ورود به فضای کاری خود، اطلاعات حساب را وارد کنید.'}
          </p>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="نوع حساب">
          <button
            type="button"
            role="tab"
            aria-selected={!isRegister}
            className={!isRegister ? 'active' : ''}
            onClick={() => changeMode('login')}
            disabled={busy}
          >
            ورود
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={isRegister}
            className={isRegister ? 'active' : ''}
            onClick={() => changeMode('register')}
            disabled={busy}
          >
            ساخت حساب
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {isRegister && (
            <label className="auth-field">
              <span>نام نمایشی</span>
              <input
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="نام شما"
                maxLength={80}
                required
                disabled={busy}
              />
            </label>
          )}

          <label className="auth-field">
            <span>ایمیل</span>
            <input
              type="email"
              dir="ltr"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              maxLength={254}
              required
              disabled={busy}
            />
          </label>

          <label className="auth-field">
            <span>رمز عبور</span>
            <input
              type="password"
              dir="ltr"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isRegister ? 'حداقل ۱۰ نویسه' : 'رمز عبور شما'}
              minLength={isRegister ? 10 : undefined}
              maxLength={128}
              required
              disabled={busy}
            />
            {isRegister && (
              <small>رمز عبور باید بین ۱۰ تا ۱۲۸ نویسه باشد.</small>
            )}
          </label>

          {error && (
            <div className="auth-message auth-message--error" role="alert">
              {error}
            </div>
          )}

          {notice && (
            <div className="auth-message auth-message--success" role="status">
              {notice}
            </div>
          )}

          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? (
              <>
                <span className="auth-spinner" aria-hidden="true" />
                لطفاً صبر کنید...
              </>
            ) : isRegister ? (
              'ساخت حساب کاربری'
            ) : (
              'ورود به پردیس'
            )}
          </button>
        </form>

        <footer className="auth-footer">
          <span className="auth-footer-dot" />
          ورود امن با نشست محافظت‌شده
        </footer>
      </section>

      <p className="auth-bottom-note">
        پردیس — فضای ساخت و مدیریت ارائه‌های شما
      </p>
    </main>
  );
}
