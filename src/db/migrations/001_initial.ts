export const sql = `
  CREATE TABLE IF NOT EXISTS config (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT,
    news_mode TEXT NOT NULL DEFAULT 'official',
    role_id TEXT
  );

  CREATE TABLE IF NOT EXISTS seen_posts (
    post_id TEXT PRIMARY KEY,
    seen_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;
