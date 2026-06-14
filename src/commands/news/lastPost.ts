import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getNewsMode } from '../../db/database.js';
import { fetchDeadlockNews, OFFICIAL_FEED } from '../../utils/steamApi.js';
import { encodePostUrl, extractNewsImageUrl, stripHtml } from '../../utils/formatUtils.js';
import { logger } from '../../utils/logger.js';

export const handleLastPost = async (interaction: ChatInputCommandInteraction): Promise<void> => {
    await interaction.deferReply();

    try {
        const posts = await fetchDeadlockNews();
        const mode = getNewsMode(interaction.guildId!);
        const filtered =
            mode === 'official' ? posts.filter((p) => p.feedname === OFFICIAL_FEED) : posts;

        const post = filtered[0];
        if (!post) {
            await interaction.editReply('No news posts found.');
            return;
        }

        const description = stripHtml(post.contents).slice(0, 300);
        const embed = new EmbedBuilder()
            .setTitle(post.title)
            .setDescription(description + '...')
            .setFooter({ text: `By ${post.author}` })
            .setTimestamp(post.date * 1000)
            .setColor(0x00b4d8);

        const url = encodePostUrl(post.url);
        if (url) embed.setURL(url);

        const imageUrl = extractNewsImageUrl(post.contents);
        if (imageUrl) embed.setImage(imageUrl);

        logger.info(`[${interaction.guildId}] ${interaction.user.tag} requested last news post`);
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        logger.error('Failed to fetch last news post', error);
        await interaction.editReply('Failed to fetch the latest news post.');
    }
};
