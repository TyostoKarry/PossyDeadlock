import { describe, it } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { logger } from '../../src/utils/logger.js';
import { captureConsole } from '../helpers/console.js';

const NOW = Date.parse('2026-11-01T12:00:00.000Z');

const captureLogs = (t: TestContext): ReturnType<typeof captureConsole> => {
    t.mock.timers.enable({ apis: ['Date'], now: NOW });
    return captureConsole(t);
};

describe('logger', () => {
    it('prints info to stdout with a timestamp and level', (t) => {
        const output = captureLogs(t);
        logger.info('Bot started');
        assert.deepEqual(output.log, ['[2026-11-01T12:00:00.000Z] [INFO] Bot started']);
        assert.deepEqual(output.error, []);
    });

    it('prints warnings to stderr', (t) => {
        const output = captureLogs(t);
        logger.warn('API returned an empty list');
        assert.deepEqual(output.warn, [
            '[2026-11-01T12:00:00.000Z] [WARN] API returned an empty list',
        ]);
        assert.deepEqual(output.log, []);
    });

    it('prints errors with the error message on the next line', (t) => {
        const output = captureLogs(t);
        logger.error('Hero poller failed', new Error('deadlock-api 503'));
        assert.deepEqual(output.error, [
            '[2026-11-01T12:00:00.000Z] [ERROR] Hero poller failed',
            '  → deadlock-api 503',
        ]);
    });

    it('prints only the message when there is no Error to show', (t) => {
        const output = captureLogs(t);
        logger.error('Something failed');
        logger.error('Something else failed', 'not an Error');
        assert.deepEqual(output.error, [
            '[2026-11-01T12:00:00.000Z] [ERROR] Something failed',
            '[2026-11-01T12:00:00.000Z] [ERROR] Something else failed',
        ]);
    });
});
