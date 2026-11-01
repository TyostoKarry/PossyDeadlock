import { describe, it } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import cron from 'node-cron';
import { runBackup, startBackupJob } from '../../src/jobs/backupJob.js';
import { selectBackupsToKeep } from '../../src/utils/backupRetention.js';
import { captureConsole } from '../helpers/console.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const tempDir = (t: TestContext): string => {
    const dir = mkdtempSync(join(tmpdir(), 'possydeadlock-'));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    return dir;
};

const backupName = (date: Date, prefix = 'database-'): string =>
    `${prefix}${date.toISOString().replace(/[:.]/g, '-')}.sqlite`;

describe('backup job', () => {
    it('writes a backup into the given folder, creating it if needed', (t) => {
        const output = captureConsole(t);
        const dir = join(tempDir(t), 'automatic');

        runBackup(dir);
        const files = readdirSync(dir);
        assert.equal(files.length, 1);
        assert.match(files[0] ?? '', /^database-.*\.sqlite$/);
        assert.match(output.log[0] ?? '', /Backup job: wrote .*, removed 0 old backups$/);
    });

    it('prunes old backups by the retention tiers', (t) => {
        const output = captureConsole(t);
        const dir = tempDir(t);
        // 60 days of earlier backups, ending yesterday.
        const now = Date.now();
        const earlier = Array.from({ length: 60 }, (_, i) =>
            backupName(new Date(now - (60 - i) * DAY_IN_MS)),
        );
        for (const file of earlier) writeFileSync(join(dir, file), '');

        runBackup(dir);
        const remaining = readdirSync(dir).sort();
        const newBackup = remaining.find((file) => !earlier.includes(file));
        assert.ok(newBackup);

        const expected = [...selectBackupsToKeep([...earlier, newBackup])].sort();
        assert.deepEqual(remaining, expected);
        assert.ok(remaining.length < 8);
        assert.match(
            output.log[0] ?? '',
            new RegExp(`removed ${earlier.length + 1 - remaining.length} old backups$`),
        );
    });

    it('leaves other environments and unrelated files alone', (t) => {
        captureConsole(t);
        const dir = tempDir(t);
        const old = new Date('2020-01-01T05:00:00.000Z');
        const untouched = [
            backupName(old, 'database.dev-'),
            'notes.txt',
            'database-backup-2020-01-01T05-00-00-000Z.sqlite',
        ];
        for (const file of untouched) writeFileSync(join(dir, file), '');
        // Old enough to fall out of every tier.
        for (let day = 0; day < 5; day++) {
            writeFileSync(join(dir, backupName(new Date(old.getTime() + day * DAY_IN_MS))), '');
        }

        runBackup(dir);
        const remaining = readdirSync(dir);
        for (const file of untouched) assert.ok(remaining.includes(file), file);
    });

    it('logs a failure instead of throwing', (t) => {
        const output = captureConsole(t);
        const dir = tempDir(t);
        const notAFolder = join(dir, 'file');
        writeFileSync(notAFolder, '');

        assert.doesNotThrow(() => runBackup(join(notAFolder, 'automatic')));
        assert.match(output.error[0] ?? '', /Backup job failed/);
    });

    it('runs daily at 05:00, not on startup', (t) => {
        const output = captureConsole(t);
        const schedule = t.mock.method(cron, 'schedule', () => undefined);

        startBackupJob();
        assert.equal(schedule.mock.callCount(), 1);
        assert.equal(schedule.mock.calls[0]?.arguments[0], '0 5 * * *');
        assert.equal(output.log.length, 1);
        assert.match(output.log[0] ?? '', /Backup job started/);
    });
});
