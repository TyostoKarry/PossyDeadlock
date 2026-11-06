// Uses a real database file instead of the shared in-memory one, so the test can open the same
// file directly. This covers file-only behavior: WAL mode and pruning backdated seen posts.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'possydeadlock-'));
const dbPath = join(dir, 'database.sqlite');
process.env.DB_PATH = dbPath;
const database = await import('../../src/db/database.js');

describe('the database file', () => {
    let direct: DatabaseSync;

    before(() => {
        direct = new DatabaseSync(dbPath);
    });

    after(() => {
        direct.close();
        rmSync(dir, { recursive: true, force: true });
    });

    it('runs in WAL mode', () => {
        assert.deepEqual(
            { ...direct.prepare('PRAGMA journal_mode').get() },
            { journal_mode: 'wal' },
        );
    });

    const backdate = (postId: string, age: string): void => {
        direct
            .prepare("UPDATE seen_posts SET seen_at = datetime('now', ?) WHERE post_id = ?")
            .run(age, postId);
    };

    it('prunes seen posts older than 30 days that are no longer in the feed', () => {
        database.markPostSeen('guild-1', 'old-gone');
        database.markPostSeen('guild-1', 'old-in-feed');
        database.markPostSeen('guild-1', 'recent');
        backdate('old-gone', '-31 days');
        backdate('old-in-feed', '-31 days');
        backdate('recent', '-29 days');

        database.pruneSeenPosts(['old-in-feed', 'something-else']);
        assert.equal(database.isPostSeen('guild-1', 'old-gone'), false);
        assert.equal(database.isPostSeen('guild-1', 'old-in-feed'), true);
        assert.equal(database.isPostSeen('guild-1', 'recent'), true);
    });

    it('prunes nothing when the feed is empty', () => {
        database.markPostSeen('guild-2', 'old');
        backdate('old', '-31 days');

        database.pruneSeenPosts([]);
        assert.equal(database.isPostSeen('guild-2', 'old'), true);
    });
});
