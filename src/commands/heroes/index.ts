import { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { handleList } from './list.js';
import { handleMatchup } from './matchup.js';
import { handleStats } from './stats.js';
import { handleRandom } from './random.js';
import { getAllHeroes } from '../../db/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('heroes')
        .setDescription('Deadlock hero stats and information')
        .addSubcommand((sub) => sub.setName('list').setDescription('List all heroes'))
        .addSubcommand((sub) =>
            sub
                .setName('stats')
                .setDescription('Show stats for a specific hero')
                .addStringOption((option) =>
                    option
                        .setName('hero')
                        .setDescription('The hero name to show stats for')
                        .setRequired(true)
                        .setAutocomplete(true),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('matchup')
                .setDescription('Show synergies and counters for a specific hero')
                .addStringOption((option) =>
                    option
                        .setName('hero')
                        .setDescription('The hero name to show matchups for')
                        .setRequired(true)
                        .setAutocomplete(true),
                ),
        )
        .addSubcommand((sub) => sub.setName('random').setDescription('Show a random hero')),

        execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
            const sub = interaction.options.getSubcommand();

            if (sub === 'list') await handleList(interaction);
            else if (sub === 'stats') await handleStats(interaction);
            else if (sub === 'matchup') await handleMatchup(interaction);
            else if (sub === 'random') await handleRandom(interaction);
        },

        autocomplete: async (interaction: AutocompleteInteraction): Promise<void> => {
            const focusedOption = interaction.options.getFocused().toLowerCase();
            const choices = getAllHeroes()
                .filter((hero) => hero.name.toLowerCase().includes(focusedOption))
                .slice(0, 25)
                .map((hero) => ({ name: hero.name, value: hero.name }));

            await interaction.respond(choices);
        },
};
