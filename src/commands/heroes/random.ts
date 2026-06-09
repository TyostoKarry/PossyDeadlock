import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Hero } from '../../types/heroes.js';
import { formatRelativeTime } from '../../utils/formatUtils.js';
import { getRandomHero } from '../../db/database.js';
import { logger } from '../../utils/logger.js';

const REROLL_PREFIX = 'heroes:reroll';
const NO_DATA_MESSAGE = 'No hero data available. Please try again later.';

const buildRandomEmbed = (hero: Hero): EmbedBuilder =>
    new EmbedBuilder()
        .setTitle(hero.name)
        .setThumbnail(hero.image_url)
        .setColor(0x00b4d8)
        .addFields(
            { name: 'Win Rate', value: hero.win_rate !== null ? `${(hero.win_rate * 100).toFixed(1)}%` : 'N/A', inline: true },
            { name: 'Pick Rate', value: hero.pick_rate !== null ? `${(hero.pick_rate * 100).toFixed(1)}%` : 'N/A', inline: true },
        )
        .setFooter({ text: `Last updated ${formatRelativeTime(hero.updated_at)} • deadlock-api.com` });

const buildRerollButton = (userId: string): ActionRowBuilder<ButtonBuilder> => 
    new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`${REROLL_PREFIX}:${userId}`)
            .setLabel('Re-roll')
            .setEmoji('🎲')
            .setStyle(ButtonStyle.Primary),
    );

export const handleRandom = async (interaction: ChatInputCommandInteraction): Promise<void> => {
    const hero = getRandomHero();
    if (!hero) {
        await interaction.reply({ content: NO_DATA_MESSAGE, flags: MessageFlags.Ephemeral });
        return;
    }

    logger.info(`[${interaction.guildId}] ${interaction.user.tag} requested a random hero`);
    await interaction.reply({
        embeds: [buildRandomEmbed(hero)],
        components: [buildRerollButton(interaction.user.id)],
    });
};

export const handleRandomReroll = async (interaction: ButtonInteraction): Promise<void> => {
    const [, , userId] = interaction.customId.split(':');
    if (interaction.user.id !== userId) {
        await interaction.reply({
            content: 'Only the person who ran this command can re-roll.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const hero = getRandomHero();
    if (!hero) {
        await interaction.reply({ content: NO_DATA_MESSAGE, flags: MessageFlags.Ephemeral });
        return;
    }

    await interaction.update({
        embeds: [buildRandomEmbed(hero)],
        components: [buildRerollButton(userId)],
    });
};
