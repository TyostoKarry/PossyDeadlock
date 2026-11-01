import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MessageFlags } from 'discord.js';
import heroes from '../../src/commands/heroes/index.js';
import {
    clearHeroData,
    refreshHeroCache,
    upsertHero,
    upsertHeroMatchup,
    upsertHeroSynergy,
} from '../../src/db/database.js';
import { captureConsole } from '../helpers/console.js';
import { heroRow } from '../helpers/heroes.js';
import {
    autocomplete,
    button,
    chatInput,
    componentsOf,
    embedOf,
    onlyResponse,
    payloadOf,
} from '../helpers/interactions.js';
import type { CommandResponse } from '../helpers/interactions.js';

const NAMES = [
    'Abrams',
    'Bebop',
    'Billy',
    'Calico',
    'Dynamo',
    'Grey Talon',
    'Haze',
    'Holliday',
    'Infernus',
    'Ivy',
    'Kelvin',
    'Lady Geist',
    'Lash',
    'McGinnis',
    'Mirage',
    'Mo & Krill',
    'Paradox',
    'Pocket',
    'Seven',
    'Shiv',
];

// 20 heroes, so the list has 2 pages. Win rates rise with the ID and pick rates fall.
const seedHeroes = (): void => {
    clearHeroData();
    NAMES.forEach((name, i) =>
        upsertHero(heroRow(i + 1, name, { win_rate: 0.4 + i * 0.01, pick_rate: 0.2 - i * 0.005 })),
    );
    refreshHeroCache();
};

const clearHeroes = (): void => {
    clearHeroData();
    refreshHeroCache();
};

const run = async (
    subcommand: string,
    strings: Record<string, string> = {},
    userId = 'user-1',
): Promise<CommandResponse> => {
    const { interaction, responses } = chatInput({
        commandName: 'heroes',
        subcommand,
        strings,
        userId,
    });
    await heroes.execute(interaction);
    return onlyResponse(responses);
};

const clickButton = async (customId: string, userId = 'user-1'): Promise<CommandResponse> => {
    const { interaction, responses } = button({ customId, userId });
    await heroes.handleButton(interaction);
    return onlyResponse(responses);
};

// The hero names in a /heroes list embed, top to bottom.
const listedNames = (response: CommandResponse): string[] =>
    [...(embedOf(response).description ?? '').matchAll(/^`(.+?) *` —/gm)].map(
        ([, name]) => name ?? '',
    );

const buttonsOf = (response: CommandResponse): Record<string, unknown>[][] =>
    componentsOf(response).map((row) => row.components);

const NO_DATA = 'No hero data available. Please try again later.';

describe('/heroes list', () => {
    beforeEach(seedHeroes);

    it('lists the first 15 heroes by name', async (t) => {
        captureConsole(t);
        const response = await run('list');
        assert.equal(response.method, 'reply');
        assert.deepEqual(listedNames(response), NAMES.slice(0, 15));
        assert.match(embedOf(response).description ?? '', /Sorted by Name \(ascending\)/);
        assert.equal(payloadOf(response).flags, MessageFlags.Ephemeral);
    });

    it('shows win and pick rates as percentages, or N/A', async (t) => {
        captureConsole(t);
        upsertHero(heroRow(1, 'Abrams', { win_rate: 0.5234, pick_rate: null }));
        refreshHeroCache();
        const description = embedOf(await run('list')).description ?? '';
        assert.match(description, /`Abrams +` — 52\.3% · N\/A/);
    });

    it('sorts by win rate or pick rate, highest first', async (t) => {
        captureConsole(t);
        const byWinRate = await run('list', { sort: 'win_rate' });
        assert.equal(listedNames(byWinRate)[0], 'Shiv');
        assert.match(embedOf(byWinRate).description ?? '', /Sorted by Win Rate \(descending\)/);

        const byPickRate = await run('list', { sort: 'pick_rate' });
        assert.equal(listedNames(byPickRate)[0], 'Abrams');
    });

    it('can be posted publicly', async (t) => {
        captureConsole(t);
        const response = await run('list', { visibility: 'public' });
        assert.equal(payloadOf(response).flags, undefined);
    });

    it('adds sort buttons and page buttons', async (t) => {
        captureConsole(t);
        const [sortRow, pageRow] = buttonsOf(await run('list'));
        assert.deepEqual(
            sortRow?.map(({ custom_id, label }) => [custom_id, label]),
            [
                ['heroes:list:name:desc:0', 'Name ▲'], // active: clicking reverses it
                ['heroes:list:win_rate:desc:0', 'Win Rate'],
                ['heroes:list:pick_rate:desc:0', 'Pick Rate'],
            ],
        );
        assert.deepEqual(
            pageRow?.map(({ custom_id, label, disabled }) => [custom_id, label, disabled]),
            [
                ['heroes:list:name:asc:-1', '◀', true],
                ['heroes:list:page', 'Page 1/2', true],
                ['heroes:list:name:asc:1', '▶', false],
            ],
        );
    });

    it('says when there is no hero data', async (t) => {
        captureConsole(t);
        clearHeroes();
        const response = await run('list', { visibility: 'public' });
        assert.equal(payloadOf(response).content, NO_DATA);
        assert.equal(payloadOf(response).flags, MessageFlags.Ephemeral);
    });
});

