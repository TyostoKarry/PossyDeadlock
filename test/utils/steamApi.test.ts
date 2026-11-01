import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchDeadlockNews, OFFICIAL_FEED } from '../../src/utils/steamApi.js';
import type { SteamNewsPost } from '../../src/utils/steamApi.js';
import { mockFetch } from '../helpers/fetch.js';

const post: SteamNewsPost = {
    gid: '1',
    title: 'Gameplay Update',
    url: 'https://store.steampowered.com/news/app/1422450/view/1',
    author: 'Yoshi',
    contents: '[p]Notes[/p]',
    date: 1761998400,
    feedname: OFFICIAL_FEED,
};

describe('fetchDeadlockNews', () => {
    it("returns the news items for Deadlock's app ID", async (t) => {
        const calls = mockFetch(t, () => Response.json({ appnews: { newsitems: [post] } }));
        assert.deepEqual(await fetchDeadlockNews(), [post]);
        assert.equal(new URL(calls[0]?.url ?? '').searchParams.get('appid'), '1422450');
    });

    it('rejects error responses with the status code', async (t) => {
        mockFetch(t, () => new Response('', { status: 503 }));
        await assert.rejects(fetchDeadlockNews(), /Steam API error: 503/);
    });
});
