import { DatabaseSync } from 'node:sqlite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import { logger } from '../utils/logger.js';
import { migrations } from './migrations/index.js';
import type { Hero, HeroMatchup, HeroSynergy } from '../types/heroes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDev = process.env.ENVIRONMENT === 'development';
const dbPath = join(__dirname, `../../data/database${isDev ? '.dev' : ''}.sqlite`);

mkdirSync(join(__dirname, '../../data'), { recursive: true });

const db = new DatabaseSync(dbPath);

const currentVersion = (db.prepare('PRAGMA user_version').get() as { user_version: number })
    .user_version;

for (const [i, migration] of migrations.slice(currentVersion).entries()) {
    db.exec(migration);
    db.exec(`PRAGMA user_version = ${currentVersion + i + 1}`);
    logger.info(`DB: applied migration ${currentVersion + i + 1}`);
}

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

export const clearNewsChannel = (guildId: string): void => {
    db.prepare('UPDATE config SET channel_id = NULL WHERE guild_id = ?').run(guildId);
};

export const getNewsMode = (guildId: string): string => {
    const row = db.prepare('SELECT news_mode FROM config WHERE guild_id = ?').get(guildId) as
        | { news_mode: string }
        | undefined;
    return row?.news_mode ?? 'official';
};

export const setNewsMode = (guildId: string, mode: string): void => {
    db.prepare(`UPDATE config SET news_mode = ? WHERE guild_id = ?`).run(mode, guildId);
};

export const getPingRole = (guildId: string): string | null => {
    const row = db.prepare('SELECT role_id FROM config WHERE guild_id = ?').get(guildId) as
        | { role_id: string | null }
        | undefined;
    return row?.role_id ?? null;
};

export const setPingRole = (guildId: string, roleId: string | null): void => {
    db.prepare('UPDATE config SET role_id = ? WHERE guild_id = ?').run(roleId, guildId);
};

export const isPostSeen = (postId: string): boolean => {
    const row = db.prepare('SELECT 1 FROM seen_posts WHERE post_id = ?').get(postId);
    return row !== undefined;
};

export const markPostSeen = (postId: string): void => {
    db.prepare('INSERT OR IGNORE INTO seen_posts (post_id) VALUES (?)').run(postId);
};

export const upsertHero = (hero: Omit<Hero, 'updated_at'>): void => {
    db.prepare(
        `INSERT INTO heroes (id, name, image_url, hero_type, complexity, base_hp, hp_per_boon, move_speed, stamina, sprint_speed, win_rate, pick_rate, matches, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           image_url = excluded.image_url,
           hero_type = excluded.hero_type,
           complexity = excluded.complexity,
           base_hp = excluded.base_hp,
           hp_per_boon = excluded.hp_per_boon,
           move_speed = excluded.move_speed,
           stamina = excluded.stamina,
           sprint_speed = excluded.sprint_speed,
           win_rate = excluded.win_rate,
           pick_rate = excluded.pick_rate,
           matches = excluded.matches,
           updated_at = CURRENT_TIMESTAMP`,
    ).run(
        hero.id,
        hero.name,
        hero.image_url,
        hero.hero_type,
        hero.complexity,
        hero.base_hp,
        hero.hp_per_boon,
        hero.move_speed,
        hero.stamina,
        hero.sprint_speed,
        hero.win_rate,
        hero.pick_rate,
        hero.matches,
    );
};

export const upsertHeroMatchup = (
    heroId: number,
    enemyId: number,
    winRate: number,
    matches: number,
): void => {
    db.prepare(
        `INSERT INTO hero_matchups (hero_id, enemy_id, win_rate, matches)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(hero_id, enemy_id) DO UPDATE SET
           win_rate = excluded.win_rate,
           matches = excluded.matches`,
    ).run(heroId, enemyId, winRate, matches);
};

export const upsertHeroSynergy = (
    heroId: number,
    allyId: number,
    winRate: number,
    matches: number,
): void => {
    db.prepare(
        `INSERT INTO hero_synergies (hero_id, ally_id, win_rate, matches)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(hero_id, ally_id) DO UPDATE SET
           win_rate = excluded.win_rate,
           matches = excluded.matches`,
    ).run(heroId, allyId, winRate, matches);
};

export const getAllHeroes = (): Hero[] =>
    db.prepare('SELECT * FROM heroes ORDER BY name ASC').all() as unknown as Hero[];

export const getHeroById = (id: number): Hero | undefined =>
    db.prepare('SELECT * FROM heroes WHERE id = ?').get(id) as unknown as Hero | undefined;

export const getHeroByName = (name: string): Hero | undefined =>
    db.prepare('SELECT * FROM heroes WHERE lower(name) = lower(?)').get(name) as unknown as
        | Hero
        | undefined;

export const getHeroMatchups = (heroId: number): HeroMatchup[] =>
    db
        .prepare('SELECT * FROM hero_matchups WHERE hero_id = ? ORDER BY win_rate DESC')
        .all(heroId) as unknown as HeroMatchup[];

export const getHeroSynergies = (heroId: number): HeroSynergy[] =>
    db
        .prepare('SELECT * FROM hero_synergies WHERE hero_id = ? ORDER BY win_rate DESC')
        .all(heroId) as unknown as HeroSynergy[];

export const getRandomHero = (): Hero | undefined =>
    db.prepare('SELECT * FROM heroes ORDER BY RANDOM() LIMIT 1').get() as unknown as
        | Hero
        | undefined;
