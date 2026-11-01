import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { commands } from '../../src/commands/index.js';

interface CommandJson {
    name: string;
    description: string;
    options?: { name: string; type: number; options?: { name: string }[] }[];
}

const SUBCOMMAND = 1;

describe('command definitions', () => {
    it('are all valid for Discord', () => {
        // toJSON runs discord.js's validation: name format and length, description length,
        // option and choice limits.
        for (const command of commands) {
            assert.doesNotThrow(() => command.data.toJSON(), command.data.name);
        }
    });

    it('include every command folder', () => {
        const folders = readdirSync(new URL('../../src/commands/', import.meta.url), {
            withFileTypes: true,
        })
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .sort();
        assert.deepEqual(commands.map((command) => command.data.name).sort(), folders);
    });

    it('have unique names', () => {
        const names = commands.map((command) => command.data.name);
        assert.equal(new Set(names).size, names.length);
    });

    it('register the expected subcommands', () => {
        const subcommands = Object.fromEntries(
            commands.map((command) => {
                const json = command.data.toJSON() as CommandJson;
                const subs = (json.options ?? [])
                    .filter((option) => option.type === SUBCOMMAND)
                    .map((option) => option.name);
                return [json.name, subs];
            }),
        );
        assert.deepEqual(subcommands, {
            help: [],
            heroes: ['list', 'stats', 'matchup', 'random'],
            news: ['set-channel', 'set-mode', 'set-ping-role', 'config', 'last-post'],
            steam: ['link', 'unlink', 'show', 'list-linked'],
        });
    });

    it('give the visibility option to the commands that show content', () => {
        const withVisibility = commands.flatMap((command) => {
            const json = command.data.toJSON() as CommandJson;
            return (json.options ?? [])
                .filter((sub) => sub.options?.some((option) => option.name === 'visibility'))
                .map((sub) => `${json.name} ${sub.name}`);
        });
        assert.deepEqual(withVisibility, [
            'heroes list',
            'heroes stats',
            'heroes matchup',
            'heroes random',
            'news last-post',
        ]);
    });
});
