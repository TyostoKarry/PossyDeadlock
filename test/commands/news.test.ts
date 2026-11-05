import { describe, it } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import {
    ChannelType,
    MessageFlags,
    NewsChannel,
    PermissionFlagsBits,
    PermissionsBitField,
    Role,
    TextChannel,
} from 'discord.js';
import news from '../../src/commands/news/index.js';
import {
    getNewsChannel,
    getNewsMode,
    getPingRole,
    isPostSeen,
    setNewsChannel,
    setNewsMode,
    setPingRole,
} from '../../src/db/database.js';
import { OFFICIAL_FEED } from '../../src/utils/steamApi.js';
import type { SteamNewsPost } from '../../src/utils/steamApi.js';
import { captureConsole } from '../helpers/console.js';
import { mockFetch } from '../helpers/fetch.js';
import { chatInput, embedOf, onlyResponse, payloadOf } from '../helpers/interactions.js';
import type { CommandResponse } from '../helpers/interactions.js';
import { allNewsPermissions } from '../helpers/newsClient.js';

const fakeChannel = <T extends TextChannel | NewsChannel>(
    prototype: T,
    id: string,
    permissions: bigint,
): T =>
    Object.assign(Object.create(prototype) as T, {
        id,
        name: 'news',
        guild: { members: { me: { id: 'bot' } } },
        permissionsFor: () => new PermissionsBitField(permissions),
    });

const textChannel = (id: string, permissions = allNewsPermissions): TextChannel =>
    fakeChannel(TextChannel.prototype, id, permissions);

const announcementChannel = (id: string, permissions = allNewsPermissions): NewsChannel =>
    fakeChannel(NewsChannel.prototype, id, permissions);

const guildWith = (channel: TextChannel | NewsChannel): unknown => ({
    channels: { cache: new Map([[channel.id, channel]]) },
});

const role = (id: string): Role =>
    Object.assign(Object.create(Role.prototype) as Role, { id, name: 'Patch Notes' });

const post = (gid: string, feedname = OFFICIAL_FEED): SteamNewsPost => ({
    gid,
    title: `Post ${gid}`,
    url: `https://store.steampowered.com/news/app/1422450/view/${gid}`,
    author: 'Yoshi',
    contents: `[p]Contents of ${gid}[/p]<img src="https://cdn.example.com/${gid}.png">`,
    date: 1761998400,
    feedname,
});

const mockNews = (t: TestContext, posts: SteamNewsPost[] | 'fail'): void => {
    mockFetch(t, () =>
        posts === 'fail'
            ? new Response('', { status: 503 })
            : Response.json({ appnews: { newsitems: posts } }),
    );
};

// Each test uses its own server, since the database is shared within this file.
let nextGuild = 0;
const newGuild = (): string => `news-guild-${++nextGuild}`;

const run = async (
    guildId: string,
    subcommand: string,
    options: {
        strings?: Record<string, string>;
        channel?: unknown;
        role?: unknown;
        guild?: unknown;
    } = {},
): Promise<CommandResponse[]> => {
    const { interaction, responses } = chatInput({
        commandName: 'news',
        subcommand,
        guildId,
        ...options,
    });
    await news.execute(interaction);
    return responses;
};

const privateReply = (responses: CommandResponse[]): string => {
    const response = onlyResponse(responses);
    assert.equal(response.method, 'reply');
    assert.equal(payloadOf(response).flags, MessageFlags.Ephemeral);
    return payloadOf(response).content ?? '';
};

describe('/news', () => {
    it('can only be used by members who can manage the server', () => {
        assert.equal(
            news.data.toJSON().default_member_permissions,
            PermissionFlagsBits.ManageGuild.toString(),
        );
    });

    it('only offers text and announcement channels to pick as the news channel', () => {
        const subcommands = news.data.toJSON().options as unknown as {
            name: string;
            options?: { name: string; channel_types?: number[] }[];
        }[];
        const channelOption = subcommands
            .find((sub) => sub.name === 'set-channel')
            ?.options?.find((option) => option.name === 'channel');
        assert.deepEqual(channelOption?.channel_types, [
            ChannelType.GuildText,
            ChannelType.GuildAnnouncement,
        ]);
    });
});

