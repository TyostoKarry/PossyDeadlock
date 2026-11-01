import cron from 'node-cron';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { backupDatabase, backupFilePrefix } from '../db/database.js';
import { readdirSync, unlinkSync } from 'fs';
import { parseBackupDate, selectBackupsToKeep } from '../utils/backupRetention.js';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultBackupDir = join(__dirname, '../../data/backups/automatic');

export const runBackup = (backupDir = defaultBackupDir): void => {
    try {
        const backupPath = backupDatabase(backupDir);

        // Only this environment's backups, and only files the retention logic recognizes.
        const backups = readdirSync(backupDir).filter(
            (filename) =>
                filename.startsWith(backupFilePrefix) && parseBackupDate(filename) !== null,
        );
        const toKeep = selectBackupsToKeep(backups);
        const toDelete = backups.filter((filename) => !toKeep.has(filename));
        for (const filename of toDelete) unlinkSync(join(backupDir, filename));

        logger.info(`Backup job: wrote ${backupPath}, removed ${toDelete.length} old backups`);
    } catch (error) {
        logger.error('Backup job failed', error);
    }
};

export const startBackupJob = (): void => {
    logger.info('Backup job started, running daily at 05:00');
    cron.schedule('0 5 * * *', () => runBackup());
};
