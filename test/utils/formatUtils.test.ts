import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    encodePostUrl,
    extractNewsImageUrl,
    fetchNewsOgImageUrl,
    formatRelativeTime,
    splitIntoSections,
    stripHtml,
} from '../../src/utils/formatUtils.js';
import { mockFetch } from '../helpers/fetch.js';

const MESSAGE_LIMIT = 2000;

describe('encodePostUrl', () => {
    it('keeps valid http and https URLs', () => {
        const url = 'https://store.steampowered.com/news/app/1422450/view/123';
        assert.equal(encodePostUrl(url), url);
        assert.equal(encodePostUrl('http://example.com/'), 'http://example.com/');
    });

    it('encodes characters that are not allowed in URLs', () => {
        assert.equal(encodePostUrl('https://example.com/a b'), 'https://example.com/a%20b');
    });

    it('rejects other schemes and invalid URLs', () => {
        assert.equal(encodePostUrl('javascript:alert(1)'), null);
        assert.equal(encodePostUrl('ftp://example.com/file'), null);
        assert.equal(encodePostUrl('not a url'), null);
        assert.equal(encodePostUrl(''), null);
    });
});

describe('extractNewsImageUrl', () => {
    it('returns the first image source', () => {
        const content =
            '<p>Text</p><img class="banner" src="https://cdn.example.com/a.png"><img src="https://cdn.example.com/b.png">';
        assert.equal(extractNewsImageUrl(content), 'https://cdn.example.com/a.png');
    });

    it('returns null when there is no image', () => {
        assert.equal(extractNewsImageUrl('<p>No images here</p>'), null);
    });
});

describe('fetchNewsOgImageUrl', () => {
    it('returns the og:image of the page', async (t) => {
        const calls = mockFetch(
            t,
            () =>
                new Response(
                    '<html><head><meta property="og:image" content="https://cdn.example.com/og.png"></head></html>',
                ),
        );
        assert.equal(
            await fetchNewsOgImageUrl('https://example.com/post'),
            'https://cdn.example.com/og.png',
        );
        assert.equal(calls[0]?.url, 'https://example.com/post');
    });

    it('returns null when the page has no og:image', async (t) => {
        mockFetch(t, () => new Response('<html></html>'));
        assert.equal(await fetchNewsOgImageUrl('https://example.com/post'), null);
    });

    it('returns null for error responses and failed requests', async (t) => {
        mockFetch(t, () => new Response('Not found', { status: 404 }));
        assert.equal(await fetchNewsOgImageUrl('https://example.com/post'), null);

        mockFetch(t, () => {
            throw new TypeError('fetch failed');
        });
        assert.equal(await fetchNewsOgImageUrl('https://example.com/post'), null);
    });
});

describe('stripHtml', () => {
    it('turns paragraphs into line breaks and removes formatting tags', () => {
        assert.equal(
            stripHtml('[p]Hello [b]world[/b][/p][p]<a href="https://x">link</a>[/p]'),
            'Hello world\nlink',
        );
    });

    it('removes Steam clan images and other bracket tags', () => {
        assert.equal(
            stripHtml('{STEAM_CLAN_IMAGE}/123/abc.png Text [url=https://x]here[/url]'),
            'Text here',
        );
    });

    it('removes escaping backslashes and collapses blank lines', () => {
        assert.equal(stripHtml('First\n\n\n\nSecond \\[x'), 'First\n\nSecond [x');
    });
});

describe('splitIntoSections', () => {
    it('splits at section headers and keeps the header with its section', () => {
        assert.deepEqual(
            splitIntoSections('Intro text\n[ General ]\n- fix one\n[ Heroes ]\n- buff'),
            ['Intro text', '[ General ]\n\n- fix one', '[ Heroes ]\n\n- buff'],
        );
    });

    it('recognizes escaped headers', () => {
        assert.deepEqual(splitIntoSections('\\[ General ]\n- fix'), ['[ General ]\n\n- fix']);
    });

    it('returns text without headers as one section', () => {
        assert.deepEqual(splitIntoSections('Just text, no headers'), ['Just text, no headers']);
    });

    it('splits a section longer than the message limit at line breaks', () => {
        const lines = Array.from({ length: 300 }, (_, i) => `- change number ${i}`);
        const chunks = splitIntoSections(`[ Big ]\n${lines.join('\n')}`);

        assert.ok(chunks.length > 1);
        for (const chunk of chunks) assert.ok(chunk.length <= MESSAGE_LIMIT, `${chunk.length}`);
        assert.ok(chunks[0]?.startsWith('[ Big ]'));
        // Every line survives, in order, and none is cut in half.
        const output = chunks.flatMap((chunk) => chunk.split('\n')).filter((line) => line);
        assert.deepEqual(output, ['[ Big ]', ...lines]);
    });

    it('splits a section that is only slightly over the message limit', () => {
        const lines = Array.from(
            { length: 70 },
            (_, i) => `- change ${String(i).padStart(2, '0')} ${'x'.repeat(16)}`,
        );
        const section = `[ Big ]\n${lines.join('\n')}`;
        assert.ok(section.length > MESSAGE_LIMIT && section.length < MESSAGE_LIMIT + 200);

        const chunks = splitIntoSections(section);
        assert.equal(chunks.length, 2);
        for (const chunk of chunks) assert.ok(chunk.length <= MESSAGE_LIMIT, `${chunk.length}`);
    });

    it('always returns at least one chunk', () => {
        assert.deepEqual(splitIntoSections(''), ['']);
    });
});

describe('formatRelativeTime', () => {
    const now = Date.parse('2026-11-01T12:00:00.000Z');
    // The database stores UTC timestamps as 'YYYY-MM-DD HH:MM:SS'.
    const secondsAgo = (seconds: number): string =>
        new Date(now - seconds * 1000).toISOString().slice(0, 19).replace('T', ' ');

    it('picks the largest whole unit', (t) => {
        t.mock.timers.enable({ apis: ['Date'], now });
        const cases: [number, string][] = [
            [0, 'just now'],
            [59, 'just now'],
            [60, '1m ago'],
            [59 * 60 + 59, '59m ago'],
            [60 * 60, '1h ago'],
            [24 * 60 * 60 - 1, '23h ago'],
            [24 * 60 * 60, '1d ago'],
            [10 * 24 * 60 * 60, '10d ago'],
        ];
        for (const [seconds, expected] of cases) {
            assert.equal(formatRelativeTime(secondsAgo(seconds)), expected, `${seconds}s`);
        }
    });
});
