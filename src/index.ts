import { Client, Events, GatewayIntentBits, Collection } from 'discord.js';
import { readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logger } from './utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Command {
    data: { name: string; toJSON: () => unknown };
    execute: (interaction: unknown) => Promise<void>;
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

    const modulePath = isDir
        ? join(entryPath, `index${ext}`)
        : entryPath;

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
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        logger.error('Error executing command', error);
        await interaction.reply({
            content: 'There was an error while executing this command!',
            ephemeral: true,
        });
    }
});

client.once(Events.ClientReady, async (readyClient) => {
    logger.info(`Ready! Logged in as ${readyClient.user.tag}`);

    const { startNewsPoller } = await import('./jobs/newsPoller.js');
    startNewsPoller(readyClient);
});

client.login(process.env.DISCORD_TOKEN);
