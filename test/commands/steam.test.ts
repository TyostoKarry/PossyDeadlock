import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InteractionContextType, MessageFlags } from 'discord.js';
import steam from '../../src/commands/steam/index.js';
import {
    addSteamLink,
    deleteSteamLink,
    getLinkedDiscordUserIds,
    getSteamLink,
} from '../../src/db/database.js';
import { captureConsole } from '../helpers/console.js';
import { chatInput, embedOf, onlyResponse, payloadOf } from '../helpers/interactions.js';
import type { CommandResponse } from '../helpers/interactions.js';

const ACCOUNT_ID = 22202;
const STEAM_ID_64 = '76561197960287930';

// Each test uses its own users, since the database is shared within this file.
let nextUser = 0;
const newUser = (): string => `steam-user-${++nextUser}`;

interface FakeMember {
    id: string;
    displayName: string;
}

// A server whose member fetches only return the given members, recording each request.
const guildWith = (members: FakeMember[]): { guild: unknown; requests: string[][] } => {
    const requests: string[][] = [];
    const guild = {
        members: {
            fetch: async ({ user }: { user: string[] }): Promise<Map<string, FakeMember>> => {
                requests.push(user);
                return new Map(
                    members
                        .filter(({ id }) => user.includes(id))
                        .map((member) => [member.id, member]),
                );
            },
        },
    };
    return { guild, requests };
};

const run = async (
    subcommand: string,
    userId: string,
    options: { strings?: Record<string, string>; guild?: unknown } = {},
): Promise<CommandResponse[]> => {
    const { interaction, responses } = chatInput({
        commandName: 'steam',
        subcommand,
        userId,
        ...options,
    });
    await steam.execute(interaction);
    return responses;
};

const privateReply = (responses: CommandResponse[]): CommandResponse => {
    const response = onlyResponse(responses);
    assert.equal(payloadOf(response).flags, MessageFlags.Ephemeral);
    return response;
};

describe('/steam', () => {
    it('can only be used in servers', () => {
        assert.deepEqual(steam.data.toJSON().contexts, [InteractionContextType.Guild]);
    });
});

