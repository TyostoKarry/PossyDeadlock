import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
} from 'discord.js';
import { logger } from '../../utils/logger.js';
import { buildGeneralEmbed } from './general.js';
import { buildNewsHelpEmbed } from './news.js';
import { buildHeroesHelpEmbed } from './heroes.js';

const EMBED_BUILDERS: Record<string, () => EmbedBuilder> = {
    heroes: buildHeroesHelpEmbed,
    news: buildNewsHelpEmbed,
};

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show help and command information')
        .addStringOption((option) =>
            option
                .setName('topic')
                .setDescription('Show commands for a specific topic')
                .addChoices({ name: 'Heroes', value: 'heroes' }, { name: 'News', value: 'news' }),
        ),

    execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
        const topic = interaction.options.getString('topic');
        const embedBuilder = topic ? EMBED_BUILDERS[topic] : undefined;
        const embed = embedBuilder ? embedBuilder() : buildGeneralEmbed();

        logger.info(
            `[${interaction.guildId}] ${interaction.user.tag} viewed help (${topic ?? 'general'})`,
        );
        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral,
        });
    },
};