describe('/news set-channel', () => {
    it('sets the channel and skips the posts already in the feed', async (t) => {
        captureConsole(t);
        const guild = newGuild();
        mockNews(t, [post('1'), post('2')]);

        const content = privateReply(
            await run(guild, 'set-channel', { channel: textChannel('c1') }),
        );
        assert.equal(content, 'Deadlock news will now be posted in <#c1>');
        assert.equal(getNewsChannel(guild), 'c1');
        assert.equal(isPostSeen(guild, '1'), true);
        assert.equal(isPostSeen(guild, '2'), true);
    });

    it('accepts announcement channels', async (t) => {
        captureConsole(t);
        const guild = newGuild();
        mockNews(t, []);

        const content = privateReply(
            await run(guild, 'set-channel', { channel: announcementChannel('a1') }),
        );
        assert.equal(content, 'Deadlock news will now be posted in <#a1>');
        assert.equal(getNewsChannel(guild), 'a1');
    });

    it('only skips the feed the first time', async (t) => {
        captureConsole(t);
        const guild = newGuild();
        setNewsChannel(guild, 'c1');
        mockNews(t, [post('3')]);

        await run(guild, 'set-channel', { channel: textChannel('c2') });
        assert.equal(getNewsChannel(guild), 'c2');
        assert.equal(isPostSeen(guild, '3'), false);
    });

    it('still sets the channel when the feed can not be fetched', async (t) => {
        const output = captureConsole(t);
        const guild = newGuild();
        mockNews(t, 'fail');

        await run(guild, 'set-channel', { channel: textChannel('c1') });
        assert.equal(getNewsChannel(guild), 'c1');
        assert.match(output.error[0] ?? '', /Failed to skip existing news feed/);
    });

    it('refuses channels that are not text or announcement channels', async () => {
        const guild = newGuild();
        const content = privateReply(await run(guild, 'set-channel', { channel: { id: 'voice' } }));
        assert.equal(content, 'Please select a text or announcement channel.');
        assert.equal(getNewsChannel(guild), null);
    });

    it('refuses a channel where the bot is missing permissions, naming them', async () => {
        const guild = newGuild();
        const channel = textChannel(
            'c1',
            PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
        );
        const content = privateReply(await run(guild, 'set-channel', { channel }));
        assert.equal(
            content,
            "The bot can't post news in <#c1>. It's missing these permissions there: Embed Links, Create Public Threads, Send Messages in Threads.",
        );
        assert.equal(getNewsChannel(guild), null);
    });

    it('clears the channel when none is given', async (t) => {
        captureConsole(t);
        const guild = newGuild();
        setNewsChannel(guild, 'c1');
        const content = privateReply(await run(guild, 'set-channel'));
        assert.equal(content, 'News channel cleared — bot will no longer post Deadlock news.');
        assert.equal(getNewsChannel(guild), null);
    });
});

describe('/news set-mode', () => {
    it('sets the mode', async (t) => {
        captureConsole(t);
        const guild = newGuild();
        setNewsChannel(guild, 'c1');

        assert.equal(
            privateReply(await run(guild, 'set-mode', { strings: { mode: 'all' } })),
            'News mode set to: **All news including third party articles**',
        );
        assert.equal(getNewsMode(guild), 'all');
        assert.equal(
            privateReply(await run(guild, 'set-mode', { strings: { mode: 'official' } })),
            'News mode set to: **Official Valve patch notes only**',
        );
        assert.equal(getNewsMode(guild), 'official');
    });

    it('asks for a news channel first', async () => {
        const guild = newGuild();
        assert.equal(
            privateReply(await run(guild, 'set-mode', { strings: { mode: 'all' } })),
            'Please set a news channel first with `/news set-channel`.',
        );
        assert.equal(getNewsMode(guild), 'official');
    });
});

