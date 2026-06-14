import {
    ActionRowBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    StringSelectMenuOptionBuilder,
} from 'discord.js';
import { logger } from '../../utils/logger.js';
import { buildGeneralEmbed } from './general.js';
import { buildNewsHelpEmbed } from './news.js';
import { buildHeroesHelpEmbed } from './heroes.js';
import { buildDeadlockApiHelpEmbed } from './deadlockApi.js';

const TOPIC_SELECT_ID = 'help:topic';

const EMBED_BUILDERS: Record<string, () => EmbedBuilder> = {
    general: buildGeneralEmbed,
    'deadlock-api': buildDeadlockApiHelpEmbed,
    heroes: buildHeroesHelpEmbed,
    news: buildNewsHelpEmbed,
};

const TOPIC_OPTIONS = [
    { name: 'General', value: 'general' },
    { name: 'Deadlock API', value: 'deadlock-api' },
    { name: 'Heroes', value: 'heroes' },
    { name: 'News', value: 'news' },
];

const buildTopicSelectRow = (selected: string): ActionRowBuilder<StringSelectMenuBuilder> =>
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(TOPIC_SELECT_ID)
            .setPlaceholder('Select a topic')
            .addOptions(
                TOPIC_OPTIONS.map((topicOption) =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(topicOption.name)
                        .setValue(topicOption.value)
                        .setDefault(topicOption.value === selected),
                ),
            ),
    );

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show help and command information')
        .addStringOption((option) =>
            option
                .setName('topic')
                .setDescription('Show commands for a specific topic')
                .addChoices(...TOPIC_OPTIONS),
        ),

    execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
        const topic = interaction.options.getString('topic') ?? 'general';
        const embedBuilder = EMBED_BUILDERS[topic] ?? buildGeneralEmbed;

        logger.info(`[${interaction.guildId}] ${interaction.user.tag} viewed help (${topic})`);
        await interaction.reply({
            embeds: [embedBuilder()],
            components: [buildTopicSelectRow(topic)],
            flags: MessageFlags.Ephemeral,
        });
    },

    handleSelectMenu: async (interaction: StringSelectMenuInteraction): Promise<void> => {
        const topic = interaction.values[0] ?? 'general';
        const embedBuilder = EMBED_BUILDERS[topic] ?? buildGeneralEmbed;

        await interaction.update({
            embeds: [embedBuilder()],
            components: [buildTopicSelectRow(topic)],
        });
    },
};
