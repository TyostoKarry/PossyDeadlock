import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VERSION } from '../../src/utils/version.js';

describe('VERSION', () => {
    it('matches the version in package.json', () => {
        const packageJson = JSON.parse(
            readFileSync(new URL('../../package.json', import.meta.url), 'utf-8'),
        ) as {
            version: string;
        };
        assert.equal(VERSION, packageJson.version);
    });
});
