import { EmbedBuilder } from 'discord.js';

export const buildDeadlockApiHelpEmbed = (): EmbedBuilder =>
    new EmbedBuilder()
        .setTitle('About deadlock-api.com')
        .setDescription(
            '[deadlock-api.com](https://deadlock-api.com) is a free, open-source analytics platform for Deadlock.',
        )
        .setColor(0x00b4d8)
        .addFields(
            {
                name: 'How It Gets Data',
                value: "Collects publicly available match data via Valve's game client APIs from millions of matches — no manual submissions needed.",
            },
            {
                name: 'Used by PossyDeadlock',
                value: 'Currently powers `/heroes` — win rates, pick rates, matchups, and synergies, refreshed daily from Phantom 1+ ranked matches.',
            },
        );
