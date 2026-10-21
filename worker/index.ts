interface Env {
  pardis_present_db: D1Database;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  avatar_key: string | null;
  email_verified_at: string | null;
  role: string;
  created_at: string;
}

interface PresentationRow {
  id: string;
  user_id: string;
  title: string;
  content_json: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface SessionUserRow {
  id: string;
  email: string;
  display_name: string;
  avatar_key: string | null;
  email_verified_at: string | null;
  role: string;
  created_at: string;
}

const PASSWORD_ITERATIONS = 100000;
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;
const MAX_BODY_BYTES = 16 * 1024;

function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
  responseHeaders.set('Cache-Control', 'no-store');
  responseHeaders.set('X-Content-Type-Options', 'nosniff');

  return Response.json(data, {
    status,
    headers: responseHeaders,
  });
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(value: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})+$/i.test(value)) {
    throw new Error('Invalid hexadecimal value');
  }

  return Uint8Array.from(
    value.match(/.{2}/g)!.map((part) => parseInt(part, 16)),
  );
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return hex(bytes);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );

  return hex(new Uint8Array(digest));
}

async function derivePasswordHash(
  password: string,
  saltHex: string,
  iterations: number,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: fromHex(saltHex),
      iterations,
    },
    key,
    256,
  );

  return hex(new Uint8Array(derived));
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomHex(16);
  const hash = await derivePasswordHash(
    password,
    salt,
    PASSWORD_ITERATIONS,
  );

  return `pbkdf2-sha256$${PASSWORD_ITERATIONS}$${salt}$${hash}`;
}

async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  try {
    const [algorithm, iterationText, salt, expectedHash] =
      storedHash.split('$');

    const iterations = Number(iterationText);

    if (
      algorithm !== 'pbkdf2-sha256' ||
      !Number.isInteger(iterations) ||
      iterations < 100000 ||
      iterations > 1000000 ||
      !/^[0-9a-f]{32}$/i.test(salt) ||
      !/^[0-9a-f]{64}$/i.test(expectedHash)
    ) {
      return false;
    }

    const actualHash = await derivePasswordHash(
      password,
      salt,
      iterations,
    );

    const actualBytes = fromHex(actualHash);
    const expectedBytes = fromHex(expectedHash);

    let difference = 0;

    for (let i = 0; i < actualBytes.length; i++) {
      difference |= actualBytes[i] ^ expectedBytes[i];
    }

    return difference === 0;
  } catch {
    return false;
  }
}

function cookieName(): string {
  return 'pardis_session';
}

