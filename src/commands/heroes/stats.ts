import { EmbedBuilder, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { getHeroById, getHeroByName, getHeroMatchups } from '../../db/database.js';
import type { Hero, HeroMatchup } from '../../types/heroes.js';
import { formatRelativeTime } from '../../utils/formatUtils.js';
import { logger } from '../../utils/logger.js';

const formatComplexity = (level: number): string => '●'.repeat(level) + '○'.repeat(4 - level);

const formatBaseStats = (hero: Hero): string => {
    const hp =
        hero.base_hp !== null
            ? `HP: ${hero.base_hp}${hero.hp_per_boon !== null ? ` (+${hero.hp_per_boon}/boon)` : ''}`
            : 'HP: N/A';
    const moveSpeed =
        hero.move_speed !== null ? `Move Speed: ${hero.move_speed}m/s` : 'Move Speed: N/A';
    const sprintSpeed =
        hero.sprint_speed !== null ? `Sprint Speed: ${hero.sprint_speed}m/s` : 'Sprint Speed: N/A';
    const stamina = hero.stamina !== null ? `Stamina: ${hero.stamina}` : 'Stamina: N/A';
    return [hp, moveSpeed, sprintSpeed, stamina].join('\n');
};

const formatPerformance = (hero: Hero): string => {
    const winRate = hero.win_rate !== null ? `${(hero.win_rate * 100).toFixed(1)}%` : 'N/A';
    const pickRate = hero.pick_rate !== null ? `${(hero.pick_rate * 100).toFixed(1)}%` : 'N/A';
    const matches = hero.matches !== null ? hero.matches.toLocaleString('en-US') : 'N/A';
    return `Win Rate: ${winRate} • Pick Rate: ${pickRate}\nMatches: ${matches}\n_Data from Phantom 1+ ranked matches_`;
};

const formatMatchupEntry = (matchup: HeroMatchup): string => {
    const name = getHeroById(matchup.enemy_id)?.name ?? 'Unknown';
    const winRate = matchup.win_rate !== null ? `${(matchup.win_rate * 100).toFixed(1)}%` : 'N/A';
    return `${name} — ${winRate}`;
};

export const handleStats = async (interaction: ChatInputCommandInteraction): Promise<void> => {
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

    const typeAndComplexity = [
        hero.hero_type ? hero.hero_type.charAt(0).toUpperCase() + hero.hero_type.slice(1) : null,
        hero.complexity !== null ? formatComplexity(hero.complexity) : null,
    ].filter((p): p is string => p !== null);

    const embed = new EmbedBuilder()
        .setTitle(hero.name)
        .setDescription(typeAndComplexity.length > 0 ? typeAndComplexity.join(' • ') : null)
        .setThumbnail(hero.image_url)
        .setColor(0x00b4d8)
        .addFields(
            { name: 'Base Stats', value: formatBaseStats(hero), inline: false },
            { name: 'Performance', value: formatPerformance(hero), inline: false },
        );

    if (matchups.length > 0) {
        const bestMatchups = matchups.slice(0, 3);
        const worstMatchups = [...matchups].reverse().slice(0, 3);

        embed.addFields(
            {
                name: 'Best Against',
                value: bestMatchups.map(formatMatchupEntry).join('\n'),
                inline: true,
            },
            {
                name: 'Worst Against',
                value: worstMatchups.map(formatMatchupEntry).join('\n'),
                inline: true,
            },
        );
    }

    embed.setFooter({
        text: `Last updated ${formatRelativeTime(hero.updated_at)} • deadlock-api.com`,
    });

    logger.info(`[${interaction.guildId}] ${interaction.user.tag} viewed stats for ${hero.name}`);
    await interaction.reply({ embeds: [embed] });
};
