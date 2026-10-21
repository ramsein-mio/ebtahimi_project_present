export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarKey: string | null;
  emailVerified: boolean;
  role: 'user' | 'admin' | 'super_admin';
  createdAt: string;
}

interface AuthResponse {
  ok: true;
  user: AuthUser;
}

interface ApiErrorResponse {
  error?: string;
}

export class AuthApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new AuthApiError(
      'ارتباط با سرور برقرار نشد. اتصال و اجرای Worker را بررسی کنید.',
      0,
    );
  }

  const data = await response.json().catch(() => null) as
    | (T & ApiErrorResponse)
    | null;

  if (!response.ok) {
    throw new AuthApiError(
      data && typeof data.error === 'string'
        ? data.error
        : 'درخواست با خطا مواجه شد. دوباره تلاش کنید.',
      response.status,
    );
  }

  if (data === null) {
    throw new AuthApiError('پاسخ سرور معتبر نیست.', response.status);
  }

  return data as T;
}

export async function registerAccount(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<void> {
  await request<{ ok: true; message: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function loginAccount(input: {
  email: string;
  password: string;
}): Promise<AuthUser> {
  const response = await request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return response.user;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await request<AuthResponse>('/api/auth/me');
    return response.user;
  } catch (error) {
    if (error instanceof AuthApiError && error.status === 401) {
      return null;
    }

    throw error;
  }
}

export async function logoutAccount(): Promise<void> {
  await request<{ ok: true }>('/api/auth/logout', {
    method: 'POST',
  });
}