function sessionCookie(
  token: string,
  requestUrl: URL,
): string {
  const secure =
    requestUrl.hostname !== 'localhost' &&
    requestUrl.hostname !== '127.0.0.1' &&
    requestUrl.hostname !== '::1';

  return [
    `${cookieName()}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_DURATION_SECONDS}`,
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

function clearSessionCookie(requestUrl: URL): string {
  const secure =
    requestUrl.hostname !== 'localhost' &&
    requestUrl.hostname !== '127.0.0.1' &&
    requestUrl.hostname !== '::1';

  return [
    `${cookieName()}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

function readSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie');

  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');

    if (separator < 0) {
      continue;
    }

    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();

    if (
      name === cookieName() &&
      /^[0-9a-f]{64}$/i.test(value)
    ) {
      return value;
    }
  }

  return null;
}

async function readJson(
  request: Request,
  maxBytes = MAX_BODY_BYTES,
): Promise<Record<string, unknown> | null> {
  const contentType = request.headers.get('Content-Type') ?? '';

  if (!contentType.toLowerCase().includes('application/json')) {
    return null;
  }

  const contentLength = Number(request.headers.get('Content-Length') ?? 0);

  if (contentLength > maxBytes) {
    return null;
  }

  const text = await request.text();

  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(text);

    if (
      value === null ||
      typeof value !== 'object' ||
      Array.isArray(value)
    ) {
      return null;
    }

    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

function originAllowed(request: Request, url: URL): boolean {
  const origin = request.headers.get('Origin');

  // Requests from command-line tools may omit Origin.
  // Browsers send Origin for these POST requests.
  return origin === null || origin === url.origin;
}

const SUPER_ADMIN_EMAILS = new Set([
  'hossein.rmz.j@gmail.com',
  'hossein.rmz.o@gmail.com',
]);

function isSuperAdminEmail(email: string): boolean {
  return SUPER_ADMIN_EMAILS.has(email.trim().toLowerCase());
}

function publicUser(user: SessionUserRow) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    avatarKey: user.avatar_key,
    emailVerified: user.email_verified_at !== null,
    role: user.role,
    createdAt: user.created_at,
  };
}

async function currentUser(
  request: Request,
  env: Env,
): Promise<SessionUserRow | null> {
  const token = readSessionToken(request);

  if (!token) {
    return null;
  }

  const tokenHash = await sha256(token);
  const now = new Date().toISOString();

  const row = await env.pardis_present_db
    .prepare(`
      SELECT
        u.id,
        u.email,
        u.display_name,
        u.avatar_key,
        u.email_verified_at,
        u.role,
        u.created_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?
        AND s.expires_at > ?
        AND u.deleted_at IS NULL
      LIMIT 1
    `)
    .bind(tokenHash, now)
    .first<SessionUserRow>();

  if (!row) {
    await env.pardis_present_db
      .prepare('DELETE FROM sessions WHERE token_hash = ?')
      .bind(tokenHash)
      .run();

    return null;
  }

  await env.pardis_present_db
    .prepare('UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?')
    .bind(now, tokenHash)
    .run();

  return row;
}

async function register(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  const body = await readJson(request);

  if (!body) {
    return json({
      error: 'A valid JSON request is required.',
    }, 400);
  }

  const email =
    typeof body.email === 'string'
      ? body.email.trim().toLowerCase()
      : '';

  const password =
    typeof body.password === 'string'
      ? body.password
      : '';

  const displayName =
    typeof body.displayName === 'string'
      ? body.displayName.trim()
      : '';

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return json({ error: 'Enter a valid email address.' }, 400);
  }

  if (password.length < 10 || password.length > 128) {
    return json({
      error: 'Password must contain between 10 and 128 characters.',
    }, 400);
  }

  if (displayName.length < 1 || displayName.length > 80) {
    return json({
      error: 'Display name must contain between 1 and 80 characters.',
    }, 400);
  }

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  const result = await env.pardis_present_db
    .prepare(`
      INSERT OR IGNORE INTO users (
        id,
        email,
        password_hash,
        display_name,
        role,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(userId, email, passwordHash, displayName, isSuperAdminEmail(email) ? 'super_admin' : 'user', now, now)
    .run();

  if ((result.meta?.changes ?? 0) === 0) {
    return json({
      error: 'An account with this email may already exist.',
    }, 409);
  }

  return json({
    ok: true,
    message: 'Account created. You can now log in.',
  }, 201);
}

async function login(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  const body = await readJson(request);

  if (!body) {
    return json({
      error: 'A valid JSON request is required.',
    }, 400);
  }

  const email =
    typeof body.email === 'string'
      ? body.email.trim().toLowerCase()
      : '';

  const password =
    typeof body.password === 'string'
      ? body.password
      : '';

  if (
    email.length > 254 ||
    password.length < 1 ||
    password.length > 128
  ) {
    return json({
      error: 'Invalid email or password.',
    }, 401);
  }

  const user = await env.pardis_present_db
    .prepare(`
      SELECT id, email, password_hash, display_name,
             avatar_key, email_verified_at, role, created_at
      FROM users
      WHERE email = ? COLLATE NOCASE
        AND deleted_at IS NULL
      LIMIT 1
    `)
    .bind(email)
    .first<UserRow>();

  if (!user) {
    // Perform a password derivation even when the account is missing.
    // This reduces (but does not eliminate) timing differences.
    await derivePasswordHash(
      password,
      '00000000000000000000000000000000',
      PASSWORD_ITERATIONS,
    );

    return json({ error: 'Invalid email or password.' }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash);

  if (!valid) {
    return json({ error: 'Invalid email or password.' }, 401);
  }

  const token = randomHex(32);
  const tokenHash = await sha256(token);
  const now = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_SECONDS * 1000,
  ).toISOString();

  await env.pardis_present_db
    .prepare(`
      INSERT INTO sessions (
        token_hash,
        user_id,
        expires_at,
        created_at,
        last_seen_at
      )
      VALUES (?, ?, ?, ?, ?)
    `)
    .bind(tokenHash, user.id, expiresAt, now, now)
    .run();

  const sessionUser: SessionUserRow = {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    avatar_key: user.avatar_key,
    email_verified_at: user.email_verified_at,
    role: user.role,
    created_at: user.created_at,
  };

  return json(
    {
      ok: true,
      user: publicUser(sessionUser),
    },
    200,
    {
      'Set-Cookie': sessionCookie(token, url),
    },
  );
}

async function logout(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  const token = readSessionToken(request);

  if (token) {
    const tokenHash = await sha256(token);

    await env.pardis_present_db
      .prepare('DELETE FROM sessions WHERE token_hash = ?')
      .bind(tokenHash)
      .run();
  }

  return json(
    { ok: true },
    200,
    { 'Set-Cookie': clearSessionCookie(url) },
  );
}



async function requireAdmin(request: Request, env: Env): Promise<SessionUserRow | null> {
  const user = await currentUser(request, env);
  return user && ['admin', 'super_admin'].includes(user.role) ? user : null;
}
async function adminOverview(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: 'Administrator access required.' }, 403);
  const db = env.pardis_present_db;
  const [users, presentations, sessions, recentUsers, recentPresentations] = await Promise.all([
    db.prepare('SELECT COUNT(*) AS total, SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END) AS active FROM users').first<{total:number;active:number}>(),
    db.prepare('SELECT COUNT(*) AS total FROM presentations').first<{total:number}>(),
    db.prepare('SELECT COUNT(*) AS total FROM sessions WHERE expires_at > ?').bind(new Date().toISOString()).first<{total:number}>(),
    db.prepare('SELECT id,email,display_name,role,created_at FROM users ORDER BY created_at DESC LIMIT 8').all(),
    db.prepare('SELECT p.id,p.title,p.created_at,p.updated_at,u.email AS owner_email FROM presentations p JOIN users u ON u.id=p.user_id ORDER BY p.updated_at DESC LIMIT 8').all(),
  ]);
  return json({ok:true, overview:{users:users?.total ?? 0, activeUsers:users?.active ?? 0, presentations:presentations?.total ?? 0, activeSessions:sessions?.total ?? 0, recentUsers:recentUsers.results ?? [], recentPresentations:recentPresentations.results ?? []}});
}
async function adminListUsers(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: 'Administrator access required.' }, 403);
  const query = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 100);
  const rows = await env.pardis_present_db.prepare(`
    SELECT u.id,u.email,u.display_name,u.role,u.email_verified_at,u.created_at,u.deleted_at,
      (SELECT COUNT(*) FROM presentations p WHERE p.user_id=u.id) AS presentation_count
    FROM users u WHERE (? = '' OR u.email LIKE ? OR u.display_name LIKE ?)
    ORDER BY u.created_at DESC LIMIT 200
  `).bind(query, `%${query}%`, `%${query}%`).all();
  return json({ok:true, users:rows.results ?? []});
}
async function adminChangeRole(request: Request, env: Env, userId: string): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: 'Administrator access required.' }, 403);
  if (admin.role !== 'super_admin') return json({ error: 'Only super admins can change roles.' }, 403);
  const body = await readJson(request);
  const role = body?.role;
  if (!['user','admin'].includes(String(role))) return json({error:'Role must be user or admin.'},400);
  const target = await env.pardis_present_db.prepare('SELECT id,email FROM users WHERE id=? AND deleted_at IS NULL').bind(userId).first<{id:string;email:string}>();
  if (!target) return json({error:'User not found.'},404);
  if (isSuperAdminEmail(target.email)) return json({error:'Super-admin accounts are protected.'},403);
  await env.pardis_present_db.prepare('UPDATE users SET role=?, updated_at=? WHERE id=?').bind(role,new Date().toISOString(),userId).run();
  return json({ok:true,userId,role});
}

