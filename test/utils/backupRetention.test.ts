import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseBackupDate, selectBackupsToKeep } from '../../src/utils/backupRetention.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const backupName = (iso: string, prefix = 'database-'): string =>
    `${prefix}${iso.replace(/[:.]/g, '-')}.sqlite`;

// One backup per day at 05:00 UTC, starting from the given date.
const dailyBackups = (fromDate: string, days: number): string[] =>
    Array.from({ length: days }, (_, i) =>
        backupName(new Date(Date.parse(`${fromDate}T05:00:00.000Z`) + i * DAY_IN_MS).toISOString()),
    );

const kept = (files: string[]): string[] => [...selectBackupsToKeep(files)].sort();

describe('parseBackupDate', () => {
    it('reads the timestamp from production and development backup names', () => {
        const expected = '2026-10-26T03:00:00.000Z';
        assert.equal(parseBackupDate(backupName(expected))?.toISOString(), expected);
        assert.equal(
            parseBackupDate(backupName(expected, 'database.dev-'))?.toISOString(),
            expected,
        );
    });

    it('returns null for names that are not backups', () => {
        assert.equal(parseBackupDate('notes.txt'), null);
        assert.equal(parseBackupDate('database.sqlite'), null);
        assert.equal(parseBackupDate('database-backup-2026-10-26T03-00-00-000Z.sqlite'), null);
        assert.equal(parseBackupDate('database-2026-10-26T03-00-00-000Z.sqlite-wal'), null);
        assert.equal(parseBackupDate('other-2026-10-26T03-00-00-000Z.sqlite'), null);
    });

    it('returns null for impossible dates', () => {
        assert.equal(parseBackupDate('database-2026-13-01T03-00-00-000Z.sqlite'), null);
        assert.equal(parseBackupDate('database-2026-10-32T03-00-00-000Z.sqlite'), null);
        assert.equal(parseBackupDate('database-2026-10-26T25-00-00-000Z.sqlite'), null);
    });
});

describe('selectBackupsToKeep', () => {
    it('keeps nothing when there are no backups', () => {
        assert.deepEqual(kept([]), []);
    });

    it('keeps every backup when there are only a few', () => {
        const files = dailyBackups('2026-10-30', 2);
        assert.deepEqual(kept(files), files);
    });

    it('keeps the 3 newest, the first of the last 2 weeks and the first of the last 2 months', () => {
        // Daily from Monday 2026-08-31 to Saturday 2026-10-31.
        const files = dailyBackups('2026-08-31', 62);
        assert.deepEqual(kept(files), [
            backupName('2026-09-01T05:00:00.000Z'), // first of September
            backupName('2026-10-01T05:00:00.000Z'), // first of October
            backupName('2026-10-19T05:00:00.000Z'), // first of the week of Monday 19th
            backupName('2026-10-26T05:00:00.000Z'), // first of the week of Monday 26th
            backupName('2026-10-29T05:00:00.000Z'), // newest 3
            backupName('2026-10-30T05:00:00.000Z'),
            backupName('2026-10-31T05:00:00.000Z'),
        ]);
    });

    it('counts one backup toward several tiers', () => {
        // Sunday 2026-11-01 is the newest, the first of November and the first of its week.
        const files = dailyBackups('2026-10-28', 5);
        assert.deepEqual(kept(files), [
            backupName('2026-10-28T05:00:00.000Z'), // first of the week of Monday 26th and of October
            backupName('2026-10-30T05:00:00.000Z'), // newest 3
            backupName('2026-10-31T05:00:00.000Z'),
            backupName('2026-11-01T05:00:00.000Z'),
        ]);
    });

    it('uses the first backup of a week when there is none on Monday', () => {
        // No backups on Monday 19th or Monday 26th.
        const files = [
            backupName('2026-10-21T05:00:00.000Z'),
            backupName('2026-10-22T05:00:00.000Z'),
            backupName('2026-10-28T05:00:00.000Z'),
            backupName('2026-10-29T05:00:00.000Z'),
            backupName('2026-10-30T05:00:00.000Z'),
            backupName('2026-10-31T05:00:00.000Z'),
        ];
        assert.deepEqual(kept(files), [
            backupName('2026-10-21T05:00:00.000Z'), // first of its week and of October
            backupName('2026-10-28T05:00:00.000Z'), // first of its week
            backupName('2026-10-29T05:00:00.000Z'), // newest 3
            backupName('2026-10-30T05:00:00.000Z'),
            backupName('2026-10-31T05:00:00.000Z'),
        ]);
    });

    it('uses the first backup of a month when there is none on the 1st', () => {
        // Daily from Monday 2026-10-05 to Monday 2026-10-12, so the week tier stays in October.
        const files = [
            backupName('2026-09-10T05:00:00.000Z'),
            backupName('2026-09-12T05:00:00.000Z'),
            ...dailyBackups('2026-10-05', 8),
        ];
        assert.deepEqual(kept(files), [
            backupName('2026-09-10T05:00:00.000Z'), // first of September
            backupName('2026-10-05T05:00:00.000Z'), // first of October and of its week
            backupName('2026-10-10T05:00:00.000Z'), // newest 3
            backupName('2026-10-11T05:00:00.000Z'),
            backupName('2026-10-12T05:00:00.000Z'), // also first of its week
        ]);
    });

    it('starts weeks on Monday at 00:00 UTC', () => {
        const files = [
            backupName('2026-11-02T05:00:00.000Z'), // Monday, first of its week and of November
            backupName('2026-11-08T23:59:59.999Z'), // Sunday, last moment of the same week
            backupName('2026-11-09T00:00:00.000Z'), // Monday, first moment of the next week
            ...dailyBackups('2026-11-10', 3),
        ];
        assert.deepEqual(kept(files), [
            backupName('2026-11-02T05:00:00.000Z'),
            backupName('2026-11-09T00:00:00.000Z'),
            ...dailyBackups('2026-11-10', 3),
        ]);
    });

    it('starts months on the 1st at 00:00 UTC', () => {
        const files = [
            backupName('2026-10-01T05:00:00.000Z'), // first of October
            backupName('2026-10-31T23:59:59.999Z'), // last moment of October
            backupName('2026-11-01T00:00:00.000Z'), // first moment of November
            ...dailyBackups('2026-11-03', 3),
        ];
        // Every file is kept: October 31st is also the first of its week, and November 1st is
        // only kept because it starts the month.
        assert.deepEqual(kept(files), files);
    });

    it('sorts by timestamp, not by input order', () => {
        const files = dailyBackups('2026-10-01', 31);
        assert.deepEqual(kept([...files].reverse()), kept(files));
    });

    it('never selects files that are not backups', () => {
        const files = [...dailyBackups('2026-10-29', 3), 'notes.txt', 'database.sqlite'];
        const result = kept(files);
        assert.ok(!result.includes('notes.txt'));
        assert.ok(!result.includes('database.sqlite'));
        assert.equal(result.length, 3);
    });
});
