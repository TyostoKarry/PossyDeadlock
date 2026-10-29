import {
    ChatInputCommandInteraction,
    InteractionContextType,
    SlashCommandBuilder,
} from 'discord.js';
import { handleLink } from './link.js';
import { handleUnlink } from './unlink.js';
import { handleShow } from './show.js';

export default {
    data: new SlashCommandBuilder()
        .setName('steam')
        .setDescription('Link your Steam account to your Discord account')
        .setContexts(InteractionContextType.Guild)
        .addSubcommand((sub) =>
            sub
                .setName('link')
                .setDescription('Link your Steam account')
                .addStringOption((option) =>
                    option
                        .setName('steam')
                        .setDescription(
                            'Your Steam account ID, SteamID64, or steamcommunity.com/profiles/ link',
                        )
                        .setRequired(true),
                ),
        )
        .addSubcommand((sub) =>
            sub.setName('unlink').setDescription('Remove your linked Steam account'),
        )
        .addSubcommand((sub) =>
            sub.setName('show').setDescription('Show your linked Steam account'),
        ),

    execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
        const sub = interaction.options.getSubcommand();

        if (sub === 'link') await handleLink(interaction);
        else if (sub === 'unlink') await handleUnlink(interaction);
        else if (sub === 'show') await handleShow(interaction);
    },
};