describe('/heroes list buttons', () => {
    beforeEach(seedHeroes);

    it('show the requested page', async () => {
        const response = await clickButton('heroes:list:name:asc:1');
        assert.equal(response.method, 'update');
        assert.deepEqual(listedNames(response), NAMES.slice(15));
        const [, pageRow] = buttonsOf(response);
        assert.deepEqual(
            pageRow?.map(({ label, disabled }) => [label, disabled]),
            [
                ['◀', false],
                ['Page 2/2', true],
                ['▶', true],
            ],
        );
    });

    it('change the sort and direction', async () => {
        const response = await clickButton('heroes:list:name:desc:0');
        assert.equal(listedNames(response)[0], 'Shiv');
        const [sortRow] = buttonsOf(response);
        assert.equal(sortRow?.[0]?.label, 'Name ▼');
        assert.equal(sortRow?.[0]?.custom_id, 'heroes:list:name:asc:0');
    });

    it('keep the page within range', async () => {
        assert.deepEqual(
            listedNames(await clickButton('heroes:list:name:asc:99')),
            NAMES.slice(15),
        );
        assert.deepEqual(
            listedNames(await clickButton('heroes:list:name:asc:-3')),
            NAMES.slice(0, 15),
        );
        assert.deepEqual(
            listedNames(await clickButton('heroes:list:name:asc:abc')),
            NAMES.slice(0, 15),
        );
    });
});

describe('/heroes stats', () => {
    beforeEach(() => {
        seedHeroes();
        upsertHero(
            heroRow(9, 'Infernus', {
                hero_type: 'marksman',
                complexity: 2,
                base_hp: 550,
                hp_per_boon: 35,
                win_rate: 0.5234,
                pick_rate: 0.1,
                matches: 123456,
            }),
        );
        [2, 3, 4, 5].forEach((enemy, i) => upsertHeroMatchup(9, enemy, 0.6 - i * 0.05, 500));
        refreshHeroCache();
    });

    it('shows the hero by name, regardless of case', async (t) => {
        captureConsole(t);
        const embed = embedOf(await run('stats', { hero: 'infernus' }));
        assert.equal(embed.title, 'Infernus');
        assert.equal(embed.description, 'Marksman • ●●○○');
        assert.equal(embed.thumbnail?.url, 'https://cdn.example.com/9.png');
    });

    it('shows base stats and performance', async (t) => {
        captureConsole(t);
        const fields = embedOf(await run('stats', { hero: 'Infernus' })).fields ?? [];
        assert.equal(
            fields[0]?.value,
            'HP: 550 (+35/boon)\nMove Speed: 6.8m/s\nSprint Speed: 2m/s\nStamina: 3',
        );
        assert.equal(
            fields[1]?.value,
            'Win Rate: 52.3% • Pick Rate: 10.0%\nMatches: 123,456\n_Data from Phantom 1+ ranked matches_',
        );
    });

    it('shows the best and worst 3 matchups', async (t) => {
        captureConsole(t);
        const fields = embedOf(await run('stats', { hero: 'Infernus' })).fields ?? [];
        assert.equal(fields[2]?.name, 'Best Against');
        assert.equal(fields[2]?.value, 'Bebop — 60.0%\nBilly — 55.0%\nCalico — 50.0%');
        assert.equal(fields[3]?.name, 'Worst Against');
        assert.equal(fields[3]?.value, 'Dynamo — 45.0%\nCalico — 50.0%\nBilly — 55.0%');
    });

    it('shows N/A for missing stats and leaves out empty sections', async (t) => {
        captureConsole(t);
        upsertHero(
            heroRow(30, 'Vindicta', {
                hero_type: null,
                complexity: null,
                base_hp: null,
                move_speed: null,
                sprint_speed: null,
                stamina: null,
                win_rate: null,
                pick_rate: null,
                matches: null,
            }),
        );
        refreshHeroCache();
        const embed = embedOf(await run('stats', { hero: 'Vindicta' }));
        assert.equal(embed.description, undefined);
        assert.equal(
            embed.fields?.[0]?.value,
            'HP: N/A\nMove Speed: N/A\nSprint Speed: N/A\nStamina: N/A',
        );
        assert.match(
            embed.fields?.[1]?.value ?? '',
            /Win Rate: N\/A • Pick Rate: N\/A\nMatches: N\/A/,
        );
        assert.equal(embed.fields?.length, 2);
    });

    it('follows the visibility option', async (t) => {
        captureConsole(t);
        assert.equal(
            payloadOf(await run('stats', { hero: 'Infernus' })).flags,
            MessageFlags.Ephemeral,
        );
        assert.equal(
            payloadOf(await run('stats', { hero: 'Infernus', visibility: 'public' })).flags,
            undefined,
        );
    });

    it('says when the hero is not found', async () => {
        const response = await run('stats', { hero: 'Nobody', visibility: 'public' });
        assert.equal(
            payloadOf(response).content,
            'Hero **Nobody** not found. Try using the autocomplete suggestions.',
        );
        assert.equal(payloadOf(response).flags, MessageFlags.Ephemeral);
    });
});

