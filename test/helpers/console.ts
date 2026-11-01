import type { TestContext } from 'node:test';

// Silences console output for the rest of the test and returns what was printed.
export const captureConsole = (t: TestContext): Record<'log' | 'warn' | 'error', string[]> => {
    const output = { log: [] as string[], warn: [] as string[], error: [] as string[] };
    for (const method of ['log', 'warn', 'error'] as const) {
        t.mock.method(console, method, (message: string) => output[method].push(message));
    }
    return output;
};
