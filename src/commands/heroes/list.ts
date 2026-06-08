import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';

export const handleList = async (interaction: ChatInputCommandInteraction): Promise<void> => {
    await interaction.reply({
        content: 'This subcommand is not yet implemented.',
        flags: MessageFlags.Ephemeral,
    });
};
