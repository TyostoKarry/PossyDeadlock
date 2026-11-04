import { PermissionsBitField, TextChannel } from 'discord.js';
import type { Client, EmbedBuilder, MessageCreateOptions } from 'discord.js';
import { NEWS_PERMISSIONS } from '../../src/utils/newsPermissions.js';

export interface SentMessage {
    channelId: string;
    content: string | undefined;
    embed: EmbedBuilder | undefined;
    thread: { name: string; messages: string[] } | undefined;
}

export interface FakeNewsClient {
    client: Client<true>;
    sent: SentMessage[];
}

interface FakeThread {
    send: (text: string) => Promise<void>;
}

interface FakeChannelOptions {
    // Channels that aren't text channels are skipped by the news poller.
    text?: boolean;
    // Only fetched from the API, not in the client's cache.
    uncached?: boolean;
    failSend?: boolean;
    // The bot's permissions in the channel. Every news permission by default.
    permissions?: bigint;
}

const allNewsPermissions = NEWS_PERMISSIONS.reduce((all, [, flag]) => all | flag, 0n);

// A client with the given servers and channels, recording every message the news poller sends.
export const createNewsClient = (
    guildIds: string[],
    channels: Record<string, FakeChannelOptions> = {},
): FakeNewsClient => {
    const sent: SentMessage[] = [];

    const makeChannel = (id: string, options: FakeChannelOptions): unknown => {
        if (options.text === false) return { id };
        return Object.assign(Object.create(TextChannel.prototype) as TextChannel, {
            id,
            guild: { members: { me: { id: 'bot' } } },
            permissionsFor: () =>
                new PermissionsBitField(options.permissions ?? allNewsPermissions),
            send: async (message: MessageCreateOptions) => {
                if (options.failSend) throw new Error('Missing Permissions');
                const record: SentMessage = {
                    channelId: id,
                    content: message.content,
                    embed: message.embeds?.[0] as EmbedBuilder | undefined,
                    thread: undefined,
                };
                sent.push(record);
                return {
                    startThread: async ({ name }: { name: string }): Promise<FakeThread> => {
                        record.thread = { name, messages: [] };
                        return {
                            send: async (text: string): Promise<void> => {
                                record.thread?.messages.push(text);
                            },
                        };
                    },
                };
            },
        });
    };

    const all = new Map(Object.entries(channels).map(([id, o]) => [id, makeChannel(id, o)]));
    const cached = new Map([...all].filter(([id]) => !channels[id]?.uncached));

    const client = {
        guilds: { cache: new Map(guildIds.map((id) => [id, { id }])) },
        channels: {
            cache: cached,
            // Like discord.js, which throws for a channel that was deleted.
            fetch: async (id: string) => {
                const channel = all.get(id);
                if (!channel) throw new Error('Unknown Channel');
                return channel;
            },
        },
    } as unknown as Client<true>;

    return { client, sent };
};
