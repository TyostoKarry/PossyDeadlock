import { REST, Routes } from 'discord.js';
import setNewsChannel from './commands/setNewsChannel.js';
import setNewsMode from './commands/setNewsMode.js';
import lastNewsPost from './commands/lastNewsPost.js';
import setNewsPingRole from './commands/setNewsPingRole.js';
import newsConfig from './commands/newsConfig.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  throw new Error('Missing DISCORD_TOKEN or CLIENT_ID in .env');
}

const rest = new REST().setToken(token);

await rest.put(
  Routes.applicationCommands(clientId),
  { body: [setNewsChannel.data.toJSON(), setNewsMode.data.toJSON(), lastNewsPost.data.toJSON(), setNewsPingRole.data.toJSON(), newsConfig.data.toJSON()] },
);

console.log('Commands registered!');