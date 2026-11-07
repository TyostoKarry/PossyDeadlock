import cron from 'node-cron';
import { Client, EmbedBuilder, NewsChannel } from 'discord.js';
import { fetchDeadlockNews, OFFICIAL_FEED, type SteamNewsPost } from '../utils/steamApi.js';
import {
    getNewsChannel,
    getNewsMode,
    getPingRole,
    isPostSeen,
    markPostSeen,
    pruneSeenPosts,
} from '../db/database.js';
import { logger } from '../utils/logger.js';
import {
    encodePostUrl,
    extractNewsImageUrl,
    fetchNewsOgImageUrl,
    pingRoleMention,
    splitIntoSections,
    stripHtml,
} from '../utils/formatUtils.js';
import {
    isNewsPostChannel,
    missingNewsPermissions,
    type NewsPostChannel,
} from '../utils/newsPermissions.js';
import { forEachLimit } from '../utils/forEachLimit.js';

// Each server being posted to adds about 1 request per second, against Discord's limit of 50.
const MAX_PARALLEL_GUILDS = 10;

const fetchNewsChannel = async (
    client: Client<true>,
    guildId: string,
    channelID: string,
): Promise<NewsPostChannel | null> => {
    try {
        const channel =
            client.channels.cache.get(channelID) ?? (await client.channels.fetch(channelID));
        return isNewsPostChannel(channel) ? channel : null;
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        logger.warn(`[${guildId}] Could not fetch news channel ${channelID}: ${reason}`);
        return null;
    }
};

const buildNewsEmbed = async (post: SteamNewsPost): Promise<EmbedBuilder> => {
    const description = stripHtml(post.contents).slice(0, 300);
    const embed = new EmbedBuilder()
        .setTitle(post.title)
        .setDescription(description + '...')
        .setFooter({ text: `By ${post.author}` })
        .setTimestamp(post.date * 1000)
        .setColor(0x00b4d8);

    const url = encodePostUrl(post.url);
    if (url) embed.setURL(url);

    const imageUrl =
        extractNewsImageUrl(post.contents) ?? (url ? await fetchNewsOgImageUrl(url) : null);
    if (imageUrl) embed.setImage(imageUrl);

    return embed;
};

type NewsEmbeds = Map<string, Promise<EmbedBuilder>>;

const getNewsEmbed = (embeds: NewsEmbeds, post: SteamNewsPost): Promise<EmbedBuilder> => {
    let embed = embeds.get(post.gid);
    if (!embed) {
        embed = buildNewsEmbed(post);
        embeds.set(post.gid, embed);
    }
    return embed;
};

const postNewsToGuild = async (
    client: Client<true>,
    guildId: string,
    posts: SteamNewsPost[],
    embeds: NewsEmbeds,
): Promise<void> => {
    const channelID = getNewsChannel(guildId);
    if (!channelID) return;

    const channel = await fetchNewsChannel(client, guildId, channelID);
    if (!channel) return;

    const missingPermissions = missingNewsPermissions(channel);
    if (missingPermissions.length > 0) {
        logger.warn(
            `[${guildId}] Missing permissions in news channel ${channelID}: ${missingPermissions.join(', ')}`,
        );
        return;
    }

    const mode = getNewsMode(guildId);
    const roleId = getPingRole(guildId);
    const filteredPosts =
        mode === 'official' ? posts.filter((p) => p.feedname === OFFICIAL_FEED) : posts;

    for (const post of filteredPosts) {
        if (isPostSeen(guildId, post.gid)) continue;

        logger.info(`[${guildId}] Attempting to post: "${post.title}" [${post.gid}]`);
        markPostSeen(guildId, post.gid); // mark first so failed sends don't retry forever

        const embed = await getNewsEmbed(embeds, post);

        try {
            const message = await channel.send({
                ...(roleId ? { content: pingRoleMention(roleId, guildId) } : {}),
                embeds: [embed],
            });
            logger.info(`[${guildId}] Posted: "${post.title}" [${post.gid}]`);

            // Publishing sends the post on to the servers following an announcement channel.
            if (channel instanceof NewsChannel) {
                try {
                    await message.crosspost();
                    logger.info(`[${guildId}] Published: "${post.title}" [${post.gid}]`);
                } catch (error) {
                    const reason =
                        error instanceof Error ? error.message || error.name : String(error);
                    logger.warn(
                        `[${guildId}] Could not publish: "${post.title}" [${post.gid}]: ${reason}`,
                    );
                }
            }

            if (post.feedname === OFFICIAL_FEED) {
                const sections = splitIntoSections(post.contents);
                const thread = await message.startThread({
                    name: post.title.slice(0, 100),
                    autoArchiveDuration: 1440, // 24 hours
                });

                for (const section of sections) {
                    await thread.send(section);
                }

                logger.info(
                    `[${guildId}] Created thread for: "${post.title}" with ${sections.length} section(s)`,
                );
            }
        } catch (error) {
            logger.error(`[${guildId}] Failed to post: "${post.title}" [${post.gid}]`, error);
        }
    }
};

// Set while a poll runs. A poll that starts before the previous one has finished is
// skipped, instead of posting the same posts to the servers the first hasn't reached yet.
let polling = false;

export const poll = async (client: Client<true>): Promise<void> => {
    if (polling) {
        logger.warn('News poll skipped: the previous poll is still running');
        return;
    }
    polling = true;

    try {
        const posts = await fetchDeadlockNews();
        pruneSeenPosts(posts.map((post) => post.gid));
        const embeds: NewsEmbeds = new Map();

        // Each server on its own, so one server's error doesn't stop news for the rest.
        await forEachLimit(client.guilds.cache.values(), MAX_PARALLEL_GUILDS, async (guild) => {
            try {
                await postNewsToGuild(client, guild.id, posts, embeds);
            } catch (error) {
                logger.error(`[${guild.id}] Failed to post news`, error);
            }
        });
    } catch (error) {
        logger.error('News poller failed', error);
    } finally {
        polling = false;
    }
};

export const startNewsPoller = (client: Client<true>): void => {
    logger.info('News poller started, running every 5 minutes');
    poll(client); // Initial run on startup
    cron.schedule('*/5 * * * *', () => void poll(client)); // Schedule every 5 minutes
};
