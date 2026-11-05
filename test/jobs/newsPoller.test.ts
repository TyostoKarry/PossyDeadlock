import { describe, it } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import cron from 'node-cron';
import { isPostSeen, setNewsChannel, setNewsMode, setPingRole } from '../../src/db/database.js';
import { poll, startNewsPoller } from '../../src/jobs/newsPoller.js';
import { OFFICIAL_FEED } from '../../src/utils/steamApi.js';
import type { SteamNewsPost } from '../../src/utils/steamApi.js';
import { captureConsole } from '../helpers/console.js';
import { mockFetch } from '../helpers/fetch.js';
import { createNewsClient } from '../helpers/newsClient.js';
import { PermissionFlagsBits } from 'discord.js';

const officialPost: SteamNewsPost = {
    gid: 'official-1',
    title: 'Gameplay Update',
    url: 'https://store.steampowered.com/news/app/1422450/view/1',
    author: 'Yoshi',
    contents: '[p]Intro[/p]\n[ General ]\n- Fixed a bug\n[ Heroes ]\n- Infernus: buffed',
    date: 1761998400,
    feedname: OFFICIAL_FEED,
};

const articlePost: SteamNewsPost = {
    gid: 'article-1',
    title: 'Deadlock tier list',
    url: 'https://example.com/tier-list',
    author: 'A Website',
    contents: '<p>Third party article</p><img src="https://cdn.example.com/article.png">',
    date: 1761998000,
    feedname: 'third_party_feed',
};

// Each test uses its own server IDs, since the database is shared within this file.
let nextId = 0;
const newGuild = (): string => `guild-${++nextId}`;

const mockNews = (
    t: TestContext,
    posts: SteamNewsPost[],
    ogImage: string | null = 'https://cdn.example.com/og.png',
): string[] => {
    const pages: string[] = [];
    mockFetch(t, (url) => {
        if (url.startsWith('https://api.steampowered.com/')) {
            return Response.json({ appnews: { newsitems: posts } });
        }
        pages.push(url);
        return new Response(
            ogImage ? `<meta property="og:image" content="${ogImage}">` : '<html></html>',
        );
    });
    return pages;
};

