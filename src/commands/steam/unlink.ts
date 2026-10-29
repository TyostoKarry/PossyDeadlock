import { MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { deleteSteamLink } from '../../db/database.js';
import { logger } from '../../utils/logger.js';

export const handleUnlink = async (interaction: ChatInputCommandInteraction): Promise<void> => {
    const wasLinked = deleteSteamLink(interaction.user.id);
    if (!wasLinked) {
        await interaction.reply({
            content: "You don't have a linked Steam account.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    logger.info(`[${interaction.guildId}] ${interaction.user.tag} unlinked their Steam account`);
    await interaction.reply({
        content: 'Your Steam account has been unlinked.',
        flags: MessageFlags.Ephemeral,
    });
};
