import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';

const VISIBILITY_OPTION = 'visibility';

export const addVisibilityOption = (
    subcommand: SlashCommandSubcommandBuilder,
): SlashCommandSubcommandBuilder =>
    subcommand.addStringOption((option) =>
        option
            .setName(VISIBILITY_OPTION)
            .setDescription('Who can see the reply (default: only you)')
            .setRequired(false)
            .addChoices({ name: 'Private', value: 'private' }, { name: 'Public', value: 'public' }),
    );

export const getVisibilityFlags = (
    interaction: ChatInputCommandInteraction,
): MessageFlags.Ephemeral | undefined =>
    interaction.options.getString(VISIBILITY_OPTION) === 'public'
        ? undefined
        : MessageFlags.Ephemeral;
