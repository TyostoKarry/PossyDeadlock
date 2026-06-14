import { EmbedBuilder } from 'discord.js';

export const buildGeneralEmbed = (): EmbedBuilder =>
    new EmbedBuilder()
        .setTitle('PossyDeadlock Help')
        .setDescription('A Discord bot for Deadlock — news, patch notes, and hero analytics.')
        .setColor(0x00b4d8)
        .addFields(
            {
                name: 'Data Sources',
                value: '- Steam News API — news and patch notes\n- [deadlock-api.com](https://deadlock-api.com) — hero stats',
            },
            {
                name: 'Command Groups',
                value: '- **News** — patch notes & config (Manage Server)\n- **Heroes** — hero stats, matchups, and lookups',
            },
        )
        .setFooter({ text: 'Use /help <topic> to see more about a specific topic.' });
