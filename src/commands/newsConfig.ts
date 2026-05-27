import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getNewsChannel, getNewsMode, getPingRole } from '../db/database.js';
import { logger } from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('news-config')
        .setDescription('Show the current Deadlock news configuration')
        .setDefaultMemberPermissions(null),

    execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
        const guildId = interaction.guildId!;
        const channelId = getNewsChannel(guildId);
        const mode = getNewsMode(guildId);
        const roleId = getPingRole(guildId);

        const embed = new EmbedBuilder()
            .setTitle('Deadlock News config')
            .setColor(0x00b4d8)
            .addFields(
                {
                    name: 'News Channel',
                    value: channelId ? `<#${channelId}>` : 'Not set — use `/set-news-channel`',
                    inline: false,
                },
                {
                    name: 'News Mode',
                    value:
                        mode === 'official'
                            ? 'Official only (Valve patch notes)'
                            : 'All (includes third party articles)',
                    inline: false,
                },
                {
                    name: 'Ping Role',
                    value: roleId ? `<@&${roleId}>` : 'None',
                    inline: false,
                },
            );

        logger.info(`[${guildId}] ${interaction.user.tag} checked news config`);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
