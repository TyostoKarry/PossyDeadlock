import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ZodError } from 'zod';
import {
    fetchAllHeroes,
    fetchHeroCounterStats,
    fetchHeroStats,
    fetchHeroSynergyStats,
    fetchTotalMatchCountForBadge,
} from '../../src/utils/deadlockApi.js';
import { mockFetch } from '../helpers/fetch.js';

const hero = {
    id: 1,
    name: 'Infernus',
    images: { icon_hero_card: 'https://cdn.example.com/infernus.png' },
    starting_stats: { max_health: { value: 550 } },
};

describe('deadlock-api client', () => {
    it('fetches active heroes', async (t) => {
        const calls = mockFetch(t, () => Response.json([hero]));
        assert.deepEqual(await fetchAllHeroes(), [hero]);
        assert.equal(
            calls[0]?.url,
            'https://api.deadlock-api.com/v1/assets/heroes?only_active=true',
        );
    });

    it('scopes every analytics request to Phantom 1+ (badge 90)', async (t) => {
        const calls = mockFetch(t, () => Response.json([]));
        await fetchHeroStats();
        await fetchHeroCounterStats();
        await fetchHeroSynergyStats();
        await fetchTotalMatchCountForBadge();

        assert.equal(calls.length, 4);
        for (const { url } of calls) {
            assert.equal(new URL(url).searchParams.get('min_average_badge'), '90', url);
        }
    });

    it('only asks for matchups and synergies with at least 100 matches', async (t) => {
        const calls = mockFetch(t, () => Response.json([]));
        await fetchHeroCounterStats();
        await fetchHeroSynergyStats();
        for (const { url } of calls) {
            assert.equal(new URL(url).searchParams.get('min_matches'), '100', url);
        }
    });

    it('parses stats responses', async (t) => {
        const stats = [{ hero_id: 1, wins: 60, matches: 100 }];
        mockFetch(t, () => Response.json(stats));
        assert.deepEqual(await fetchHeroStats(), stats);
    });

    it('rejects responses that do not match the schema', async (t) => {
        mockFetch(t, () => Response.json([{ hero_id: 1, wins: 'sixty', matches: 100 }]));
        await assert.rejects(fetchHeroStats(), ZodError);
    });

    it('rejects error responses with the status code', async (t) => {
        mockFetch(t, () => new Response('Too many requests', { status: 429 }));
        await assert.rejects(fetchAllHeroes(), /deadlock-api 429/);
    });

    it('sets a timeout on every request and passes timeout errors on', async (t) => {
        const calls = mockFetch(t, () => {
            throw new DOMException('The operation timed out.', 'TimeoutError');
        });
        await assert.rejects(fetchAllHeroes(), { name: 'TimeoutError' });
        assert.ok(calls[0]?.init?.signal instanceof AbortSignal);
    });

    it('reads the total match count, or 0 when there are no stats', async (t) => {
        mockFetch(t, () => Response.json([{ total_matches: 12345 }]));
        assert.equal(await fetchTotalMatchCountForBadge(), 12345);

        mockFetch(t, () => Response.json([]));
        assert.equal(await fetchTotalMatchCountForBadge(), 0);
    });
});
