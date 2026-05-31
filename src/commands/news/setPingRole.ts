import { ChatInputCommandInteraction, MessageFlags, Role } from 'discord.js';
import { getNewsChannel, setPingRole } from '../../db/database.js';
import { logger } from '../../utils/logger.js';

export const handleSetPingRole = async (
    interaction: ChatInputCommandInteraction,
): Promise<void> => {
    const channelId = getNewsChannel(interaction.guildId!);
    if (!channelId) {
        await interaction.reply({
            content: 'Please set a news channel first with `/news set-channel`.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const role = interaction.options.getRole('role');

    if (!role) {
        setPingRole(interaction.guildId!, null);
        logger.info(`[${interaction.guildId}] ${interaction.user.tag} cleared ping role`);
        await interaction.reply({
            content: 'Ping role cleared — no role will be pinged on new posts.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (!(role instanceof Role)) {
        await interaction.reply({
            content: 'Please select a valid role.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    setPingRole(interaction.guildId!, role.id);
    logger.info(
        `[${interaction.guildId}] ${interaction.user.tag} set ping role to @${role.name}`,
    );

    await interaction.reply({
        content: `<@&${role.id}> will now be pinged when new Deadlock news is posted.`,
        flags: MessageFlags.Ephemeral,
    });
}