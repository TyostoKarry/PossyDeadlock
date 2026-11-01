import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MessageFlags, SlashCommandSubcommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { addVisibilityOption, getVisibilityFlags } from '../../src/utils/visibility.js';

const interactionWithVisibility = (value: string | null): ChatInputCommandInteraction =>
    ({
        options: { getString: (name: string) => (name === 'visibility' ? value : null) },
    }) as unknown as ChatInputCommandInteraction;

describe('addVisibilityOption', () => {
    it('adds an optional visibility choice of Private or Public', () => {
        const subcommand = addVisibilityOption(
            new SlashCommandSubcommandBuilder().setName('test').setDescription('Test'),
        ).toJSON();
        const option = subcommand.options?.find((o) => o.name === 'visibility');

        assert.ok(option);
        assert.equal(option.required, false);
        const choices = 'choices' in option ? (option.choices ?? []) : [];
        assert.deepEqual(
            choices.map(({ name, value }) => ({ name, value })),
            [
                { name: 'Private', value: 'private' },
                { name: 'Public', value: 'public' },
            ],
        );
    });
});

describe('getVisibilityFlags', () => {
    it('replies publicly only when Public is chosen', () => {
        assert.equal(getVisibilityFlags(interactionWithVisibility('public')), undefined);
    });

    it('replies privately when Private is chosen or the option is left out', () => {
        assert.equal(
            getVisibilityFlags(interactionWithVisibility('private')),
            MessageFlags.Ephemeral,
        );
        assert.equal(getVisibilityFlags(interactionWithVisibility(null)), MessageFlags.Ephemeral);
    });
});