describe('/news set-ping-role', () => {
    it('sets and clears the ping role', async (t) => {
        captureConsole(t);
        const guild = newGuild();
        setNewsChannel(guild, 'c1');

        assert.equal(
            privateReply(await run(guild, 'set-ping-role', { role: role('r1') })),
            '<@&r1> will now be pinged when new Deadlock news is posted.',
        );
        assert.equal(getPingRole(guild), 'r1');

        assert.equal(
            privateReply(await run(guild, 'set-ping-role')),
            'Ping role cleared — no role will be pinged on new posts.',
        );
        assert.equal(getPingRole(guild), null);
    });

    it('accepts @everyone and replies with it as plain text', async (t) => {
        captureConsole(t);
        const guild = newGuild();
        setNewsChannel(guild, 'c1');
        const channel = textChannel('c1', allNewsPermissions | PermissionFlagsBits.MentionEveryone);
        assert.equal(
            privateReply(
                await run(guild, 'set-ping-role', { role: role(guild), guild: guildWith(channel) }),
            ),
            '@everyone will now be pinged when new Deadlock news is posted.',
        );
        assert.equal(getPingRole(guild), guild);
    });

    it('refuses something that is not a role', async () => {
        const guild = newGuild();
        setNewsChannel(guild, 'c1');
        assert.equal(
            privateReply(await run(guild, 'set-ping-role', { role: { id: 'r1' } })),
            'Please select a valid role.',
        );
        assert.equal(getPingRole(guild), null);
    });

    it('asks for a news channel first', async () => {
        const guild = newGuild();
        assert.equal(
            privateReply(await run(guild, 'set-ping-role', { role: role('r1') })),
            'Please set a news channel first with `/news set-channel`.',
        );
        assert.equal(getPingRole(guild), null);
    });

    it('refuses @everyone when the bot can not mention everyone in the news channel', async () => {
        const guild = newGuild();
        setNewsChannel(guild, 'c1');
        assert.equal(
            privateReply(
                await run(guild, 'set-ping-role', {
                    role: role(guild),
                    guild: guildWith(textChannel('c1')),
                }),
            ),
            "The bot can't ping @everyone in <#c1>. It's missing this permission there: Mention Everyone.",
        );
        assert.equal(getPingRole(guild), null);
    });
});

