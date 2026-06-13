import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { getNewsChannel, setNewsMode } from '../../db/database.js';
import { logger } from '../../utils/logger.js';

export const handleSetMode = async (interaction: ChatInputCommandInteraction): Promise<void> => {
    const channelID = getNewsChannel(interaction.guildId!);
    if (!channelID) {
        await interaction.reply({
            content: 'Please set a news channel first with `/news set-channel`.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const mode = interaction.options.getString('mode', true);
    setNewsMode(interaction.guildId!, mode);
    logger.info(`[${interaction.guildId}] ${interaction.user.tag} set news mode to '${mode}'`);

    const label =
        mode === 'official'
            ? 'Official Valve patch notes only'
            : 'All news including third party articles';

    await interaction.reply({
        content: `News mode set to: **${label}**`,
        flags: MessageFlags.Ephemeral,
    });
};
