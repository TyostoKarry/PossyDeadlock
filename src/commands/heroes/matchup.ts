import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import {
    getHeroById,
    getHeroByName,
    getHeroMatchups,
    getHeroSynergies,
} from '../../db/database.js';
import { formatRelativeTime } from '../../utils/formatUtils.js';
import { logger } from '../../utils/logger.js';

const formatEntry = (
    otherHeroId: number,
    winRate: number | null,
    matches: number | null,
): string => {
    const name = getHeroById(otherHeroId)?.name ?? 'Unknown';
    const wr = winRate !== null ? `**${(winRate * 100).toFixed(1)}%**` : 'N/A';
    const m = matches !== null ? matches.toLocaleString('en-US') : 'N/A';
    return `${name} — ${wr} (${m})`;
};

export const handleMatchup = async (interaction: ChatInputCommandInteraction): Promise<void> => {
    const heroName = interaction.options.getString('hero', true);
    const hero = getHeroByName(heroName);

    if (!hero) {
        await interaction.reply({
            content: `Hero **${heroName}** not found. Try using the autocomplete suggestions.`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const matchups = getHeroMatchups(hero.id);
    const synergies = getHeroSynergies(hero.id);

    const embed = new EmbedBuilder()
        .setTitle(hero.name)
        .setDescription('_Data from Phantom 1+ ranked matches_')
        .setThumbnail(hero.image_url)
        .setColor(0x00b4d8);

    if (synergies.length > 0) {
        const bestWith = synergies.slice(0, 5);
        const worstWith = [...synergies].reverse().slice(0, 5);

        embed.addFields(
            {
                name: 'Best With',
                value: bestWith
                    .map((s) => formatEntry(s.ally_id, s.win_rate, s.matches))
                    .join('\n'),
                inline: true,
            },
            { name: '\u200b', value: '\u200b', inline: true },
            {
                name: 'Worst With',
                value: worstWith
                    .map((s) => formatEntry(s.ally_id, s.win_rate, s.matches))
                    .join('\n'),
                inline: true,
            },
        );
    }

    if (matchups.length > 0) {
        const bestAgainst = matchups.slice(0, 5);
        const worstAgainst = [...matchups].reverse().slice(0, 5);

        embed.addFields(
            {
                name: 'Best Against',
                value: bestAgainst
                    .map((m) => formatEntry(m.enemy_id, m.win_rate, m.matches))
                    .join('\n'),
                inline: true,
            },
            { name: '\u200b', value: '\u200b', inline: true },
            {
                name: 'Worst Against',
                value: worstAgainst
                    .map((m) => formatEntry(m.enemy_id, m.win_rate, m.matches))
                    .join('\n'),
                inline: true,
            },
        );
    }

    if (synergies.length === 0 && matchups.length === 0) {
        embed.setDescription('No matchup data available yet.');
    }

    embed.setFooter({
        text: `Last updated ${formatRelativeTime(hero.updated_at)} • deadlock-api.com`,
    });

    logger.info(
        `[${interaction.guildId}] ${interaction.user.tag} viewed matchups for ${hero.name}`,
    );
    await interaction.reply({ embeds: [embed] });
};
