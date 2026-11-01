import help from './help/index.js';
import heroes from './heroes/index.js';
import news from './news/index.js';
import steam from './steam/index.js';
import type { Command } from '../interactions.js';

// Every slash command. index.ts handles these and deploy.ts registers them with Discord.
export const commands: Command[] = [help, heroes, news, steam];
