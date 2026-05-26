import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { getNewsChannel, setNewsMode } from '../db/database.js';
import { logger } from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('set-news-mode')
        .setDescription('Set the type of Deadlock news to post')
        .addStringOption((option) =>
            option
                .setName('mode')
                .setDescription('News mode')
                .setRequired(true)
                .addChoices(
                    { name: 'Official only (Valve patch notes)', value: 'official' },
                    { name: 'All (includes third party articles)', value: 'all' },
                ),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
        const channelID = getNewsChannel(interaction.guildId!);
        if (!channelID) {
            await interaction.reply({
                content: 'Please set a news channel first with `/set-news-channel`.',
                ephemeral: true,
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
            ephemeral: true,
        });
    },
};
