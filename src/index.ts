import { Client, Events, GatewayIntentBits, Collection, MessageFlags } from 'discord.js';
import { readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logger } from './utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Command {
    data: { name: string; toJSON: () => unknown };
    execute: (interaction: unknown) => Promise<void>;
    autocomplete?: (interaction: unknown) => Promise<void>;
    handleButton?: (interaction: unknown) => Promise<void>;
}

declare module 'discord.js' {
    interface Client {
        commands: Collection<string, Command>;
    }
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const commandsPath = join(__dirname, 'commands');
const ext = import.meta.url.endsWith('.ts') ? '.ts' : '.js';

const entries = readdirSync(commandsPath);

for (const entry of entries) {
    const entryPath = join(commandsPath, entry);
    const isDir = statSync(entryPath).isDirectory();

    const modulePath = isDir ? join(entryPath, `index${ext}`) : entryPath;

    if (!isDir && !entry.endsWith(ext)) continue;

    const module = await import(modulePath);
    const command = module.default;

    if (!command?.data?.name) {
        logger.warn(`Skipping invalid command: ${entry}`);
        continue;
    }

    client.commands.set(command.data.name, command);
}

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (!command?.autocomplete) return;

        try {
            await command.autocomplete(interaction);
        } catch (error) {
            logger.error('Error handling autocomplete', error);
        }
        return;
    }

    if (interaction.isButton()) {
        const [commandName = ''] = interaction.customId.split(':');
        const command = client.commands.get(commandName);
        if (!command?.handleButton) return;

        try {
            await command.handleButton(interaction);
        } catch (error) {
            logger.error('Error handling button interaction', error);
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        logger.error('Error executing command', error);
        await interaction.reply({
            content: 'There was an error while executing this command!',
            flags: MessageFlags.Ephemeral,
        });
    }
});

client.once(Events.ClientReady, async (readyClient) => {
    logger.info(`Ready! Logged in as ${readyClient.user.tag} [${process.env.ENVIRONMENT}]`);

    const { startNewsPoller } = await import('./jobs/newsPoller.js');
    startNewsPoller(readyClient);
    const { startHeroPoller } = await import('./jobs/heroPoller.js');
    startHeroPoller();
});

const shutdown = (signal: string): void => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    client.destroy();
    process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

client.login(process.env.DISCORD_TOKEN);
