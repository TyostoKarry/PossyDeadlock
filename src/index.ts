import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import { commands } from './commands/index.js';
import { handleInteraction } from './interactions.js';
import { logger } from './utils/logger.js';
import { REJECT_ON_RATE_LIMIT } from './utils/rateLimits.js';

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    rest: { rejectOnRateLimit: REJECT_ON_RATE_LIMIT },
});
const commandsByName = new Collection(commands.map((command) => [command.data.name, command]));

client.on(Events.InteractionCreate, (interaction) =>
    handleInteraction(interaction, commandsByName),
);

client.once(Events.ClientReady, async (readyClient) => {
    logger.info(`Ready! Logged in as ${readyClient.user.tag} [${process.env.ENVIRONMENT}]`);

    const { startNewsPoller } = await import('./jobs/newsPoller.js');
    startNewsPoller(readyClient);
    const { startHeroPoller } = await import('./jobs/heroPoller.js');
    startHeroPoller();
    const { startBackupJob } = await import('./jobs/backupJob.js');
    startBackupJob();
});

const shutdown = (signal: string): void => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    client.destroy();
    process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

client.login(process.env.DISCORD_TOKEN);
