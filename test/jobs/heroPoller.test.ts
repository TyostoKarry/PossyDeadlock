import { beforeEach, describe, it } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import cron from 'node-cron';
import {
    clearHeroData,
    getAllHeroes,
    getHeroById,
    getHeroMatchups,
    getHeroSynergies,
    refreshHeroCache,
    upsertHero,
} from '../../src/db/database.js';
import { poll, startHeroPoller } from '../../src/jobs/heroPoller.js';
import { captureConsole } from '../helpers/console.js';
import { mockFetch } from '../helpers/fetch.js';

const apiHeroes = [
    {
        id: 1,
        name: 'Infernus',
        images: { icon_hero_card: 'https://cdn.example.com/infernus.png' },
        hero_type: 'marksman',
        complexity: 1,
        starting_stats: {
            max_health: { value: 550 },
            max_move_speed: { value: 6.8 },
            sprint_speed: { value: 2 },
            stamina: { value: 3 },
        },
        standard_level_up_upgrades: { MODIFIER_VALUE_BASE_HEALTH_FROM_LEVEL: 35 },
    },
    {
        id: 2,
        name: 'Seven',
        images: { icon_hero_card: 'https://cdn.example.com/seven.png' },
        starting_stats: {},
    },
];

interface ApiData {
    heroes: unknown[];
    stats: unknown[];
    counters: unknown[];
    synergies: unknown[];
    totalMatches: number;
}

const defaultData = (): ApiData => ({
    heroes: apiHeroes,
    stats: [{ hero_id: 1, wins: 600, matches: 1000 }],
    counters: [{ hero_id: 1, enemy_hero_id: 2, wins: 55, matches_played: 100 }],
    synergies: [{ hero_id1: 1, hero_id2: 2, wins: 60, matches_played: 120 }],
    totalMatches: 10_000,
});

// Answers each deadlock-api endpoint the poller calls.
const mockApi = (t: TestContext, data: ApiData = defaultData()): void => {
    mockFetch(t, (url) => {
        const { pathname } = new URL(url);
        if (pathname === '/v1/assets/heroes') return Response.json(data.heroes);
        if (pathname === '/v1/analytics/hero-stats') return Response.json(data.stats);
        if (pathname === '/v1/analytics/hero-counter-stats') return Response.json(data.counters);
        if (pathname === '/v1/analytics/hero-synergy-stats') return Response.json(data.synergies);
        if (pathname === '/v1/analytics/game-stats') {
            return Response.json([{ total_matches: data.totalMatches }]);
        }
        return new Response('Not found', { status: 404 });
    });
};

const existingHero = {
    id: 99,
    name: 'Removed Hero',
    image_url: null,
    hero_type: null,
    complexity: null,
    base_hp: null,
    hp_per_boon: null,
    move_speed: null,
    stamina: null,
    sprint_speed: null,
    win_rate: 0.5,
    pick_rate: 0.1,
    matches: 100,
};

describe('hero poller', () => {
    beforeEach(() => {
        clearHeroData();
        upsertHero(existingHero);
        refreshHeroCache();
    });

    it('stores heroes with their stats', async (t) => {
        captureConsole(t);
        mockApi(t);
        await poll();

        const infernus = getHeroById(1);
        assert.ok(infernus);
        assert.equal(infernus.name, 'Infernus');
        assert.equal(infernus.image_url, 'https://cdn.example.com/infernus.png');
        assert.equal(infernus.hero_type, 'marksman');
        assert.equal(infernus.complexity, 1);
        assert.equal(infernus.base_hp, 550);
        assert.equal(infernus.hp_per_boon, 35);
        assert.equal(infernus.move_speed, 6.8);
        assert.equal(infernus.sprint_speed, 2);
        assert.equal(infernus.stamina, 3);
        assert.equal(infernus.win_rate, 0.6);
        assert.equal(infernus.pick_rate, 0.1); // 1000 of 10,000 Phantom 1+ matches
        assert.equal(infernus.matches, 1000);
    });

    it('stores missing stats as null', async (t) => {
        captureConsole(t);
        mockApi(t);
        await poll();

        const seven = getHeroById(2);
        assert.ok(seven);
        assert.equal(seven.base_hp, null);
        assert.equal(seven.hero_type, null);
        assert.equal(seven.win_rate, null);
        assert.equal(seven.pick_rate, null);
        assert.equal(seven.matches, null);
    });

    it('leaves the pick rate empty when the total match count is 0', async (t) => {
        captureConsole(t);
        mockApi(t, { ...defaultData(), totalMatches: 0 });
        await poll();
        assert.equal(getHeroById(1)?.pick_rate, null);
        assert.equal(getHeroById(1)?.win_rate, 0.6);
    });

    it('stores matchups one way and synergies both ways', async (t) => {
        captureConsole(t);
        mockApi(t);
        await poll();

        assert.deepEqual(
            getHeroMatchups(1).map((row) => ({ ...row })),
            [{ hero_id: 1, enemy_id: 2, win_rate: 0.55, matches: 100 }],
        );
        assert.deepEqual(getHeroMatchups(2), []);
        assert.deepEqual(
            [...getHeroSynergies(1), ...getHeroSynergies(2)].map((row) => ({ ...row })),
            [
                { hero_id: 1, ally_id: 2, win_rate: 0.5, matches: 120 },
                { hero_id: 2, ally_id: 1, win_rate: 0.5, matches: 120 },
            ],
        );
    });

    it('replaces the old data, removing heroes the API no longer returns', async (t) => {
        captureConsole(t);
        mockApi(t);
        await poll();
        assert.deepEqual(
            getAllHeroes().map(({ name }) => name),
            ['Infernus', 'Seven'],
        );
    });

    it('logs a summary of the refresh', async (t) => {
        const output = captureConsole(t);
        mockApi(t);
        await poll();
        assert.match(
            output.log[output.log.length - 1] ?? '',
            /updated 2 heroes, 1 counter pairs, 1 synergy pairs$/,
        );
    });

    for (const field of ['heroes', 'stats', 'counters', 'synergies'] as const) {
        it(`keeps the existing data when the API returns no ${field}`, async (t) => {
            const output = captureConsole(t);
            mockApi(t, { ...defaultData(), [field]: [] });
            await poll();

            assert.deepEqual(
                getAllHeroes().map(({ name }) => name),
                ['Removed Hero'],
            );
            assert.match(output.warn[0] ?? '', /empty list, keeping existing data/);
        });
    }

    it('keeps the existing data and logs when a request fails', async (t) => {
        const output = captureConsole(t);
        mockFetch(t, () => new Response('Service unavailable', { status: 503 }));
        await assert.doesNotReject(poll());

        assert.deepEqual(
            getAllHeroes().map(({ name }) => name),
            ['Removed Hero'],
        );
        assert.match(output.error[0] ?? '', /Hero poller failed/);
        assert.match(output.error[1] ?? '', /deadlock-api 503/);
    });

    it('runs on startup and then daily at 06:00', async (t) => {
        captureConsole(t);
        mockApi(t);
        const schedule = t.mock.method(cron, 'schedule', () => undefined);

        startHeroPoller();
        assert.equal(schedule.mock.callCount(), 1);
        assert.equal(schedule.mock.calls[0]?.arguments[0], '0 6 * * *');

        await waitFor(() => getHeroById(1) !== undefined);
    });
});

// Waits for the startup run, which startHeroPoller doesn't await.
const waitFor = async (condition: () => boolean): Promise<void> => {
    for (let i = 0; i < 100 && !condition(); i++) {
        await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.ok(condition(), 'condition was not met in time');
};
