import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { createApiCache } from '../../src/utils/apiCache.js';

describe('createApiCache', () => {
    it('returns the cached value instead of fetching again', async () => {
        const cache = createApiCache<number, string>({ ttlMs: 60_000, max: 10 });
        let fetches = 0;
        const fetchValue = async (): Promise<string> => `value ${++fetches}`;

        assert.equal(await cache.get(1, fetchValue), 'value 1');
        assert.equal(await cache.get(1, fetchValue), 'value 1');
        assert.equal(fetches, 1);
    });

    it('caches each key separately', async () => {
        const cache = createApiCache<string, string>({ ttlMs: 60_000, max: 10 });
        assert.equal(await cache.get('a', async () => 'A'), 'A');
        assert.equal(await cache.get('b', async () => 'B'), 'B');
    });

    it('shares one request between concurrent calls', async () => {
        const cache = createApiCache<number, string>({ ttlMs: 60_000, max: 10 });
        let fetches = 0;
        const fetchValue = async (): Promise<string> => {
            fetches++;
            await sleep(10);
            return 'value';
        };

        const results = await Promise.all([cache.get(1, fetchValue), cache.get(1, fetchValue)]);
        assert.deepEqual(results, ['value', 'value']);
        assert.equal(fetches, 1);
    });

    it('does not cache failed requests', async () => {
        const cache = createApiCache<number, string>({ ttlMs: 60_000, max: 10 });

        await assert.rejects(
            cache.get(1, async () => {
                throw new Error('API down');
            }),
            /API down/,
        );
        assert.equal(await cache.get(1, async () => 'recovered'), 'recovered');
    });

    it('fetches again after the entry expires', async () => {
        const cache = createApiCache<number, string>({ ttlMs: 20, max: 10 });
        await cache.get(1, async () => 'old');
        await sleep(60);
        assert.equal(await cache.get(1, async () => 'new'), 'new');
    });

    it('evicts the least recently used entry past the size limit', async () => {
        const cache = createApiCache<number, string>({ ttlMs: 60_000, max: 2 });
        await cache.get(1, async () => 'one');
        await cache.get(2, async () => 'two');
        await cache.get(1, async () => 'one again'); // 1 is now the most recently used
        await cache.get(3, async () => 'three'); // evicts 2

        assert.equal(await cache.get(1, async () => 'refetched'), 'one');
        assert.equal(await cache.get(2, async () => 'refetched'), 'refetched');
    });
});
