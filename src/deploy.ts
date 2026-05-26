import { REST, Routes } from 'discord.js';
import setNewsChannel from './commands/setNewsChannel.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  throw new Error('Missing DISCORD_TOKEN or CLIENT_ID in .env');
}

const rest = new REST().setToken(token);

await rest.put(
  Routes.applicationCommands(clientId),
  { body: [setNewsChannel.data.toJSON()] },
);

console.log('Commands registered!');