describe('news poller', () => {
    it('posts new official posts to every server with a news channel', async (t) => {
        captureConsole(t);
        const [a, b, unset] = [newGuild(), newGuild(), newGuild()];
        setNewsChannel(a, 'channel-a');
        setNewsChannel(b, 'channel-b');
        const { client, sent } = createNewsClient([a, b, unset], {
            'channel-a': {},
            'channel-b': {},
        });
        mockNews(t, [officialPost]);

        await poll(client);
        assert.deepEqual(
            sent.map(({ channelId }) => channelId),
            ['channel-a', 'channel-b'],
        );
        assert.equal(isPostSeen(a, officialPost.gid), true);
        assert.equal(isPostSeen(b, officialPost.gid), true);
        assert.equal(isPostSeen(unset, officialPost.gid), false);
    });

    it('does not post the same post twice', async (t) => {
        captureConsole(t);
        const guild = newGuild();
        setNewsChannel(guild, 'channel-1');
        const { client, sent } = createNewsClient([guild], { 'channel-1': {} });
        mockNews(t, [officialPost]);

        await poll(client);
        await poll(client);
        assert.equal(sent.length, 1);
    });

    it('builds the embed from the post', async (t) => {
        captureConsole(t);
        const guild = newGuild();
        setNewsChannel(guild, 'channel-1');
        const { client, sent } = createNewsClient([guild], { 'channel-1': {} });
        mockNews(t, [officialPost]);

        await poll(client);
        const embed = sent[0]?.embed?.toJSON();
        assert.ok(embed);
        assert.equal(embed.title, 'Gameplay Update');
        assert.equal(embed.url, officialPost.url);
        assert.equal(embed.footer?.text, 'By Yoshi');
        assert.equal(embed.timestamp, new Date(officialPost.date * 1000).toISOString());
        assert.ok(embed.description?.startsWith('Intro'));
        assert.ok(embed.description?.endsWith('...'));
        assert.equal(embed.image?.url, 'https://cdn.example.com/og.png');
    });

    it('shortens the description to 300 characters', async (t) => {
        captureConsole(t);
        const guild = newGuild();
        setNewsChannel(guild, 'channel-1');
        const { client, sent } = createNewsClient([guild], { 'channel-1': {} });
        mockNews(t, [{ ...officialPost, contents: 'x'.repeat(1000) }]);

        await poll(client);
        assert.equal(sent[0]?.embed?.toJSON().description, `${'x'.repeat(300)}...`);
    });

    it('uses an image from the post before fetching the page', async (t) => {
        captureConsole(t);
        const guild = newGuild();
        setNewsChannel(guild, 'channel-1');
        setNewsMode(guild, 'all');
        const { client, sent } = createNewsClient([guild], { 'channel-1': {} });
        const pages = mockNews(t, [articlePost]);

        await poll(client);
        assert.equal(sent[0]?.embed?.toJSON().image?.url, 'https://cdn.example.com/article.png');
        assert.deepEqual(pages, []);
    });

    it('posts without an image when neither the post nor the page has one', async (t) => {
        captureConsole(t);
        const guild = newGuild();
        setNewsChannel(guild, 'channel-1');
        const { client, sent } = createNewsClient([guild], { 'channel-1': {} });
        mockNews(t, [officialPost], null);

        await poll(client);
        assert.equal(sent[0]?.embed?.toJSON().image, undefined);
    });

    it("fetches a post's page once, however many servers get it", async (t) => {
        captureConsole(t);
        const [a, b] = [newGuild(), newGuild()];
        setNewsChannel(a, 'channel-a');
        setNewsChannel(b, 'channel-b');
        const { client, sent } = createNewsClient([a, b], { 'channel-a': {}, 'channel-b': {} });
        const pages = mockNews(t, [officialPost]);

        await poll(client);
        assert.equal(sent.length, 2);
        assert.deepEqual(pages, [officialPost.url]);
    });

    it('posts the full patch notes in a thread, one message per section', async (t) => {
        captureConsole(t);
        const guild = newGuild();
        setNewsChannel(guild, 'channel-1');
        const { client, sent } = createNewsClient([guild], { 'channel-1': {} });
        mockNews(t, [officialPost]);

        await poll(client);
        assert.deepEqual(sent[0]?.thread, {
            name: 'Gameplay Update',
            messages: ['Intro', '[ General ]\n\n- Fixed a bug', '[ Heroes ]\n\n- Infernus: buffed'],
        });
    });

    it('cuts thread names to 100 characters', async (t) => {
        captureConsole(t);
        const guild = newGuild();
        setNewsChannel(guild, 'channel-1');
        const { client, sent } = createNewsClient([guild], { 'channel-1': {} });
        mockNews(t, [{ ...officialPost, title: 'T'.repeat(150) }]);

        await poll(client);
        assert.equal(sent[0]?.thread?.name, 'T'.repeat(100));
    });

    it('only posts official posts in official mode', async (t) => {
        captureConsole(t);
        const guild = newGuild();
        setNewsChannel(guild, 'channel-1');
        const { client, sent } = createNewsClient([guild], { 'channel-1': {} });
        mockNews(t, [officialPost, articlePost]);

        await poll(client);
        assert.deepEqual(
            sent.map(({ embed }) => embed?.toJSON().title),
            ['Gameplay Update'],
        );
        assert.equal(isPostSeen(guild, articlePost.gid), false);
    });

    it('also posts third-party articles in all mode, without a thread', async (t) => {
        captureConsole(t);
        const guild = newGuild();
        setNewsChannel(guild, 'channel-1');
        setNewsMode(guild, 'all');
        const { client, sent } = createNewsClient([guild], { 'channel-1': {} });
        mockNews(t, [officialPost, articlePost]);

        await poll(client);
        assert.equal(sent.length, 2);
        assert.ok(sent[0]?.thread);
        assert.equal(sent[1]?.thread, undefined);
    });

    it('pings the ping role when one is set', async (t) => {
        captureConsole(t);
        const [withRole, withoutRole] = [newGuild(), newGuild()];
        setNewsChannel(withRole, 'channel-1');
        setNewsChannel(withoutRole, 'channel-2');
        setPingRole(withRole, 'role-1');
        const { client, sent } = createNewsClient([withRole, withoutRole], {
            'channel-1': {},
            'channel-2': {},
        });
        mockNews(t, [officialPost]);

        await poll(client);
        assert.equal(sent[0]?.content, '<@&role-1>');
        assert.equal(sent[1]?.content, undefined);
    });

    it('fetches the channel when it is not cached', async (t) => {
        captureConsole(t);
        const guild = newGuild();
        setNewsChannel(guild, 'channel-1');
        const { client, sent } = createNewsClient([guild], { 'channel-1': { uncached: true } });
        mockNews(t, [officialPost]);

        await poll(client);
        assert.equal(sent.length, 1);
    });

    it('skips servers whose news channel is not a text channel or no longer exists', async (t) => {
        captureConsole(t);
        const [voice, deleted] = [newGuild(), newGuild()];
        setNewsChannel(voice, 'voice-channel');
        setNewsChannel(deleted, 'deleted-channel');
        const { client, sent } = createNewsClient([voice, deleted], {
            'voice-channel': { text: false },
        });
        mockNews(t, [officialPost]);

        await poll(client);
        assert.deepEqual(sent, []);
        assert.equal(isPostSeen(voice, officialPost.gid), false);
    });

    it('keeps posting to other servers when one server fails', async (t) => {
        captureConsole(t);
        const [broken, working] = [newGuild(), newGuild()];
        setNewsChannel(broken, 'deleted-channel');
        setNewsChannel(working, 'channel-1');
        const { client, sent } = createNewsClient([broken, working], { 'channel-1': {} });
        mockNews(t, [officialPost]);

        await poll(client);
        assert.deepEqual(
            sent.map(({ channelId }) => channelId),
            ['channel-1'],
        );
        assert.equal(isPostSeen(broken, officialPost.gid), false);
        assert.equal(isPostSeen(working, officialPost.gid), true);
    });

    it('warns about a news channel that can not be fetched', async (t) => {
        const output = captureConsole(t);
        const guild = newGuild();
        setNewsChannel(guild, 'deleted-channel');
        const { client } = createNewsClient([guild]);
        mockNews(t, [officialPost]);

        await poll(client);
        assert.match(
            output.warn[0] ?? '',
            /Could not fetch news channel deleted-channel: Unknown Channel/,
        );
        assert.deepEqual(output.error, []);
    });

    it('skips a server where the bot is missing permissions, without marking posts seen', async (t) => {
        const output = captureConsole(t);
        const [blocked, working] = [newGuild(), newGuild()];
        setNewsChannel(blocked, 'channel-1');
        setNewsChannel(working, 'channel-2');
        const { client, sent } = createNewsClient([blocked, working], {
            'channel-1': {
                permissions: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
            },
            'channel-2': {},
        });
        mockNews(t, [officialPost]);

        await poll(client);
        assert.deepEqual(
            sent.map(({ channelId }) => channelId),
            ['channel-2'],
        );
        assert.equal(isPostSeen(blocked, officialPost.gid), false);
        assert.match(
            output.warn[0] ?? '',
            /Missing permissions in news channel channel-1: Embed Links, Create Public Threads, Send Messages in Threads/,
        );
    });

    it('posts what it skipped once the permissions are fixed', async (t) => {
        captureConsole(t);
        const guild = newGuild();
        setNewsChannel(guild, 'channel-1');
        mockNews(t, [officialPost]);

        await poll(createNewsClient([guild], { 'channel-1': { permissions: 0n } }).client);
        const { client, sent } = createNewsClient([guild], { 'channel-1': {} });
        await poll(client);
        assert.deepEqual(
            sent.map(({ channelId }) => channelId),
            ['channel-1'],
        );
    });

    it('marks a post seen even when sending fails, and carries on', async (t) => {
        const output = captureConsole(t);
        const [failing, working] = [newGuild(), newGuild()];
        setNewsChannel(failing, 'channel-1');
        setNewsChannel(working, 'channel-2');
        const { client, sent } = createNewsClient([failing, working], {
            'channel-1': { failSend: true },
            'channel-2': {},
        });
        mockNews(t, [officialPost]);

        await poll(client);
        assert.equal(isPostSeen(failing, officialPost.gid), true);
        assert.deepEqual(
            sent.map(({ channelId }) => channelId),
            ['channel-2'],
        );
        assert.match(output.error[0] ?? '', /Failed to post: "Gameplay Update"/);
    });

    it('logs and carries on when Steam news can not be fetched', async (t) => {
        const output = captureConsole(t);
        const guild = newGuild();
        setNewsChannel(guild, 'channel-1');
        const { client, sent } = createNewsClient([guild], { 'channel-1': {} });
        mockFetch(t, () => new Response('', { status: 503 }));

        await assert.doesNotReject(poll(client));
        assert.deepEqual(sent, []);
        assert.match(output.error[0] ?? '', /News poller failed/);
    });

    it('runs on startup and then every 5 minutes', (t) => {
        captureConsole(t);
        const { client } = createNewsClient([]);
        mockNews(t, []);
        const schedule = t.mock.method(cron, 'schedule', () => undefined);

        startNewsPoller(client);
        assert.equal(schedule.mock.callCount(), 1);
        assert.equal(schedule.mock.calls[0]?.arguments[0], '*/5 * * * *');
    });
});
