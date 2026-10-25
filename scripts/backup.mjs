// Writes a consistent copy of the database with VACUUM INTO, safe while the bot is running.
// Usage: node scripts/backup.mjs <database path>
import { DatabaseSync } from 'node:sqlite';
import { basename, dirname, join } from 'node:path';

const dbPath = process.argv[2];
if (!dbPath) {
    console.error('Usage: node scripts/backup.mjs <database path>');
    process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = join(
    dirname(dbPath),
    `${basename(dbPath, '.sqlite')}-backup-${timestamp}.sqlite`,
);

const db = new DatabaseSync(dbPath, { readOnly: true });
db.exec(`VACUUM INTO '${backupPath}'`);
db.close();
console.log(`Backed up ${dbPath} to ${backupPath}`);
