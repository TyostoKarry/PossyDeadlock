import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MessageFlags } from 'discord.js';
import { handleInteraction } from '../src/interactions.js';
import type { Command } from '../src/interactions.js';
import { captureConsole } from './helpers/console.js';
import {
    autocomplete,
    button,
    chatInput,
    onlyResponse,
    otherInteraction,
    payloadOf,
    selectMenu,
} from './helpers/interactions.js';

type OptionalHandler = 'autocomplete' | 'handleButton' | 'handleSelectMenu';

// A command that records which of its handlers were called.
const recordingCommand = (
    name: string,
    calls: string[],
    overrides: Partial<Command> = {},
    without: OptionalHandler[] = [],
): Command => {
    const command: Command = {
        data: { name, toJSON: () => ({ name }) },
        execute: async (): Promise<void> => {
            calls.push(`${name}.execute`);
        },
        autocomplete: async (): Promise<void> => {
            calls.push(`${name}.autocomplete`);
        },
        handleButton: async (): Promise<void> => {
            calls.push(`${name}.handleButton`);
        },
        handleSelectMenu: async (): Promise<void> => {
            calls.push(`${name}.handleSelectMenu`);
        },
        ...overrides,
    };
    for (const handler of without) delete command[handler];
    return command;
};

const commandMap = (...commands: Command[]): Map<string, Command> =>
    new Map(commands.map((command) => [command.data.name, command]));

describe('handleInteraction', () => {
    it('runs the slash command with the same name', async () => {
        const calls: string[] = [];
        const commands = commandMap(
            recordingCommand('heroes', calls),
            recordingCommand('news', calls),
        );
        await handleInteraction(chatInput({ commandName: 'news' }).interaction, commands);
        assert.deepEqual(calls, ['news.execute']);
    });

    it('sends autocomplete to the command being typed', async () => {
        const calls: string[] = [];
        const commands = commandMap(recordingCommand('heroes', calls));
        await handleInteraction(autocomplete({ commandName: 'heroes' }).interaction, commands);
        assert.deepEqual(calls, ['heroes.autocomplete']);
    });

    it('routes buttons and select menus by the prefix of their custom ID', async () => {
        const calls: string[] = [];
        const commands = commandMap(
            recordingCommand('heroes', calls),
            recordingCommand('help', calls),
        );
        await handleInteraction(button({ customId: 'heroes:reroll:user-1' }).interaction, commands);
        await handleInteraction(selectMenu({ customId: 'help:topic' }).interaction, commands);
        assert.deepEqual(calls, ['heroes.handleButton', 'help.handleSelectMenu']);
    });

    it('ignores unknown commands, missing handlers and other interaction types', async () => {
        const calls: string[] = [];
        const commands = commandMap(
            recordingCommand('help', calls, {}, ['autocomplete', 'handleButton']),
        );
        for (const { interaction } of [
            chatInput({ commandName: 'unknown' }),
            autocomplete({ commandName: 'help' }),
            button({ customId: 'help:something' }),
            button({ customId: 'unknown:button' }),
            selectMenu({ customId: '' }),
            otherInteraction(),
        ]) {
            await handleInteraction(interaction, commands);
        }
        assert.deepEqual(calls, []);
    });

    it('logs errors from autocomplete, buttons and select menus without replying', async (t) => {
        const output = captureConsole(t);
        const fail = async (): Promise<void> => {
            throw new Error('boom');
        };
        const commands = commandMap(
            recordingCommand('heroes', [], {
                autocomplete: fail,
                handleButton: fail,
                handleSelectMenu: fail,
            }),
        );
        const fakes = [
            autocomplete({ commandName: 'heroes' }),
            button({ customId: 'heroes:list' }),
            selectMenu({ customId: 'heroes:menu' }),
        ];
        for (const { interaction } of fakes) {
            await assert.doesNotReject(handleInteraction(interaction, commands));
        }

        assert.equal(output.error.filter((line) => line.includes('[ERROR]')).length, 3);
        for (const { responses } of fakes) assert.deepEqual(responses, []);
    });

    it('replies privately with an error when a command throws before replying', async (t) => {
        captureConsole(t);
        const commands = commandMap(
            recordingCommand('news', [], {
                execute: async () => {
                    throw new Error('boom');
                },
            }),
        );
        const { interaction, responses } = chatInput({ commandName: 'news' });
        await handleInteraction(interaction, commands);

        const response = onlyResponse(responses);
        assert.equal(response.method, 'reply');
        assert.equal(
            payloadOf(response).content,
            'There was an error while executing this command!',
        );
        assert.equal(payloadOf(response).flags, MessageFlags.Ephemeral);
    });

    it('follows up instead when the command had already replied or deferred', async (t) => {
        captureConsole(t);
        for (const first of ['reply', 'deferReply'] as const) {
            const commands = commandMap(
                recordingCommand('news', [], {
                    execute: async (interaction) => {
                        if (first === 'reply') await interaction.reply('Working on it');
                        else await interaction.deferReply();
                        throw new Error('boom');
                    },
                }),
            );
            const { interaction, responses } = chatInput({ commandName: 'news' });
            await handleInteraction(interaction, commands);
            assert.deepEqual(
                responses.map(({ method }) => method),
                [first, 'followUp'],
            );
        }
    });

    it('never throws when the error reply itself fails', async (t) => {
        const output = captureConsole(t);
        const commands = commandMap(
            recordingCommand('news', [], {
                execute: async () => {
                    throw new Error('boom');
                },
            }),
        );
        const { interaction } = chatInput({ commandName: 'news', failOn: 'reply' });

        await assert.doesNotReject(handleInteraction(interaction, commands));
        assert.ok(output.error.some((line) => line.includes('Failed to send the error reply')));
    });
});
