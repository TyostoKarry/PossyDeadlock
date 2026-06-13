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
const PAGE_SIZE = 15;
const FIRST_PAGE = 0;

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

const formatHeroLine = (hero: Hero, nameWidth: number): string =>
    `\`${hero.name.padEnd(nameWidth)}\` — ${formatRate(hero.win_rate)} · ${formatRate(hero.pick_rate)}`;

const buildListEmbed = (sort: string, direction: string, page: number): EmbedBuilder => {
    const heroes = sortHeroes(getAllHeroes(), sort, direction);
    const directionString = direction === 'asc' ? 'ascending' : 'descending';
    const nameWidth = Math.max(...heroes.map((hero) => hero.name.length));
    const pageHeroes = heroes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const header = '**Hero** — **Win Rate** · **Pick Rate**';
    const list = pageHeroes.map((hero) => formatHeroLine(hero, nameWidth)).join('\n');

    return new EmbedBuilder()
        .setTitle('Deadlock Heroes')
        .setDescription(
            `_Data from Phantom 1+ ranked matches_\n_Sorted by ${SORT_LABELS[sort] ?? 'Name'} (${directionString})_\n\n${header}\n${list}`,
        )
        .setColor(0x00b4d8)
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
        .setCustomId(`${LIST_PREFIX}:${field}:${nextDirection}:${FIRST_PAGE}`)
        .setLabel(isActive ? `${label}${ARROWS[direction] ?? ''}` : label)
        .setStyle(isActive ? ButtonStyle.Primary : ButtonStyle.Secondary);
};

const buildSortRow = (sort: string, direction: string): ActionRowBuilder<ButtonBuilder> =>
    new ActionRowBuilder<ButtonBuilder>().addComponents(
        buildSortButton('name', 'Name', sort, direction),
        buildSortButton('win_rate', 'Win Rate', sort, direction),
        buildSortButton('pick_rate', 'Pick Rate', sort, direction),
    );

const buildPaginationRow = (
    sort: string,
    direction: string,
    page: number,
    totalPages: number,
): ActionRowBuilder<ButtonBuilder> =>
    new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`${LIST_PREFIX}:${sort}:${direction}:${page - 1}`)
            .setLabel('◀')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= FIRST_PAGE),
        new ButtonBuilder()
            .setCustomId(`${LIST_PREFIX}:page`)
            .setLabel(`Page ${page + 1}/${totalPages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(`${LIST_PREFIX}:${sort}:${direction}:${page + 1}`)
            .setLabel('▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1),
    );

export const handleList = async (interaction: ChatInputCommandInteraction): Promise<void> => {
    const sort = interaction.options.getString('sort') ?? 'name';
    const direction = DEFAULT_DIRECTIONS[sort] ?? 'asc';
    const page = FIRST_PAGE;

    if (getAllHeroes().length === 0) {
        await interaction.reply({ content: NO_DATA_MESSAGE, flags: MessageFlags.Ephemeral });
        return;
    }

    const totalPages = Math.ceil(getAllHeroes().length / PAGE_SIZE);

    logger.info(
        `[${interaction.guildId}] ${interaction.user.tag} listed heroes sorted by ${sort} (${direction})`,
    );
    await interaction.reply({
        embeds: [buildListEmbed(sort, direction, page)],
        components: [
            buildSortRow(sort, direction),
            buildPaginationRow(sort, direction, page, totalPages),
        ],
    });
};

export const handleListSort = async (interaction: ButtonInteraction): Promise<void> => {
    const [, , sort = 'name', direction = 'asc', pageStr = '0'] = interaction.customId.split(':');
    const totalPages = Math.ceil(getAllHeroes().length / PAGE_SIZE);
    const page = Math.min(Math.max(Number(pageStr) || 0, 0), totalPages - 1);

    await interaction.update({
        embeds: [buildListEmbed(sort, direction, page)],
        components: [
            buildSortRow(sort, direction),
            buildPaginationRow(sort, direction, page, totalPages),
        ],
    });
};
