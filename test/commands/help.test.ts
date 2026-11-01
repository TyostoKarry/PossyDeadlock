import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MessageFlags } from 'discord.js';
import help from '../../src/commands/help/index.js';
import { VERSION } from '../../src/utils/version.js';
import { captureConsole } from '../helpers/console.js';
import {
    chatInput,
    componentsOf,
    embedOf,
    onlyResponse,
    payloadOf,
    selectMenu,
} from '../helpers/interactions.js';
import type { CommandResponse } from '../helpers/interactions.js';

const TITLES: Record<string, string> = {
    general: 'PossyDeadlock Help',
    'deadlock-api': 'About deadlock-api.com',
    heroes: '/heroes Commands',
    news: '/news Commands',
    steam: '/steam Commands',
};

const showHelp = async (topic?: string): Promise<CommandResponse> => {
    const { interaction, responses } = chatInput({
        commandName: 'help',
        strings: topic ? { topic } : {},
    });
    await help.execute(interaction);
    return onlyResponse(responses);
};

const selectTopic = async (topic: string | undefined): Promise<CommandResponse> => {
    const { interaction, responses } = selectMenu({
        customId: 'help:topic',
        values: topic ? [topic] : [],
    });
    await help.handleSelectMenu(interaction);
    return onlyResponse(responses);
};

// The topic options in the select menu, and which one is selected.
const menuOf = (response: CommandResponse): { values: string[]; selected: string | undefined } => {
    const menu = componentsOf(response)[0]?.components[0] as {
        custom_id: string;
        options: { value: string; default?: boolean }[];
    };
    assert.equal(menu.custom_id, 'help:topic');
    return {
        values: menu.options.map(({ value }) => value),
        selected: menu.options.find((option) => option.default)?.value,
    };
};

describe('/help', () => {
    it('shows the general help privately by default', async (t) => {
        captureConsole(t);
        const response = await showHelp();
        assert.equal(response.method, 'reply');
        assert.equal(payloadOf(response).flags, MessageFlags.Ephemeral);
        assert.equal(embedOf(response).title, 'PossyDeadlock Help');
        assert.equal(menuOf(response).selected, 'general');
    });

    it('shows the bot version in the general help', async (t) => {
        captureConsole(t);
        assert.match(embedOf(await showHelp()).footer?.text ?? '', new RegExp(`v${VERSION}`));
    });

    it('shows each topic and offers every topic in the menu', async (t) => {
        captureConsole(t);
        for (const [topic, title] of Object.entries(TITLES)) {
            const response = await showHelp(topic);
            assert.equal(embedOf(response).title, title, topic);
            assert.deepEqual(menuOf(response), { values: Object.keys(TITLES), selected: topic });
        }
    });

    it('switches topic from the menu', async () => {
        const response = await selectTopic('steam');
        assert.equal(response.method, 'update');
        assert.equal(embedOf(response).title, '/steam Commands');
        assert.equal(menuOf(response).selected, 'steam');
    });

    it('falls back to the general help for unknown topics', async (t) => {
        captureConsole(t);
        assert.equal(embedOf(await showHelp('nonsense')).title, 'PossyDeadlock Help');
        assert.equal(embedOf(await selectTopic('nonsense')).title, 'PossyDeadlock Help');
        assert.equal(embedOf(await selectTopic(undefined)).title, 'PossyDeadlock Help');
    });
});
