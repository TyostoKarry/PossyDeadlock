const BACKUP_FILE_PATTERN =
    /^database(?:\.dev)?-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z\.sqlite$/;

const KEEP_DAILY_BACKUPS = 3;
const KEEP_WEEKLY_BACKUPS = 2;
const KEEP_MONTHLY_BACKUPS = 2;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

interface Backup {
    filename: string;
    date: Date;
}

export const parseBackupDate = (filename: string): Date | null => {
    const match = filename.match(BACKUP_FILE_PATTERN);
    if (!match) return null;
    const [, day, hour, minute, second, millisecond] = match;
    const date = new Date(`${day}T${hour}:${minute}:${second}.${millisecond}Z`);
    return Number.isNaN(date.getTime()) ? null : date;
};

// Weeks start on Monday (UTC) and are keyed by that Monday's date.
const weekKey = (date: Date): string => {
    const daysSinceMonday = (date.getUTCDay() + 6) % 7;
    const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    return new Date(midnight - daysSinceMonday * DAY_IN_MS).toISOString().slice(0, 10);
};

const monthKey = (date: Date): string => date.toISOString().slice(0, 7);

// Expects backups to be sorted oldest first.
const firstOfNewestPeriods = (
    backups: Backup[],
    periodKey: (date: Date) => string,
    count: number,
): string[] => {
    const firstPerPeriod = new Map<string, string>();
    for (const { filename, date } of backups) {
        const key = periodKey(date);
        if (!firstPerPeriod.has(key)) firstPerPeriod.set(key, filename);
    }
    const firsts = [...firstPerPeriod.values()];
    return firsts.slice(Math.max(0, firsts.length - count));
};

// Files that don't match the backup filename pattern are left out of the result,
// so callers must only delete files that parseBackupDate recognizes.
export const selectBackupsToKeep = (files: string[]): Set<string> => {
    const backups = files
        .map((filename) => ({ filename, date: parseBackupDate(filename) }))
        .filter((backup): backup is Backup => backup.date !== null)
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    return new Set([
        ...backups
            .slice(Math.max(0, backups.length - KEEP_DAILY_BACKUPS))
            .map(({ filename }) => filename),
        ...firstOfNewestPeriods(backups, weekKey, KEEP_WEEKLY_BACKUPS),
        ...firstOfNewestPeriods(backups, monthKey, KEEP_MONTHLY_BACKUPS),
    ]);
};
