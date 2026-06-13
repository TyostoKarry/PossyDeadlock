import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
} from 'discord.js';
import type { Hero } from '../../types/heroes.js';
import { getAllHeroes } from '../../db/database.js';
import { formatRelativeTime } from '../../utils/formatUtils.js';
import { logger } from '../../utils/logger.js';

const LIST_PREFIX = 'heroes:list';
const NO_DATA_MESSAGE = 'No hero data available. Please try again later.';

const SORT_LABELS: Record<string, string> = {
    name: 'Name',
    win_rate: 'Win Rate',
    pick_rate: 'Pick Rate',
};

const DEFAULT_DIRECTIONS: Record<string, string> = {
    name: 'asc',
    win_rate: 'desc',
    pick_rate: 'desc',
};

const ARROWS: Record<string, string> = {
    asc: ' ▲',
    desc: ' ▼',
};

const sortHeroes = (heroes: Hero[], sort: string, direction: string): Hero[] => {
    const sorted = [...heroes];
    const factor = direction === 'asc' ? 1 : -1;

    if (sort === 'win_rate')
        sorted.sort((a, b) => factor * ((a.win_rate ?? -1) - (b.win_rate ?? -1)));
    else if (sort === 'pick_rate')
        sorted.sort((a, b) => factor * ((a.pick_rate ?? -1) - (b.pick_rate ?? -1)));
    else sorted.sort((a, b) => factor * a.name.localeCompare(b.name));

    return sorted;
};

const formatRate = (rate: number | null): string =>
    rate !== null ? `${(rate * 100).toFixed(1)}%` : 'N/A';

const buildListEmbed = (sort: string, direction: string): EmbedBuilder => {
    const heroes = sortHeroes(getAllHeroes(), sort, direction);
    const directionString = direction === 'asc' ? 'ascending' : 'descending';

    return new EmbedBuilder()
        .setTitle('Deadlock Heroes')
        .setDescription(
            `_Data from Phantom 1+ ranked matches_\n_Sorted by ${SORT_LABELS[sort] ?? 'Name'} (${directionString})_`,
        )
        .setColor(0x00b4d8)
        .addFields(
            { name: 'Hero', value: heroes.map((hero) => hero.name).join('\n'), inline: true },
            {
                name: 'Win Rate',
                value: heroes.map((hero) => formatRate(hero.win_rate)).join('\n'),
                inline: true,
            },
            {
                name: 'Pick Rate',
                value: heroes.map((hero) => formatRate(hero.pick_rate)).join('\n'),
                inline: true,
            },
        )
        .setFooter({
            text: `Last updated ${formatRelativeTime(heroes[0]?.updated_at ?? '')} • deadlock-api.com`,
        });
};

const buildSortButton = (
    field: string,
    label: string,
    sort: string,
    direction: string,
): ButtonBuilder => {
    const isActive = field === sort;
    const nextDirection = isActive
        ? direction === 'asc'
            ? 'desc'
            : 'asc'
        : (DEFAULT_DIRECTIONS[field] ?? 'asc');

    return new ButtonBuilder()
        .setCustomId(`${LIST_PREFIX}:${field}:${nextDirection}`)
        .setLabel(isActive ? `${label}${ARROWS[direction] ?? ''}` : label)
        .setStyle(isActive ? ButtonStyle.Primary : ButtonStyle.Secondary);
};

const buildSortRow = (sort: string, direction: string): ActionRowBuilder<ButtonBuilder> =>
    new ActionRowBuilder<ButtonBuilder>().addComponents(
        buildSortButton('name', 'Name', sort, direction),
        buildSortButton('win_rate', 'Win Rate', sort, direction),
        buildSortButton('pick_rate', 'Pick Rate', sort, direction),
    );

export const handleList = async (interaction: ChatInputCommandInteraction): Promise<void> => {
    const sort = interaction.options.getString('sort') ?? 'name';
    const direction = DEFAULT_DIRECTIONS[sort] ?? 'asc';

    if (getAllHeroes().length === 0) {
        await interaction.reply({ content: NO_DATA_MESSAGE, flags: MessageFlags.Ephemeral });
        return;
    }

    logger.info(
        `[${interaction.guildId}] ${interaction.user.tag} listed heroes sorted by ${sort} (${direction})`,
    );
    await interaction.reply({
        embeds: [buildListEmbed(sort, direction)],
        components: [buildSortRow(sort, direction)],
    });
};

export const handleListSort = async (interaction: ButtonInteraction): Promise<void> => {
    const [, , sort = 'name', direction = 'asc'] = interaction.customId.split(':');

    await interaction.update({
        embeds: [buildListEmbed(sort, direction)],
        components: [buildSortRow(sort, direction)],
    });
};