const MAX_PRESENTATION_BODY_BYTES = 2 * 1024 * 1024;

function presentationObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate.slides);
}

function serializePresentation(row: PresentationRow) {
  let presentation: unknown;

  try {
    presentation = JSON.parse(row.content_json);
  } catch {
    throw new Error('Stored presentation JSON is invalid.');
  }

  if (!presentationObject(presentation)) {
    throw new Error('Stored presentation structure is invalid.');
  }

  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.deleted_at ? { deletedAt: row.deleted_at } : {}),
    presentation,
  };
}

async function listPresentations(
  request: Request,
  env: Env,
): Promise<Response> {
  const user = await currentUser(request, env);
  if (!user) return json({ error: 'Not authenticated.' }, 401);

  const result = await env.pardis_present_db
    .prepare(`
      SELECT id, user_id, title, content_json,
             created_at, updated_at, deleted_at
      FROM presentations
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `)
    .bind(user.id)
    .all<PresentationRow>();

  return json({
    ok: true,
    presentations: (result.results ?? []).map(serializePresentation),
  });
}

async function getPresentation(
  request: Request,
  env: Env,
  id: string,
): Promise<Response> {
  const user = await currentUser(request, env);
  if (!user) return json({ error: 'Not authenticated.' }, 401);

  const row = await env.pardis_present_db
    .prepare(`
      SELECT id, user_id, title, content_json,
             created_at, updated_at, deleted_at
      FROM presentations
      WHERE id = ? AND user_id = ?
      LIMIT 1
    `)
    .bind(id, user.id)
    .first<PresentationRow>();

  if (!row) return json({ error: 'Presentation not found.' }, 404);

  return json({ ok: true, presentation: serializePresentation(row) });
}

