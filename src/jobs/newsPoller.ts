import cron from 'node-cron';
import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { fetchDeadlockNews, OFFICIAL_FEED, type SteamNewsPost } from '../utils/steamApi.js';
import {
    getNewsChannel,
    getNewsMode,
    getPingRole,
    isPostSeen,
    markPostSeen,
} from '../db/database.js';
import { logger } from '../utils/logger.js';
import {
    encodePostUrl,
    extractNewsImageUrl,
    fetchNewsOgImageUrl,
    splitIntoSections,
    stripHtml,
} from '../utils/formatUtils.js';
import { missingNewsPermissions } from '../utils/newsPermissions.js';

const fetchNewsChannel = async (
    client: Client<true>,
    guildId: string,
    channelID: string,
): Promise<TextChannel | null> => {
    try {
        const channel =
            client.channels.cache.get(channelID) ?? (await client.channels.fetch(channelID));
        return channel instanceof TextChannel ? channel : null;
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        logger.warn(`[${guildId}] Could not fetch news channel ${channelID}: ${reason}`);
        return null;
    }
};

const postNewsToGuild = async (
    client: Client<true>,
    guildId: string,
    posts: SteamNewsPost[],
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

        try {
            const message = await channel.send({
                ...(roleId ? { content: `<@&${roleId}>` } : {}),
                embeds: [embed],
            });
            logger.info(`[${guildId}] Posted: "${post.title}" [${post.gid}]`);

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

export const poll = async (client: Client<true>): Promise<void> => {
    try {
        const posts = await fetchDeadlockNews();

        // Each server on its own, so one server's error doesn't stop news for the rest.
        for (const guild of client.guilds.cache.values()) {
            try {
                await postNewsToGuild(client, guild.id, posts);
            } catch (error) {
                logger.error(`[${guild.id}] Failed to post news`, error);
            }
        }
    } catch (error) {
        logger.error('News poller failed', error);
    }
};

export const startNewsPoller = (client: Client<true>): void => {
    logger.info('News poller started, running every 5 minutes');
    poll(client); // Initial run on startup
    cron.schedule('*/5 * * * *', () => void poll(client)); // Schedule every 5 minutes
};
