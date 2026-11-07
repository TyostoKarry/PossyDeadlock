// Requests that should fail on a rate limit instead of waiting for it to reset. discord.js
// matches each entry against the rate-limited route (IDs replaced by :id) with startsWith.
export const REJECT_ON_RATE_LIMIT = [
    // Publishing is limited to 10 per announcement channel per hour. Waiting for that reset
    // would hold up the news poll for every server, so the post stays unpublished instead.
    '/channels/:id/messages/:id/crosspost',
];
