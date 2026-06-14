import { EmbedBuilder } from 'discord.js';

export const buildHeroesHelpEmbed = (): EmbedBuilder =>
    new EmbedBuilder()
        .setTitle('/heroes Commands')
        .setDescription('Hero data from [deadlock-api.com](https://deadlock-api.com).')
        .setColor(0x00b4d8)
        .addFields(
            {
                name: '/heroes stats <hero>',
                value: 'Show base stats and performance for a specific hero.',
            },
            {
                name: '/heroes matchup <hero>',
                value: 'Show best/worst synergies and counters for a specific hero.',
            },
            {
                name: '/heroes list [sort]',
                value: 'List all heroes with their win rate and pick rate. Sortable, 15 per page.',
            },
            {
                name: '/heroes random',
                value: 'Show a random hero with its win rate and pick rate, plus a re-roll button.',
            },
        )
        .setFooter({ text: 'Hero data refreshed daily • Phantom 1+ ranked matches' });