async function createPresentation(
  request: Request,
  env: Env,
): Promise<Response> {
  const user = await currentUser(request, env);
  if (!user) return json({ error: 'Not authenticated.' }, 401);

  const body = await readJson(request, MAX_PRESENTATION_BODY_BYTES);
  if (!body) {
    return json({ error: 'A valid JSON request is required.' }, 400);
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';

  if (!title || title.length > 200) {
    return json({ error: 'Title must contain between 1 and 200 characters.' }, 400);
  }

  if (!presentationObject(body.presentation)) {
    return json({ error: 'A valid presentation with a slides array is required.' }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const content = JSON.stringify(body.presentation);

  await env.pardis_present_db
    .prepare(`
      INSERT INTO presentations (
        id, user_id, title, content_json,
        created_at, updated_at, visibility
      )
      VALUES (?, ?, ?, ?, ?, ?, 'private')
    `)
    .bind(id, user.id, title, content, now, now)
    .run();

  const row: PresentationRow = {
    id,
    user_id: user.id,
    title,
    content_json: content,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  return json({ ok: true, presentation: serializePresentation(row) }, 201);
}

async function updatePresentation(
  request: Request,
  env: Env,
  id: string,
): Promise<Response> {
  const user = await currentUser(request, env);
  if (!user) return json({ error: 'Not authenticated.' }, 401);

  const body = await readJson(request, MAX_PRESENTATION_BODY_BYTES);
  if (!body) {
    return json({ error: 'A valid JSON request is required.' }, 400);
  }

  const existing = await env.pardis_present_db
    .prepare(`
      SELECT id, user_id, title, content_json,
             created_at, updated_at, deleted_at
      FROM presentations
      WHERE id = ? AND user_id = ?
      LIMIT 1
    `)
    .bind(id, user.id)
    .first<PresentationRow>();

  if (!existing) return json({ error: 'Presentation not found.' }, 404);

  let title = existing.title;
  let content = existing.content_json;
  let deletedAt = existing.deleted_at;

  if (Object.prototype.hasOwnProperty.call(body, 'title')) {
    if (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 200) {
      return json({ error: 'Title must contain between 1 and 200 characters.' }, 400);
    }
    title = body.title.trim();
  }

  if (Object.prototype.hasOwnProperty.call(body, 'presentation')) {
    if (!presentationObject(body.presentation)) {
      return json({ error: 'A valid presentation with a slides array is required.' }, 400);
    }
    content = JSON.stringify(body.presentation);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'deletedAt')) {
    if (body.deletedAt === null) {
      deletedAt = null;
    } else if (
      typeof body.deletedAt === 'string' &&
      !Number.isNaN(Date.parse(body.deletedAt))
    ) {
      deletedAt = new Date(body.deletedAt).toISOString();
    } else {
      return json({ error: 'deletedAt must be a valid date or null.' }, 400);
    }
  }

  const now = new Date().toISOString();

  await env.pardis_present_db
    .prepare(`
      UPDATE presentations
      SET title = ?, content_json = ?, deleted_at = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `)
    .bind(title, content, deletedAt, now, id, user.id)
    .run();

  const updated: PresentationRow = {
    ...existing,
    title,
    content_json: content,
    deleted_at: deletedAt,
    updated_at: now,
  };

  return json({ ok: true, presentation: serializePresentation(updated) });
}

async function deletePresentation(
  request: Request,
  env: Env,
  id: string,
): Promise<Response> {
  const user = await currentUser(request, env);
  if (!user) return json({ error: 'Not authenticated.' }, 401);

  const result = await env.pardis_present_db
    .prepare('DELETE FROM presentations WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .run();

  if ((result.meta?.changes ?? 0) === 0) {
    return json({ error: 'Presentation not found.' }, 404);
  }

  return json({ ok: true });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health' && request.method === 'GET') {
      return json({
        ok: true,
        service: 'pardis-present-api',
      });
    }

    if (url.pathname === '/api/db-health' && request.method === 'GET') {
      try {
        const result = await env.pardis_present_db
          .prepare('SELECT 1 AS connected')
          .first<{ connected: number }>();

        return json({
          ok: result?.connected === 1,
          database: 'pardis_present_db',
        });
      } catch {
        return json({
          ok: false,
          error: 'Database connection failed',
        }, 503);
      }
    }

    if (url.pathname.startsWith('/api/')) {
      if (!['GET', 'POST', 'PUT', 'DELETE'].includes(request.method)) {
        return json({ error: 'Method not allowed.' }, 405, {
          Allow: 'GET, POST, PUT, DELETE',
        });
      }

      if (
        request.method !== 'GET' &&
        !originAllowed(request, url)
      ) {
        return json({ error: 'Origin not allowed.' }, 403);
      }


      try {
        if (url.pathname === '/api/admin/overview' && request.method === 'GET') return await adminOverview(request, env);
        if (url.pathname === '/api/admin/users' && request.method === 'GET') return await adminListUsers(request, env);
        const roleMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/role$/);
        if (roleMatch && request.method === 'PUT') {
          let targetId: string;
          try { targetId = decodeURIComponent(roleMatch[1]); } catch { return json({error:'Invalid user ID.'},400); }
          return await adminChangeRole(request, env, targetId);
        }

        if (
          url.pathname === '/api/presentations' &&
          request.method === 'GET'
        ) {
          return await listPresentations(request, env);
        }

        if (
          url.pathname === '/api/presentations' &&
          request.method === 'POST'
        ) {
          return await createPresentation(request, env);
        }

        const presentationMatch = url.pathname.match(/^\/api\/presentations\/([^/]+)$/);

        if (presentationMatch) {
          let presentationId: string;

          try {
            presentationId = decodeURIComponent(presentationMatch[1]);
          } catch {
            return json({ error: 'Invalid presentation ID.' }, 400);
          }

          if (request.method === 'GET') {
            return await getPresentation(request, env, presentationId);
          }

          if (request.method === 'PUT') {
            return await updatePresentation(request, env, presentationId);
          }

          if (request.method === 'DELETE') {
            return await deletePresentation(request, env, presentationId);
          }
        }

        if (
          url.pathname === '/api/auth/register' &&
          request.method === 'POST'
        ) {
          return await register(request, env, url);
        }

        if (
          url.pathname === '/api/auth/login' &&
          request.method === 'POST'
        ) {
          return await login(request, env, url);
        }

        if (
          url.pathname === '/api/auth/logout' &&
          request.method === 'POST'
        ) {
          return await logout(request, env, url);
        }

        if (
          url.pathname === '/api/auth/me' &&
          request.method === 'GET'
        ) {
          const user = await currentUser(request, env);

          if (!user) {
            return json({ error: 'Not authenticated.' }, 401);
          }

          return json({
            ok: true,
            user: publicUser(user),
          });
        }

        return json({ error: 'API endpoint not found.' }, 404);
      } catch (error) {
        const message = error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error);

        console.error('[pardis-present] API request failed:', message);

        return json({
          error: 'The request could not be completed.',
        }, 500);
      }
    }

    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
