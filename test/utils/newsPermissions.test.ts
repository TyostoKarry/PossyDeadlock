import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PermissionFlagsBits, PermissionsBitField, TextChannel } from 'discord.js';
import { missingNewsPermissions, NEWS_PERMISSIONS } from '../../src/utils/newsPermissions.js';

// Built from the news permissions only: PermissionsBitField.All includes Administrator,
// which counts as having every permission.
const allNews = NEWS_PERMISSIONS.reduce((all, [, flag]) => all | flag, 0n);

const channelWith = (permissions: bigint, me: unknown = { id: 'bot' }): TextChannel =>
    Object.assign(Object.create(TextChannel.prototype) as TextChannel, {
        guild: { members: { me } },
        permissionsFor: () => new PermissionsBitField(permissions),
    });

describe('missingNewsPermissions', () => {
    it('is empty when the bot has every news permission', () => {
        assert.deepEqual(missingNewsPermissions(channelWith(allNews)), []);
    });

    it('names each missing permission', () => {
        const permissions =
            allNews & ~(PermissionFlagsBits.EmbedLinks | PermissionFlagsBits.CreatePublicThreads);
        assert.deepEqual(missingNewsPermissions(channelWith(permissions)), [
            'Embed Links',
            'Create Public Threads',
        ]);
    });

    it('counts Administrator as having every permission', () => {
        assert.deepEqual(
            missingNewsPermissions(channelWith(PermissionFlagsBits.Administrator)),
            [],
        );
    });

    it("reports everything missing when the bot's member isn't cached", () => {
        assert.deepEqual(
            missingNewsPermissions(channelWith(allNews, null)),
            NEWS_PERMISSIONS.map(([name]) => name),
        );
    });
});
