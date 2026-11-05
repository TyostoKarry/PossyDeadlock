import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { getNewsChannel, getNewsMode, getPingRole } from '../../db/database.js';
import { logger } from '../../utils/logger.js';
import { isNewsPostChannel, missingNewsPermissions } from '../../utils/newsPermissions.js';
import { pingRoleMention } from '../../utils/formatUtils.js';

const describePermissions = (
    interaction: ChatInputCommandInteraction,
    channelId: string,
): string => {
    const channel = interaction.guild?.channels.cache.get(channelId);
    if (!isNewsPostChannel(channel)) {
        return 'Channel not found — use `/news set-channel` to pick another';
    }
    const missingPermissions = missingNewsPermissions(channel);
    return missingPermissions.length > 0 ? `Missing: ${missingPermissions.join(', ')}` : 'All set';
};

export const handleConfig = async (interaction: ChatInputCommandInteraction): Promise<void> => {
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
                value: channelId ? `<#${channelId}>` : 'Not set — use `/news set-channel`',
                inline: false,
            },
            ...(channelId
                ? [
                      {
                          name: 'Permissions',
                          value: describePermissions(interaction, channelId),
                          inline: false,
                      },
                  ]
                : []),
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
                value: roleId ? pingRoleMention(roleId, guildId) : 'None',
                inline: false,
            },
        );

    logger.info(`[${guildId}] ${interaction.user.tag} checked news config`);
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
};
