import { REST, Routes } from 'discord.js';
import { commands } from './commands/index.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
    throw new Error('Missing DISCORD_TOKEN or CLIENT_ID in .env');
}

const rest = new REST().setToken(token);

await rest.put(Routes.applicationCommands(clientId), {
    body: commands.map((command) => command.data.toJSON()),
});

console.log('Commands registered!');
