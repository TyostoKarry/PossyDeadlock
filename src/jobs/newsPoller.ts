import cron from 'node-cron';
import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { fetchDeadlockNews } from '../utils/steamApi.js';
import { getNewsChannel, isPostSeen, markPostSeen } from '../db/database.js';
import { logger } from '../utils/logger.js';

const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return !url.includes(' ') && (parsed.protocol === 'http:' || parsed.protocol === 'https:');
  } catch {
    return false;
  }
};

const stripHtml = (text: string): string => {
  return text
    .replace(/<[^>]*>/g, '') // remove HTML tags
    .replace(/\{STEAM_CLAN_IMAGE\}[^\s]*/g, '') // remove Steam image macros
    .replace(/\[.*?\]/g, '') // remove BBCode tags
    .trim();
};

const poll = async (client: Client<true>): Promise<void> => {
    logger.info('Polling for news...');
    try {
        const posts = await fetchDeadlockNews();

        for (const guild of client.guilds.cache.values()) {
            const channelID = getNewsChannel(guild.id);
            if (!channelID) continue;

            const channel = await client.channels.fetch(channelID);
            if (!(channel instanceof TextChannel)) continue;

            for (const post of posts) {
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

                if (isValidUrl(post.url)) {
                    embed.setURL(post.url);
                }
                
                try {
                    await channel.send({ embeds: [embed] });
                    logger.info(`Posted: "${post.title}" [${post.gid}]`);
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
