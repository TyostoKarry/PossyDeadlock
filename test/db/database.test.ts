import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
    addSteamLink,
    backupDatabase,
    backupFilePrefix,
    clearHeroData,
    clearNewsChannel,
    deleteSteamLink,
    getAllHeroes,
    getHeroById,
    getHeroByName,
    getHeroMatchups,
    getHeroSynergies,
    getLinkedDiscordUserIds,
    getNewsChannel,
    getNewsMode,
    getPingRole,
    getRandomHero,
    getSteamLink,
    isPostSeen,
    markPostSeen,
    refreshHeroCache,
    runInTransaction,
    setNewsChannel,
    setNewsMode,
    setPingRole,
    upsertHero,
    upsertHeroMatchup,
    upsertHeroSynergy,
} from '../../src/db/database.js';
import { migrations } from '../../src/db/migrations/index.js';
import { parseBackupDate } from '../../src/utils/backupRetention.js';
import type { Hero } from '../../src/types/heroes.js';

const hero = (
    id: number,
    name: string,
    overrides: Partial<Hero> = {},
): Omit<Hero, 'updated_at'> => ({
    id,
    name,
    image_url: `https://cdn.example.com/${id}.png`,
    hero_type: 'marksman',
    complexity: 1,
    base_hp: 550,
    hp_per_boon: 30,
    move_speed: 6.8,
    stamina: 3,
    sprint_speed: 2,
    win_rate: 0.5,
    pick_rate: 0.1,
    matches: 1000,
    ...overrides,
});

const openBackup = (path: string): DatabaseSync => new DatabaseSync(path, { readOnly: true });

describe('news settings', () => {
    it('have no channel, the official mode and no ping role by default', () => {
        assert.equal(getNewsChannel('guild-new'), null);
        assert.equal(getNewsMode('guild-new'), 'official');
        assert.equal(getPingRole('guild-new'), null);
    });

    it('store and replace the news channel', () => {
        setNewsChannel('guild-1', 'channel-1');
        assert.equal(getNewsChannel('guild-1'), 'channel-1');
        setNewsChannel('guild-1', 'channel-2');
        assert.equal(getNewsChannel('guild-1'), 'channel-2');
    });

    it('keep the mode and ping role when the channel is cleared', () => {
        setNewsChannel('guild-2', 'channel-1');
        setNewsMode('guild-2', 'all');
        setPingRole('guild-2', 'role-1');

        clearNewsChannel('guild-2');
        assert.equal(getNewsChannel('guild-2'), null);
        assert.equal(getNewsMode('guild-2'), 'all');
        assert.equal(getPingRole('guild-2'), 'role-1');
    });

    it('clear the ping role', () => {
        setNewsChannel('guild-3', 'channel-1');
        setPingRole('guild-3', 'role-1');
        setPingRole('guild-3', null);
        assert.equal(getPingRole('guild-3'), null);
    });

    it('keep each server separate', () => {
        setNewsChannel('guild-4', 'channel-4');
        setNewsChannel('guild-5', 'channel-5');
        setNewsMode('guild-4', 'all');
        assert.equal(getNewsChannel('guild-5'), 'channel-5');
        assert.equal(getNewsMode('guild-5'), 'official');
    });
});

describe('seen posts', () => {
    it('are tracked per server', () => {
        markPostSeen('guild-a', 'post-1');
        assert.equal(isPostSeen('guild-a', 'post-1'), true);
        assert.equal(isPostSeen('guild-b', 'post-1'), false);
        assert.equal(isPostSeen('guild-a', 'post-2'), false);
    });

    it('can be marked more than once', () => {
        markPostSeen('guild-c', 'post-1');
        assert.doesNotThrow(() => markPostSeen('guild-c', 'post-1'));
        assert.equal(isPostSeen('guild-c', 'post-1'), true);
    });
});

describe('Steam links', () => {
    it('are empty for a user who has not linked', () => {
        assert.equal(getSteamLink('user-unlinked'), null);
    });

    it('store the linked account', () => {
        addSteamLink('user-1', 22202);
        assert.equal(getSteamLink('user-1'), 22202);
    });

    it('allow only one account per user', () => {
        addSteamLink('user-2', 1);
        assert.throws(() => addSteamLink('user-2', 2), /UNIQUE constraint failed/);
        assert.equal(getSteamLink('user-2'), 1);
    });

    it('allow the same account to be linked by several users', () => {
        addSteamLink('user-3', 999);
        assert.doesNotThrow(() => addSteamLink('user-4', 999));
    });

    it('report whether an unlink removed anything', () => {
        addSteamLink('user-5', 5);
        assert.equal(deleteSteamLink('user-5'), true);
        assert.equal(getSteamLink('user-5'), null);
        assert.equal(deleteSteamLink('user-5'), false);
    });

    it('list every linked user', () => {
        addSteamLink('user-6', 6);
        const linked = getLinkedDiscordUserIds();
        assert.ok(linked.includes('user-6'));
        assert.ok(!linked.includes('user-5'));
    });
});

