import {
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    Role,
    SlashCommandBuilder,
} from 'discord.js';
import { getNewsChannel, setPingRole } from '../db/database.js';
import { logger } from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('set-news-ping-role')
        .setDescription('Set a role to ping when new Deadlock news is posted')
        .addRoleOption((option) =>
            option
                .setName('role')
                .setDescription('Role to ping — leave empty to clear')
                .setRequired(false),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
        const channelId = getNewsChannel(interaction.guildId!);
        if (!channelId) {
            await interaction.reply({
                content: 'Please set a news channel first with `/set-news-channel`.',
                ephemeral: true,
            });
            return;
        }

        const role = interaction.options.getRole('role');

        if (!role) {
            setPingRole(interaction.guildId!, null);
            logger.info(`[${interaction.guildId}] ${interaction.user.tag} cleared ping role`);
            await interaction.reply({
                content: 'Ping role cleared — no role will be pinged on new posts.',
                ephemeral: true,
            });
            return;
        }

        if (!(role instanceof Role)) {
            await interaction.reply({
                content: 'Please select a valid role.',
                ephemeral: true,
            });
            return;
        }

        setPingRole(interaction.guildId!, role.id);
        logger.info(
            `[${interaction.guildId}] ${interaction.user.tag} set ping role to @${role.name}`,
        );

        await interaction.reply({
            content: `<@&${role.id}> will now be pinged when new Deadlock news is posted.`,
            ephemeral: true,
        });
    },
};
