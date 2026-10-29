import { MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { addSteamLink, getSteamLink } from '../../db/database.js';
import { buildSteamProfileUrl, isVanityUrl, parseSteamAccountId } from '../../utils/steamId.js';
import { logger } from '../../utils/logger.js';

export const handleLink = async (interaction: ChatInputCommandInteraction): Promise<void> => {
    const existingLink = getSteamLink(interaction.user.id);
    if (existingLink !== null) {
        await interaction.reply({
            content: `You're already linked to Steam account \`${existingLink}\`. Run \`/steam unlink\` first if you want to link a different account.`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const input = interaction.options.getString('steam', true);
    const accountId = parseSteamAccountId(input);
    if (accountId === null) {
        await interaction.reply({
            content: isVanityUrl(input)
                ? "Custom profile URLs (`steamcommunity.com/id/…`) aren't supported. Find your SteamID64 at <https://store.steampowered.com/account> and use that instead."
                : "That doesn't look like a Steam ID. Use your account ID, SteamID64, or a `steamcommunity.com/profiles/…` link.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    addSteamLink(interaction.user.id, accountId);
    logger.info(
        `[${interaction.guildId}] ${interaction.user.tag} linked Steam account ${accountId}`,
    );
    await interaction.reply({
        content: `Linked to Steam account \`${accountId}\` — [profile](${buildSteamProfileUrl(accountId)}).\nOther members can see that you've linked an account with \`/steam list-linked\`.`,
        flags: MessageFlags.Ephemeral,
    });
};
