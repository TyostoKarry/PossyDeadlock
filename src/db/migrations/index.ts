import { sql as migration001 } from './001_initial.js';
import { sql as migration002 } from './002_hero_tables.js';

export const migrations: string[] = [migration001, migration002];
