import { EmbedBuilder } from 'discord.js';

export const buildSteamHelpEmbed = (): EmbedBuilder =>
    new EmbedBuilder()
        .setTitle('/steam Commands')
        .setDescription(
            'Link your Steam account to your Discord account. All replies are only visible to you.',
        )
        .setColor(0x00b4d8)
        .addFields(
            {
                name: '/steam link <steam>',
                value: 'Link your Steam account using your account ID, SteamID64, or a `steamcommunity.com/profiles/…` link.',
            },
            {
                name: '/steam unlink',
                value: 'Remove your linked Steam account.',
            },
            {
                name: '/steam show',
                value: 'Show your linked Steam account.',
            },
            {
                name: '/steam list-linked',
                value: 'List members of this server who have linked a Steam account.',
            },
        );
