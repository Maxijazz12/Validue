CREATE TABLE IF NOT EXISTS admin_rate_limit_events (
  id BIGSERIAL PRIMARY KEY,
  scope TEXT NOT NULL,
  identifier_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_rate_limit_events_scope_identifier_created_at
  ON admin_rate_limit_events (scope, identifier_hash, created_at DESC);
