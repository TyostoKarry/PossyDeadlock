// Writes a full, consistent copy of the database with VACUUM INTO to data/backups/manual/,
// safe while the bot is running. Manual backups are never pruned automatically.
// Usage: node scripts/backup.mjs <database path>
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const dbPath = process.argv[2];
if (!dbPath) {
    console.error('Usage: node scripts/backup.mjs <database path>');
    process.exit(1);
}

const db = new DatabaseSync(dbPath, { readOnly: true, timeout: 5000 });

const backupDir = join(dirname(dbPath), 'backups', 'manual');
mkdirSync(backupDir, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = join(backupDir, `${basename(dbPath, '.sqlite')}-${timestamp}.sqlite`);

db.prepare('VACUUM INTO ?').run(backupPath);
db.close();
console.log(`Backed up ${dbPath} to ${backupPath}`);
