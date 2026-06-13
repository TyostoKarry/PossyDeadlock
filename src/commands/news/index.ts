import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { handleSetChannel } from './setChannel.js';
import { handleSetMode } from './setMode.js';
import { handleSetPingRole } from './setPingRole.js';
import { handleConfig } from './config.js';
import { handleLastPost } from './lastPost.js';

export default {
    data: new SlashCommandBuilder()
        .setName('news')
        .setDescription('Deadlock news commands')
        .addSubcommand((sub) =>
            sub
                .setName('set-channel')
                .setDescription('Set the channel where Deadlock news will be posted')
                .addChannelOption((option) =>
                    option
                        .setName('channel')
                        .setDescription('The channel to post news in — leave empty to disable')
                        .setRequired(false),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('set-mode')
                .setDescription('Set the type of Deadlock news to post')
                .addStringOption((option) =>
                    option
                        .setName('mode')
                        .setDescription('News mode')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Official only (Valve patch notes)', value: 'official' },
                            { name: 'All (includes third party articles)', value: 'all' },
                        ),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('set-ping-role')
                .setDescription('Set a role to ping when new Deadlock news is posted')
                .addRoleOption((option) =>
                    option
                        .setName('role')
                        .setDescription('Role to ping — leave empty to clear')
                        .setRequired(false),
                ),
        )
        .addSubcommand((sub) =>
            sub.setName('config').setDescription('Show the current Deadlock news configuration'),
        )
        .addSubcommand((sub) =>
            sub.setName('last-post').setDescription('Show the most recent Deadlock news post'),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
        const sub = interaction.options.getSubcommand();

        if (sub === 'set-channel') await handleSetChannel(interaction);
        else if (sub === 'set-mode') await handleSetMode(interaction);
        else if (sub === 'set-ping-role') await handleSetPingRole(interaction);
        else if (sub === 'config') await handleConfig(interaction);
        else if (sub === 'last-post') await handleLastPost(interaction);
    },
};