describe('/heroes matchup', () => {
    beforeEach(() => {
        seedHeroes();
        for (let enemy = 2; enemy <= 8; enemy++) {
            upsertHeroMatchup(1, enemy, 0.6 - enemy * 0.01, 1000 * enemy);
            upsertHeroSynergy(1, enemy, 0.55 - enemy * 0.01, 100 * enemy);
        }
        upsertHeroMatchup(1, 999, 0.1, 5); // a hero that no longer exists
        refreshHeroCache();
    });

    it('shows the best and worst 5 synergies and matchups', async (t) => {
        captureConsole(t);
        const fields = embedOf(await run('matchup', { hero: 'Abrams' })).fields ?? [];
        assert.deepEqual(
            fields.map(({ name }) => name),
            ['Best With', '​', 'Worst With', 'Best Against', '​', 'Worst Against'],
        );
        assert.equal(fields[0]?.value.split('\n')[0], 'Bebop — **53.0%** (200)');
        assert.equal(fields[0]?.value.split('\n').length, 5);
        assert.equal(fields[3]?.value.split('\n')[0], 'Bebop — **58.0%** (2,000)');
    });

    it('shows Unknown for heroes that no longer exist', async (t) => {
        captureConsole(t);
        const fields = embedOf(await run('matchup', { hero: 'Abrams' })).fields ?? [];
        assert.equal(fields[5]?.value.split('\n')[0], 'Unknown — **10.0%** (5)');
    });

    it('says when there is no matchup data yet', async (t) => {
        captureConsole(t);
        const embed = embedOf(await run('matchup', { hero: 'Shiv' }));
        assert.equal(embed.description, 'No matchup data available yet.');
        assert.equal(embed.fields, undefined);
    });

    it('says when the hero is not found', async () => {
        const response = await run('matchup', { hero: 'Nobody' });
        assert.match(payloadOf(response).content ?? '', /Hero \*\*Nobody\*\* not found/);
        assert.equal(payloadOf(response).flags, MessageFlags.Ephemeral);
    });
});

describe('/heroes random', () => {
    beforeEach(seedHeroes);

    it('shows a random hero with a re-roll button for the user who ran it', async (t) => {
        captureConsole(t);
        t.mock.method(Math, 'random', () => 0);
        const response = await run('random', {}, 'user-42');
        const embed = embedOf(response);
        assert.equal(embed.title, 'Abrams');
        assert.deepEqual(
            embed.fields?.map(({ name, value }) => [name, value]),
            [
                ['Win Rate', '40.0%'],
                ['Pick Rate', '20.0%'],
            ],
        );
        assert.equal(buttonsOf(response)[0]?.[0]?.custom_id, 'heroes:reroll:user-42');
        assert.equal(payloadOf(response).flags, MessageFlags.Ephemeral);
    });

    it('lets the same user re-roll', async (t) => {
        t.mock.method(Math, 'random', () => 0.99);
        const response = await clickButton('heroes:reroll:user-42', 'user-42');
        assert.equal(response.method, 'update');
        assert.equal(embedOf(response).title, 'Shiv');
        assert.equal(buttonsOf(response)[0]?.[0]?.custom_id, 'heroes:reroll:user-42');
    });

    it('stops other users from re-rolling', async () => {
        const response = await clickButton('heroes:reroll:user-42', 'someone-else');
        assert.equal(response.method, 'reply');
        assert.equal(
            payloadOf(response).content,
            'Only the person who ran this command can re-roll.',
        );
        assert.equal(payloadOf(response).flags, MessageFlags.Ephemeral);
    });

    it('says when there is no hero data', async () => {
        clearHeroes();
        assert.equal(payloadOf(await run('random')).content, NO_DATA);
        assert.equal(payloadOf(await clickButton('heroes:reroll:user-1')).content, NO_DATA);
    });
});

describe('/heroes autocomplete', () => {
    beforeEach(seedHeroes);

    const suggest = async (focused: string): Promise<unknown> => {
        const { interaction, responses } = autocomplete({ commandName: 'heroes', focused });
        await heroes.autocomplete(interaction);
        const response = onlyResponse(responses);
        assert.equal(response.method, 'respond');
        return response.payload;
    };

    it('suggests heroes whose name contains the text, ignoring case', async () => {
        assert.deepEqual(await suggest('LA'), [
            { name: 'Lady Geist', value: 'Lady Geist' },
            { name: 'Lash', value: 'Lash' },
        ]);
    });

    it('suggests at most 25 heroes', async () => {
        for (let id = 21; id <= 40; id++) upsertHero(heroRow(id, `Extra Hero ${id}`));
        refreshHeroCache();
        assert.equal(((await suggest('')) as unknown[]).length, 25);
    });
});
