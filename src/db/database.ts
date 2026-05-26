import { DatabaseSync } from 'node:sqlite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '../../data/database.sqlite');

mkdirSync(join(__dirname, '../../data'), { recursive: true });

const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS seen_posts (
    post_id TEXT PRIMARY KEY,
    seen_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`DELETE FROM seen_posts WHERE seen_at < datetime('now', '-30 days')`);

export const getNewsChannel = (guildId: string): string | null => {
    const stmt = db.prepare('SELECT channel_id FROM config WHERE guild_id = ?');
    const row = stmt.get(guildId) as { channel_id: string } | undefined;
    return row?.channel_id ?? null;
};

export const setNewsChannel = (guildId: string, channelId: string): void => {
    db.prepare(
        `
    INSERT INTO config (guild_id, channel_id)
    VALUES (?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET channel_id = excluded.channel_id
  `,
    ).run(guildId, channelId);
};

export const isPostSeen = (postId: string): boolean => {
    const row = db.prepare('SELECT 1 FROM seen_posts WHERE post_id = ?').get(postId);
    return row !== undefined;
};

export const markPostSeen = (postId: string): void => {
    db.prepare('INSERT OR IGNORE INTO seen_posts (post_id) VALUES (?)').run(postId);
};
