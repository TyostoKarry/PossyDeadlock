import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RateLimitError, REST, RequestMethod, Routes, type ResponseLike } from 'discord.js';
import { REJECT_ON_RATE_LIMIT } from '../../src/utils/rateLimits.js';

const channelId = '123456789012345678';
const messageId = '223456789012345678';

// discord.js names each request's route with this before matching it against
// rejectOnRateLimit. It's private in the types, but it's the naming that decides a match.
interface RouteNaming {
    generateRouteData: (route: string, method: RequestMethod) => { bucketRoute: string };
}

const rejects = (route: string, method = RequestMethod.Post): boolean => {
    const { bucketRoute } = (REST as unknown as RouteNaming).generateRouteData(route, method);
    return REJECT_ON_RATE_LIMIT.some((prefix) => bucketRoute.startsWith(prefix));
};

describe('REJECT_ON_RATE_LIMIT', () => {
    it('covers publishing a message', () => {
        assert.equal(rejects(Routes.channelMessageCrosspost(channelId, messageId)), true);
    });

    it('leaves sending, editing and starting threads to wait as usual', () => {
        assert.equal(rejects(Routes.channelMessages(channelId)), false);
        assert.equal(
            rejects(Routes.channelMessage(channelId, messageId), RequestMethod.Patch),
            false,
        );
        assert.equal(rejects(Routes.threads(channelId, messageId)), false);
    });

    it(
        'makes a rate-limited publish fail straight away instead of waiting',
        { timeout: 5000 },
        async () => {
            // A fake 429 from Discord. The global Response works at runtime, but its stream type
            // differs from the one discord.js declares, hence the cast.
            const rateLimited = async (): Promise<ResponseLike> =>
                Response.json(
                    { message: 'You are being rate limited.', retry_after: 3000, global: false },
                    {
                        status: 429,
                        headers: { 'retry-after': '3000', 'x-ratelimit-scope': 'user' },
                    },
                ) as unknown as ResponseLike;
            const rest = new REST({
                rejectOnRateLimit: REJECT_ON_RATE_LIMIT,
                makeRequest: rateLimited,
            }).setToken('token');

            await assert.rejects(
                rest.post(Routes.channelMessageCrosspost(channelId, messageId)),
                RateLimitError,
            );
        },
    );
});
