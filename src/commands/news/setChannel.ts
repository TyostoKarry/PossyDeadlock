import { ChatInputCommandInteraction, MessageFlags, TextChannel } from 'discord.js';
import {
    clearNewsChannel,
    getNewsChannel,
    markPostSeen,
    setNewsChannel,
} from '../../db/database.js';
import { logger } from '../../utils/logger.js';
import { fetchDeadlockNews } from '../../utils/steamApi.js';

export const handleSetChannel = async (interaction: ChatInputCommandInteraction): Promise<void> => {
    const channel = interaction.options.getChannel('channel');

    if (!channel) {
        clearNewsChannel(interaction.guildId!);
        logger.info(`[${interaction.guildId}] ${interaction.user.tag} cleared news channel`);
        await interaction.reply({
            content: 'News channel cleared — bot will no longer post Deadlock news.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (!(channel instanceof TextChannel)) {
        await interaction.reply({
            content: 'Please select a text channel.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // First-time setup: skip the existing feed so the first poll doesn't post a backlog
    if (!getNewsChannel(interaction.guildId!)) {
        try {
            const posts = await fetchDeadlockNews();
            for (const post of posts) markPostSeen(interaction.guildId!, post.gid);
        } catch (error) {
            logger.error(`[${interaction.guildId}] Failed to skip existing news feed`, error);
        }
    }

    setNewsChannel(interaction.guildId!, channel.id);
    logger.info(
        `[${interaction.guildId}] ${interaction.user.tag} set news channel to #${channel.name}`,
    );
    await interaction.reply({
        content: `Deadlock news will now be posted in <#${channel.id}>`,
        flags: MessageFlags.Ephemeral,
    });
};
