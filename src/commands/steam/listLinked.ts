import {
    EmbedBuilder,
    MessageFlags,
    type ChatInputCommandInteraction,
    type GuildMember,
} from 'discord.js';
import { getLinkedDiscordUserIds } from '../../db/database.js';
import { logger } from '../../utils/logger.js';

const FETCH_CHUNK_SIZE = 100;
const MAX_LISTED = 100;

export const handleListLinked = async (interaction: ChatInputCommandInteraction): Promise<void> => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const linkedIds = getLinkedDiscordUserIds();
        const members: GuildMember[] = [];
        for (let i = 0; i < linkedIds.length; i += FETCH_CHUNK_SIZE) {
            const fetched = await interaction.guild!.members.fetch({
                user: linkedIds.slice(i, i + FETCH_CHUNK_SIZE),
            });
            members.push(...fetched.values());
        }

        members.sort((a, b) => a.displayName.localeCompare(b.displayName));
        const listedMembers = members.slice(0, MAX_LISTED).map((member) => `<@${member.id}>`);
        const remainingMembers = members.length - listedMembers.length;

        const embed = new EmbedBuilder()
            .setTitle('Linked Steam accounts')
            .setColor(0x00b4d8)
            .setDescription(
                listedMembers.length === 0
                    ? 'Nobody in this server has linked a Steam account yet. Use `/steam link` to link yours.'
                    : listedMembers.join('\n') +
                          (remainingMembers > 0 ? `\n…and ${remainingMembers} more` : ''),
            )
            .setFooter({ text: `${members.length} linked in this server` });

        logger.info(
            `[${interaction.guildId}] ${interaction.user.tag} listed linked Steam accounts`,
        );
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        logger.error('Failed to list linked Steam accounts', error);
        await interaction.editReply('Failed to list linked accounts.');
    }
};
