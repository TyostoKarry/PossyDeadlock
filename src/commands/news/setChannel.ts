import { ChatInputCommandInteraction, MessageFlags, TextChannel } from 'discord.js';
import { clearNewsChannel, setNewsChannel } from '../../db/database.js';
import { logger } from '../../utils/logger.js';

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

    setNewsChannel(interaction.guildId!, channel.id);
    logger.info(
        `[${interaction.guildId}] ${interaction.user.tag} set news channel to #${channel.name}`,
    );
    await interaction.reply({
        content: `Deadlock news will now be posted in <#${channel.id}>`,
        flags: MessageFlags.Ephemeral,
    });
};
