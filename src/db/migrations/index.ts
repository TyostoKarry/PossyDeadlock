import { sql as migration001 } from './001_initial.js';
import { sql as migration002 } from './002_hero_tables.js';
import { sql as migration003 } from './003_hero_type_complexity.js';

export const migrations: string[] = [migration001, migration002, migration003];
