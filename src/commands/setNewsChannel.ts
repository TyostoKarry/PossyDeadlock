import {
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    SlashCommandBuilder,
    TextChannel,
} from 'discord.js';
import { setNewsChannel } from '../db/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('set-news-channel')
        .setDescription('Set the channel where Deadlock news will be posted')
        .addChannelOption((option) =>
            option
                .setName('channel')
                .setDescription('The channel to post news in')
                .setRequired(true),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
        const channel = interaction.options.getChannel('channel', true);

        if (!(channel instanceof TextChannel)) {
            await interaction.reply({
                content: 'Please select a text channel.',
                ephemeral: true,
            });
            return;
        }

        setNewsChannel(interaction.guildId!, channel.id);

        await interaction.reply({
            content: `Deadlock news will now be posted in <#${channel.id}>`,
            ephemeral: true,
        });
    },
};
