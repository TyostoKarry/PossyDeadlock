import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { buildGeneralEmbed } from './general.js';

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show help and command information'),

    execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
        logger.info(`[${interaction.guildId}] ${interaction.user.tag} viewed help`);
        await interaction.reply({
            embeds: [buildGeneralEmbed()],
            flags: MessageFlags.Ephemeral,
        });
    },
};
