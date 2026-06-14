import cron from 'node-cron';
import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { fetchDeadlockNews, OFFICIAL_FEED } from '../utils/steamApi.js';
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

const poll = async (client: Client<true>): Promise<void> => {
    logger.info('Polling for news...');
    try {
        const posts = await fetchDeadlockNews();

        for (const guild of client.guilds.cache.values()) {
            const channelID = getNewsChannel(guild.id);
            if (!channelID) continue;

            const channel =
                client.channels.cache.get(channelID) ?? (await client.channels.fetch(channelID));
            if (!(channel instanceof TextChannel)) continue;

            const mode = getNewsMode(guild.id);
            const roleId = getPingRole(guild.id);
            const filteredPosts =
                mode === 'official' ? posts.filter((p) => p.feedname === OFFICIAL_FEED) : posts;

            for (const post of filteredPosts) {
                if (isPostSeen(post.gid)) continue;

                logger.info(`Attempting to post: "${post.title}" [${post.gid}]`);
                markPostSeen(post.gid); // mark first so failed sends don't retry forever

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
                    extractNewsImageUrl(post.contents) ??
                    (url ? await fetchNewsOgImageUrl(url) : null);
                if (imageUrl) embed.setImage(imageUrl);

                try {
                    const message = await channel.send({
                        ...(roleId ? { content: `<@&${roleId}>` } : {}),
                        embeds: [embed],
                    });
                    logger.info(`Posted: "${post.title}" [${post.gid}]`);

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
                            `Created thread for: "${post.title}" with ${sections.length} section(s)`,
                        );
                    }
                } catch (error) {
                    logger.error(`Failed to post: "${post.title}" [${post.gid}]`, error);
                }
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