describe('/steam link', () => {
    it('links the account and says others can see it', async (t) => {
        captureConsole(t);
        const user = newUser();
        const reply = privateReply(await run('link', user, { strings: { steam: STEAM_ID_64 } }));
        assert.equal(
            payloadOf(reply).content,
            `Linked to Steam account \`${ACCOUNT_ID}\` — [profile](https://steamcommunity.com/profiles/${STEAM_ID_64}).\nOther members can see that you've linked an account with \`/steam list-linked\`.`,
        );
        assert.equal(getSteamLink(user), ACCOUNT_ID);
    });

    it('refuses to replace an existing link', async () => {
        const user = newUser();
        addSteamLink(user, 1);
        const reply = privateReply(await run('link', user, { strings: { steam: STEAM_ID_64 } }));
        assert.match(payloadOf(reply).content ?? '', /already linked to Steam account `1`/);
        assert.equal(getSteamLink(user), 1);
    });

    it('explains that custom profile URLs are not supported', async () => {
        const user = newUser();
        const reply = privateReply(
            await run('link', user, {
                strings: { steam: 'https://steamcommunity.com/id/someone' },
            }),
        );
        assert.match(payloadOf(reply).content ?? '', /Custom profile URLs .* aren't supported/);
        assert.equal(getSteamLink(user), null);
    });

    it('rejects input that is not a Steam ID', async () => {
        const user = newUser();
        const reply = privateReply(await run('link', user, { strings: { steam: 'hello' } }));
        assert.match(payloadOf(reply).content ?? '', /doesn't look like a Steam ID/);
        assert.equal(getSteamLink(user), null);
    });
});

describe('/steam unlink', () => {
    it('removes the link', async (t) => {
        captureConsole(t);
        const user = newUser();
        addSteamLink(user, ACCOUNT_ID);
        const reply = privateReply(await run('unlink', user));
        assert.equal(payloadOf(reply).content, 'Your Steam account has been unlinked.');
        assert.equal(getSteamLink(user), null);
    });

    it('says when there was nothing to unlink', async () => {
        const reply = privateReply(await run('unlink', newUser()));
        assert.equal(payloadOf(reply).content, "You don't have a linked Steam account.");
    });
});

describe('/steam show', () => {
    it('shows the linked account', async (t) => {
        captureConsole(t);
        const user = newUser();
        addSteamLink(user, ACCOUNT_ID);
        const embed = embedOf(privateReply(await run('show', user)));
        assert.equal(embed.url, `https://steamcommunity.com/profiles/${STEAM_ID_64}`);
        assert.deepEqual(
            embed.fields?.map(({ name, value }) => [name, value]),
            [
                ['Account ID', `\`${ACCOUNT_ID}\``],
                ['SteamID64', `\`${STEAM_ID_64}\``],
            ],
        );
    });

    it('says when nothing is linked', async () => {
        const reply = privateReply(await run('show', newUser()));
        assert.equal(
            payloadOf(reply).content,
            "You don't have a linked Steam account. Use `/steam link` to link one.",
        );
    });
});

describe('/steam list-linked', () => {
    // Starts each test with no links, then links the given users.
    const resetLinks = (...users: string[]): void => {
        for (const user of getLinkedDiscordUserIds()) deleteSteamLink(user);
        for (const user of users) addSteamLink(user, 1);
    };

    const listedReply = (responses: CommandResponse[]): CommandResponse => {
        assert.deepEqual(
            responses.map(({ method }) => method),
            ['deferReply', 'editReply'],
        );
        assert.equal(payloadOf(responses[0] as CommandResponse).flags, MessageFlags.Ephemeral);
        return responses[1] as CommandResponse;
    };

    it('lists only members of this server, sorted by display name', async (t) => {
        captureConsole(t);
        // IDs sort the other way round, so sorting by ID would give the wrong order.
        resetLinks('u-1', 'u-2', 'u-elsewhere');
        const { guild } = guildWith([
            { id: 'u-1', displayName: 'Zed' },
            { id: 'u-2', displayName: 'amy' },
        ]);
        const embed = embedOf(listedReply(await run('list-linked', 'u-2', { guild })));
        assert.equal(embed.description, '<@u-2>\n<@u-1>');
        assert.equal(embed.footer?.text, '2 linked in this server');
    });

    it('fetches members in chunks of 100 and lists at most 100', async (t) => {
        captureConsole(t);
        const users = Array.from({ length: 150 }, (_, i) => `bulk-${String(i).padStart(3, '0')}`);
        resetLinks(...users);
        const { guild, requests } = guildWith(users.map((id) => ({ id, displayName: id })));

        const embed = embedOf(listedReply(await run('list-linked', 'bulk-000', { guild })));
        assert.deepEqual(
            requests.map((ids) => ids.length),
            [100, 50],
        );
        const lines = embed.description?.split('\n') ?? [];
        assert.equal(lines.length, 101);
        assert.equal(lines[100], '…and 50 more');
        assert.equal(embed.footer?.text, '150 linked in this server');
    });

    it('says when nobody in the server has linked', async (t) => {
        captureConsole(t);
        resetLinks('u-elsewhere');
        const { guild } = guildWith([]);
        const embed = embedOf(listedReply(await run('list-linked', 'u-1', { guild })));
        assert.match(embed.description ?? '', /^Nobody in this server has linked/);
        assert.equal(embed.footer?.text, '0 linked in this server');
    });

    it('says when members can not be fetched', async (t) => {
        const output = captureConsole(t);
        resetLinks('u-1');
        const guild = {
            members: {
                fetch: async (): Promise<never> => {
                    throw new Error('Missing Access');
                },
            },
        };
        const reply = listedReply(await run('list-linked', 'u-1', { guild }));
        assert.equal(payloadOf(reply).content, 'Failed to list linked accounts.');
        assert.match(output.error[0] ?? '', /Failed to list linked Steam accounts/);
    });
});
