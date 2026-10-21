-- Add server-enforced account roles without rewriting existing user data.
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin', 'super_admin'));

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Only pre-existing accounts with these exact email addresses receive elevated access.
UPDATE users SET role = 'super_admin', updated_at = datetime('now')
WHERE lower(email) IN ('hossein.rmz.j@gmail.com', 'hossein.rmz.o@gmail.com');
