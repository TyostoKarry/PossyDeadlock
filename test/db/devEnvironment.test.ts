// ENVIRONMENT is read when the database module loads, so this file sets it before importing.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.ENVIRONMENT = 'development';
const { backupFilePrefix } = await import('../../src/db/database.js');

describe('in development', () => {
    it('backups use the database.dev- prefix', () => {
        assert.equal(backupFilePrefix, 'database.dev-');
    });
});
