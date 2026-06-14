import { REST, Routes } from 'discord.js';
import news from './commands/news/index.js';
import heroes from './commands/heroes/index.js';
import help from './commands/help/index.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
    throw new Error('Missing DISCORD_TOKEN or CLIENT_ID in .env');
}

const rest = new REST().setToken(token);

await rest.put(Routes.applicationCommands(clientId), {
    body: [news.data.toJSON(), heroes.data.toJSON(), help.data.toJSON()],
});

console.log('Commands registered!');
