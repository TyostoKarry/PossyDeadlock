import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { forEachLimit } from '../../src/utils/forEachLimit.js';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('forEachLimit', () => {
    it('runs every item and waits for all of them', async () => {
        const done: number[] = [];
        await forEachLimit([3, 1, 2], 2, async (ms) => {
            await sleep(ms);
            done.push(ms);
        });
        assert.deepEqual(done.sort(), [1, 2, 3]);
    });

    it('runs up to the limit at once, never more', async () => {
        let running = 0;
        let most = 0;
        await forEachLimit([1, 2, 3, 4, 5, 6, 7], 3, async () => {
            running++;
            most = Math.max(most, running);
            await sleep(1);
            running--;
        });
        assert.equal(most, 3);
    });

    it('handles fewer items than the limit, and no items', async () => {
        const done: number[] = [];
        await forEachLimit([1, 2], 10, async (n) => {
            done.push(n);
        });
        await forEachLimit([], 10, async () => assert.fail('should not run'));
        assert.deepEqual(done.sort(), [1, 2]);
    });

    it('keeps going when an item fails, then throws the errors together', async () => {
        const done: number[] = [];
        await assert.rejects(
            forEachLimit([1, 2, 3, 4], 2, async (n) => {
                if (n === 1) throw new Error('one failed');
                done.push(n);
            }),
            (error: unknown) =>
                error instanceof AggregateError &&
                error.errors.length === 1 &&
                (error.errors[0] as Error).message === 'one failed',
        );
        assert.deepEqual(done.sort(), [2, 3, 4]);
    });
});
