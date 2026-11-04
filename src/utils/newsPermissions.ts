import { PermissionFlagsBits, type TextChannel } from 'discord.js';

// What the bot needs in the news channel: the post itself, and the patch notes thread.
export const NEWS_PERMISSIONS = [
    ['View Channel', PermissionFlagsBits.ViewChannel],
    ['Send Messages', PermissionFlagsBits.SendMessages],
    ['Embed Links', PermissionFlagsBits.EmbedLinks],
    ['Create Public Threads', PermissionFlagsBits.CreatePublicThreads],
    ['Send Messages in Threads', PermissionFlagsBits.SendMessagesInThreads],
] as const;

// The news permissions the bot is missing in the channel, by name. All of them when the
// bot's own member isn't cached, so nothing is posted until it can be checked.
export const missingNewsPermissions = (channel: TextChannel): string[] => {
    const me = channel.guild.members.me;
    const permissions = me ? channel.permissionsFor(me) : null;
    return NEWS_PERMISSIONS.filter(([, flag]) => !permissions?.has(flag)).map(([name]) => name);
};
