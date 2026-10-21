CREATE TABLE IF NOT EXISTS presentation_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  attachments_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_review','approved','rejected')),
  admin_note TEXT,
  draft_json TEXT,
  published_presentation_id TEXT REFERENCES presentations(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_presentation_requests_user_created
  ON presentation_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_presentation_requests_status_created
  ON presentation_requests(status, created_at DESC);
