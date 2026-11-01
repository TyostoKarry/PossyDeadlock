import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from '../../src/db/database.js';
import { migrations } from '../../src/db/migrations/index.js';
import { captureConsole } from '../helpers/console.js';

const userVersion = (db: DatabaseSync): number =>
    (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;

const tableNames = (db: DatabaseSync): string[] =>
    (
        db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as {
            name: string;
        }[]
    ).map(({ name }) => name);

const columnNames = (db: DatabaseSync, table: string): string[] =>
    (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(({ name }) => name);

describe('migrations', () => {
    it('build the full schema on a new database', (t) => {
        captureConsole(t);
        const db = new DatabaseSync(':memory:');
        runMigrations(db, migrations);

        assert.equal(userVersion(db), migrations.length);
        assert.deepEqual(tableNames(db), [
            'config',
            'hero_matchups',
            'hero_synergies',
            'heroes',
            'seen_posts',
            'steam_links',
        ]);
        assert.ok(columnNames(db, 'heroes').includes('hero_type'));
        assert.ok(columnNames(db, 'heroes').includes('complexity'));
        assert.deepEqual(columnNames(db, 'seen_posts'), ['guild_id', 'post_id', 'seen_at']);
    });

    it('log each migration as it is applied', (t) => {
        const output = captureConsole(t);
        runMigrations(new DatabaseSync(':memory:'), migrations);
        assert.equal(output.log.length, migrations.length);
        assert.match(output.log[0] ?? '', /DB: applied migration 1$/);
    });

    it('do nothing on a database that is up to date', (t) => {
        const output = captureConsole(t);
        const db = new DatabaseSync(':memory:');
        runMigrations(db, migrations);
        output.log.length = 0;

        runMigrations(db, migrations);
        assert.equal(userVersion(db), migrations.length);
        assert.deepEqual(output.log, []);
    });

    it('only apply the migrations a database has not run yet', (t) => {
        captureConsole(t);
        const db = new DatabaseSync(':memory:');
        runMigrations(db, migrations.slice(0, 3));
        assert.equal(userVersion(db), 3);
        assert.ok(!tableNames(db).includes('steam_links'));

        runMigrations(db, migrations);
        assert.equal(userVersion(db), migrations.length);
        assert.ok(tableNames(db).includes('steam_links'));
    });

    it('carry seen posts over to every configured server in migration 4', (t) => {
        captureConsole(t);
        const db = new DatabaseSync(':memory:');
        runMigrations(db, migrations.slice(0, 3));
        db.exec(`
            INSERT INTO config (guild_id, channel_id) VALUES ('guild-a', 'c1'), ('guild-b', 'c2');
            INSERT INTO seen_posts (post_id, seen_at) VALUES ('post-1', '2026-10-01 10:00:00');
        `);

        runMigrations(db, migrations.slice(0, 4));
        assert.deepEqual(
            db
                .prepare('SELECT guild_id, post_id, seen_at FROM seen_posts ORDER BY guild_id')
                .all()
                .map((row) => ({ ...row })),
            [
                { guild_id: 'guild-a', post_id: 'post-1', seen_at: '2026-10-01 10:00:00' },
                { guild_id: 'guild-b', post_id: 'post-1', seen_at: '2026-10-01 10:00:00' },
            ],
        );
    });

    it('roll back a failed migration and keep the previous version', (t) => {
        const output = captureConsole(t);
        const db = new DatabaseSync(':memory:');
        const broken = [
            'CREATE TABLE first (id INTEGER)',
            'CREATE TABLE second (id INTEGER); INSERT INTO missing_table VALUES (1);',
            'CREATE TABLE third (id INTEGER)',
        ];

        assert.throws(() => runMigrations(db, broken), /no such table: missing_table/);
        assert.equal(userVersion(db), 1);
        assert.deepEqual(tableNames(db), ['first']); // 'second' was rolled back, 'third' never ran
        assert.match(output.error[0] ?? '', /migration 2 failed, rolled back to version 1/);
    });
});
