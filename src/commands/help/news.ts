import { EmbedBuilder } from 'discord.js';

export const buildNewsHelpEmbed = (): EmbedBuilder =>
    new EmbedBuilder()
        .setTitle('/news Commands')
        .setDescription('Requires **Manage Server** permission.')
        .setColor(0x00b4d8)
        .addFields(
            {
                name: '/news set-channel [channel]',
                value: 'Set the channel for news posts. Leave empty to disable.',
            },
            {
                name: '/news set-mode <mode>',
                value: '`official` (default) — Valve patch notes only\n`all` — includes third-party articles too',
            },
            {
                name: '/news set-ping-role [role]',
                value: 'Set a role to ping on new posts. Leave empty to clear.',
            },
            {
                name: '/news config',
                value: 'Show the current news configuration for this server.',
            },
            {
                name: '/news last-post',
                value: 'Show the most recent news post based on the current news mode.',
            },
        );
