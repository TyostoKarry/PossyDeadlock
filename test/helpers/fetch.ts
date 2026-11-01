import type { TestContext } from 'node:test';

export interface FetchCall {
    url: string;
    init: RequestInit | undefined;
}

// Replaces global fetch for the rest of the test and records each request.
export const mockFetch = (
    t: TestContext,
    respond: (url: string) => Response | Promise<Response>,
): FetchCall[] => {
    const calls: FetchCall[] = [];
    t.mock.method(
        globalThis,
        'fetch',
        async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
            const url = input instanceof Request ? input.url : String(input);
            calls.push({ url, init });
            return respond(url);
        },
    );
    return calls;
};