describe('hero data', () => {
    beforeEach(() => {
        clearHeroData();
        refreshHeroCache();
    });

    it('is served from the cache, which only changes on refresh', () => {
        upsertHero(hero(1, 'Infernus'));
        assert.deepEqual(getAllHeroes(), []);

        refreshHeroCache();
        assert.equal(getAllHeroes().length, 1);
    });

    it('lists heroes by name', () => {
        upsertHero(hero(1, 'Seven'));
        upsertHero(hero(2, 'Abrams'));
        upsertHero(hero(3, 'Lash'));
        refreshHeroCache();
        assert.deepEqual(
            getAllHeroes().map(({ name }) => name),
            ['Abrams', 'Lash', 'Seven'],
        );
    });

    it('looks heroes up by ID and by name regardless of case', () => {
        upsertHero(hero(7, 'Grey Talon'));
        refreshHeroCache();
        assert.equal(getHeroById(7)?.name, 'Grey Talon');
        assert.equal(getHeroByName('grey talon')?.id, 7);
        assert.equal(getHeroByName('GREY TALON')?.id, 7);
        assert.equal(getHeroById(8), undefined);
        assert.equal(getHeroByName('Grey'), undefined);
    });

    it('updates an existing hero instead of adding a second one', () => {
        upsertHero(hero(1, 'Infernus', { win_rate: 0.5 }));
        upsertHero(hero(1, 'Infernus', { win_rate: 0.55, hero_type: null }));
        refreshHeroCache();
        assert.equal(getAllHeroes().length, 1);
        assert.equal(getHeroById(1)?.win_rate, 0.55);
        assert.equal(getHeroById(1)?.hero_type, null);
    });

    it('groups matchups and synergies by hero, best win rate first', () => {
        upsertHero(hero(1, 'Infernus'));
        upsertHeroMatchup(1, 2, 0.45, 500);
        upsertHeroMatchup(1, 3, 0.6, 400);
        upsertHeroMatchup(2, 1, 0.55, 500);
        upsertHeroSynergy(1, 3, 0.52, 300);
        upsertHeroSynergy(1, 2, 0.58, 200);
        upsertHeroMatchup(1, 2, 0.47, 600); // replaces the first 1 vs 2 row
        refreshHeroCache();

        assert.deepEqual(
            getHeroMatchups(1).map((row) => ({ ...row })),
            [
                { hero_id: 1, enemy_id: 3, win_rate: 0.6, matches: 400 },
                { hero_id: 1, enemy_id: 2, win_rate: 0.47, matches: 600 },
            ],
        );
        assert.deepEqual(
            getHeroSynergies(1).map(({ ally_id }) => ally_id),
            [2, 3],
        );
        assert.equal(getHeroMatchups(2).length, 1);
        assert.deepEqual(getHeroMatchups(99), []);
        assert.deepEqual(getHeroSynergies(99), []);
    });

    it('clears heroes, matchups and synergies together', () => {
        upsertHero(hero(1, 'Infernus'));
        upsertHeroMatchup(1, 2, 0.5, 100);
        upsertHeroSynergy(1, 2, 0.5, 100);
        clearHeroData();
        refreshHeroCache();
        assert.deepEqual(getAllHeroes(), []);
        assert.deepEqual(getHeroMatchups(1), []);
        assert.deepEqual(getHeroSynergies(1), []);
    });

    it('picks a random hero, or none when there are no heroes', (t) => {
        assert.equal(getRandomHero(), undefined);

        upsertHero(hero(1, 'Abrams'));
        upsertHero(hero(2, 'Bebop'));
        refreshHeroCache();
        t.mock.method(Math, 'random', () => 0.99);
        assert.equal(getRandomHero()?.name, 'Bebop');
        t.mock.method(Math, 'random', () => 0);
        assert.equal(getRandomHero()?.name, 'Abrams');
    });
});

describe('runInTransaction', () => {
    beforeEach(() => {
        clearHeroData();
        refreshHeroCache();
    });

    it('commits and returns the result', () => {
        const result = runInTransaction(() => {
            upsertHero(hero(1, 'Infernus'));
            return 'done';
        });
        refreshHeroCache();
        assert.equal(result, 'done');
        assert.equal(getAllHeroes().length, 1);
    });

    it('rolls everything back when the function throws', () => {
        upsertHero(hero(1, 'Infernus'));
        assert.throws(
            () =>
                runInTransaction(() => {
                    clearHeroData();
                    upsertHero(hero(2, 'Seven'));
                    throw new Error('refresh failed');
                }),
            /refresh failed/,
        );
        refreshHeroCache();
        assert.deepEqual(
            getAllHeroes().map(({ name }) => name),
            ['Infernus'],
        );
    });
});

describe('backupDatabase', () => {
    it('writes a copy without the daily-rebuilt tables', (t) => {
        const dir = mkdtempSync(join(tmpdir(), 'possydeadlock-'));
        t.after(() => rmSync(dir, { recursive: true, force: true }));

        clearHeroData();
        upsertHero(hero(1, 'Infernus'));
        upsertHeroMatchup(1, 2, 0.5, 100);
        upsertHeroSynergy(1, 2, 0.5, 100);
        addSteamLink('user-backup', 42);
        setNewsChannel('guild-backup', 'channel-1');
        markPostSeen('guild-backup', 'post-1');

        const backupPath = backupDatabase(join(dir, 'automatic'));
        const filename = readdirSync(join(dir, 'automatic'))[0] ?? '';
        assert.equal(backupPath, join(dir, 'automatic', filename));
        assert.ok(filename.startsWith(backupFilePrefix));
        assert.ok(parseBackupDate(filename));

        const backup = openBackup(backupPath);
        t.after(() => backup.close());
        const count = (table: string): number =>
            (backup.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;

        assert.equal(count('heroes'), 0);
        assert.equal(count('hero_matchups'), 0);
        assert.equal(count('hero_synergies'), 0);
        assert.ok(count('steam_links') > 0);
        assert.ok(count('config') > 0);
        assert.ok(count('seen_posts') > 0);
        assert.equal(
            (backup.prepare('PRAGMA user_version').get() as { user_version: number }).user_version,
            migrations.length,
        );

        // The live database is left as it was.
        refreshHeroCache();
        assert.equal(getAllHeroes().length, 1);
        assert.equal(getSteamLink('user-backup'), 42);
        assert.equal(getNewsChannel('guild-backup'), 'channel-1');
        assert.equal(isPostSeen('guild-backup', 'post-1'), true);
    });
});