describe('/news config', () => {
    it('shows the defaults for a new server', async (t) => {
        captureConsole(t);
        const response = onlyResponse(await run(newGuild(), 'config'));
        assert.equal(payloadOf(response).flags, MessageFlags.Ephemeral);
        assert.deepEqual(
            embedOf(response).fields?.map(({ name, value }) => [name, value]),
            [
                ['News Channel', 'Not set — use `/news set-channel`'],
                ['News Mode', 'Official only (Valve patch notes)'],
                ['Ping Role', 'None'],
            ],
        );
    });

    it('shows the current settings', async (t) => {
        captureConsole(t);
        const guild = newGuild();
        setNewsChannel(guild, 'c1');
        setNewsMode(guild, 'all');
        setPingRole(guild, 'r1');
        const response = onlyResponse(
            await run(guild, 'config', { guild: guildWith(textChannel('c1')) }),
        );
        assert.deepEqual(
            embedOf(response).fields?.map(({ value }) => value),
            ['<#c1>', 'All set', 'All (includes third party articles)', '<@&r1>'],
        );
    });

    it('lists the permissions the bot is missing in the news channel', async (t) => {
        captureConsole(t);
        const guild = newGuild();
        setNewsChannel(guild, 'c1');
        const channel = textChannel('c1', PermissionFlagsBits.ViewChannel);
        const response = onlyResponse(await run(guild, 'config', { guild: guildWith(channel) }));
        assert.equal(
            embedOf(response).fields?.[1]?.value,
            'Missing: Send Messages, Embed Links, Create Public Threads, Send Messages in Threads',
        );
    });

    it('says when the news channel no longer exists', async (t) => {
        captureConsole(t);
        const guild = newGuild();
        setNewsChannel(guild, 'deleted');
        const response = onlyResponse(
            await run(guild, 'config', { guild: guildWith(textChannel('c1')) }),
        );
        assert.equal(
            embedOf(response).fields?.[1]?.value,
            'Channel not found — use `/news set-channel` to pick another',
        );
    });

    it('checks permissions in an announcement channel too', async (t) => {
        captureConsole(t);
        const guild = newGuild();
        setNewsChannel(guild, 'a1');
        const response = onlyResponse(
            await run(guild, 'config', { guild: guildWith(announcementChannel('a1')) }),
        );
        assert.equal(embedOf(response).fields?.[1]?.value, 'All set');
    });

    it('shows @everyone as the ping role', async (t) => {
        captureConsole(t);
        const guild = newGuild();
        setNewsChannel(guild, 'c1');
        setPingRole(guild, guild);
        const fields = embedOf(onlyResponse(await run(guild, 'config'))).fields;
        assert.equal(fields?.find(({ name }) => name === 'Ping Role')?.value, '@everyone');
    });

    it('reports a missing Mention Everyone permission when the ping role is @everyone', async (t) => {
        captureConsole(t);
        const guild = newGuild();
        setNewsChannel(guild, 'c1');
        setPingRole(guild, guild);
        const response = onlyResponse(
            await run(guild, 'config', { guild: guildWith(textChannel('c1')) }),
        );
        assert.equal(embedOf(response).fields?.[1]?.value, 'Missing: Mention Everyone');
    });
});

describe('/news last-post', () => {
    it('shows the newest official post', async (t) => {
        captureConsole(t);
        mockNews(t, [post('article', 'third_party_feed'), post('official')]);
        const responses = await run(newGuild(), 'last-post');

        assert.deepEqual(
            responses.map(({ method }) => method),
            ['deferReply', 'editReply'],
        );
        assert.equal(payloadOf(responses[0] as CommandResponse).flags, MessageFlags.Ephemeral);
        const embed = embedOf(responses[1] as CommandResponse);
        assert.equal(embed.title, 'Post official');
        assert.equal(embed.description, 'Contents of official...');
        assert.equal(embed.url, 'https://store.steampowered.com/news/app/1422450/view/official');
        assert.equal(embed.image?.url, 'https://cdn.example.com/official.png');
        assert.equal(embed.footer?.text, 'By Yoshi');
    });

    it('includes third-party articles in all mode', async (t) => {
        captureConsole(t);
        const guild = newGuild();
        setNewsChannel(guild, 'c1');
        setNewsMode(guild, 'all');
        mockNews(t, [post('article', 'third_party_feed'), post('official')]);
        const responses = await run(guild, 'last-post');
        assert.equal(embedOf(responses[1] as CommandResponse).title, 'Post article');
    });

    it('can be posted publicly', async (t) => {
        captureConsole(t);
        mockNews(t, [post('official')]);
        const responses = await run(newGuild(), 'last-post', { strings: { visibility: 'public' } });
        assert.equal(payloadOf(responses[0] as CommandResponse).flags, undefined);
    });

    it('says when there are no posts', async (t) => {
        captureConsole(t);
        mockNews(t, [post('article', 'third_party_feed')]);
        const responses = await run(newGuild(), 'last-post');
        assert.equal(payloadOf(responses[1] as CommandResponse).content, 'No news posts found.');
    });

    it('says when the news can not be fetched', async (t) => {
        const output = captureConsole(t);
        mockNews(t, 'fail');
        const responses = await run(newGuild(), 'last-post');
        assert.equal(
            payloadOf(responses[1] as CommandResponse).content,
            'Failed to fetch the latest news post.',
        );
        assert.match(output.error[0] ?? '', /Failed to fetch last news post/);
    });
});
