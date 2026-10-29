import { EmbedBuilder, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { getSteamLink } from '../../db/database.js';
import { buildSteamProfileUrl, toSteamId64 } from '../../utils/steamId.js';
import { logger } from '../../utils/logger.js';

export const handleShow = async (interaction: ChatInputCommandInteraction): Promise<void> => {
    const accountId = getSteamLink(interaction.user.id);
    if (accountId === null) {
        await interaction.reply({
            content: "You don't have a linked Steam account. Use `/steam link` to link one.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('Linked Steam account')
        .setURL(buildSteamProfileUrl(accountId))
        .setColor(0x00b4d8)
        .addFields(
            { name: 'Account ID', value: `\`${accountId}\``, inline: true },
            { name: 'SteamID64', value: `\`${toSteamId64(accountId)}\``, inline: true },
        );

    logger.info(`[${interaction.guildId}] ${interaction.user.tag} viewed their Steam link`);
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
};
