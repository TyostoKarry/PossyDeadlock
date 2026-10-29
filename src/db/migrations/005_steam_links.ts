export const sql = `
  CREATE TABLE steam_links (
    discord_user_id TEXT PRIMARY KEY,
    steam_account_id INTEGER NOT NULL,
    linked_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;
