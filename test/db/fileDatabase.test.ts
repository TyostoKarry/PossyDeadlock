// Uses a real database file instead of the shared in-memory one, so the test can open the same
// file directly. This covers file-only behavior: WAL mode and pruning backdated seen posts.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { captureConsole } from '../helpers/console.js';
import { type SteamNewsPost, OFFICIAL_FEED } from '../../src/utils/steamApi.js';
import { mockFetch } from '../helpers/fetch.js';
import { createNewsClient } from '../helpers/newsClient.js';

const dir = mkdtempSync(join(tmpdir(), 'possydeadlock-'));
const dbPath = join(dir, 'database.sqlite');
process.env.DB_PATH = dbPath;
const database = await import('../../src/db/database.js');
const { poll } = await import('../../src/jobs/newsPoller.js');
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

    it('keeps an old post that is still in the feed when polling, so it is not posted again', async (t) => {
        captureConsole(t);
        const post = (gid: string): SteamNewsPost => ({
            gid,
            title: `Post ${gid}`,
            url: `https://store.steampowered.com/news/app/1422450/view/${gid}`,
            author: 'Yoshi',
            contents: '[p]Text[/p]',
            date: 1761998400,
            feedname: OFFICIAL_FEED,
        });
        database.setNewsChannel('guild-3', 'channel-1');
        database.markPostSeen('guild-3', 'quiet-feed');
        database.markPostSeen('guild-3', 'dropped-out');
        backdate('quiet-feed', '-60 days');
        backdate('dropped-out', '-60 days');
        mockFetch(t, (url) =>
            url.startsWith('https://api.steampowered.com/')
                ? Response.json({ appnews: { newsitems: [post('quiet-feed')] } })
                : new Response(''),
        );
        const { client, sent } = createNewsClient(['guild-3'], { 'channel-1': {} });

        await poll(client);
        assert.deepEqual(sent, []);
        assert.equal(database.isPostSeen('guild-3', 'quiet-feed'), true);
        assert.equal(database.isPostSeen('guild-3', 'dropped-out'), false);
    });
});
