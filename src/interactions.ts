import { MessageFlags } from 'discord.js';
import type {
    AutocompleteInteraction,
    ButtonInteraction,
    ChatInputCommandInteraction,
    Interaction,
    StringSelectMenuInteraction,
} from 'discord.js';
import { logger } from './utils/logger.js';

export interface Command {
    data: { name: string; toJSON: () => unknown };
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
    handleButton?: (interaction: ButtonInteraction) => Promise<void>;
    handleSelectMenu?: (interaction: StringSelectMenuInteraction) => Promise<void>;
}

const ERROR_REPLY = {
    content: 'There was an error while executing this command!',
    flags: MessageFlags.Ephemeral,
} as const;

// Buttons and select menus are routed by the command name before the first ':' in their custom ID.
const commandForComponent = (
    commands: ReadonlyMap<string, Command>,
    customId: string,
): Command | undefined => commands.get(customId.split(':')[0] ?? '');

export const handleInteraction = async (
    interaction: Interaction,
    commands: ReadonlyMap<string, Command>,
): Promise<void> => {
    if (interaction.isAutocomplete()) {
        const command = commands.get(interaction.commandName);
        if (!command?.autocomplete) return;

        try {
            await command.autocomplete(interaction);
        } catch (error) {
            logger.error('Error handling autocomplete', error);
        }
        return;
    }

    if (interaction.isButton()) {
        const command = commandForComponent(commands, interaction.customId);
        if (!command?.handleButton) return;

        try {
            await command.handleButton(interaction);
        } catch (error) {
            logger.error('Error handling button interaction', error);
        }
        return;
    }

    if (interaction.isStringSelectMenu()) {
        const command = commandForComponent(commands, interaction.customId);
        if (!command?.handleSelectMenu) return;

        try {
            await command.handleSelectMenu(interaction);
        } catch (error) {
            logger.error('Error handling select menu interaction', error);
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        logger.error('Error executing command', error);
        // A second reply is rejected once the command has replied or deferred, and an error
        // thrown from here would crash the bot, so the error reply must never throw.
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(ERROR_REPLY);
            } else {
                await interaction.reply(ERROR_REPLY);
            }
        } catch (replyError) {
            logger.error('Failed to send the error reply', replyError);
        }
    }
};
