import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    buildSteamProfileUrl,
    isVanityUrl,
    parseSteamAccountId,
    toSteamId64,
} from '../../src/utils/steamId.js';

const ACCOUNT_ID = 22202;
const STEAM_ID_64 = '76561197960287930';
const MAX_ACCOUNT_ID = 4294967295;

describe('parseSteamAccountId', () => {
    it('accepts an account ID', () => {
        assert.equal(parseSteamAccountId(String(ACCOUNT_ID)), ACCOUNT_ID);
        assert.equal(parseSteamAccountId('1'), 1);
        assert.equal(parseSteamAccountId(String(MAX_ACCOUNT_ID)), MAX_ACCOUNT_ID);
    });

    it('accepts a SteamID64', () => {
        assert.equal(parseSteamAccountId(STEAM_ID_64), ACCOUNT_ID);
        assert.equal(parseSteamAccountId('76561202255233023'), MAX_ACCOUNT_ID);
    });

    it('accepts profile links in any common form', () => {
        for (const url of [
            `https://steamcommunity.com/profiles/${STEAM_ID_64}`,
            `https://steamcommunity.com/profiles/${STEAM_ID_64}/`,
            `http://www.steamcommunity.com/profiles/${STEAM_ID_64}`,
            `steamcommunity.com/profiles/${STEAM_ID_64}`,
            `HTTPS://SteamCommunity.com/profiles/${STEAM_ID_64}`,
            `https://steamcommunity.com/profiles/${STEAM_ID_64}/?l=english`,
            `https://steamcommunity.com/profiles/${STEAM_ID_64}#top`,
        ]) {
            assert.equal(parseSteamAccountId(url), ACCOUNT_ID, url);
        }
    });

    it('ignores surrounding whitespace', () => {
        assert.equal(parseSteamAccountId(`  ${STEAM_ID_64}\n`), ACCOUNT_ID);
    });

    it('rejects account IDs outside the 32-bit range', () => {
        assert.equal(parseSteamAccountId('0'), null);
        assert.equal(parseSteamAccountId(String(MAX_ACCOUNT_ID + 1)), null);
    });

    it('rejects SteamID64 values that do not map to a valid account ID', () => {
        assert.equal(parseSteamAccountId('76561197960265728'), null); // account ID 0
        assert.equal(parseSteamAccountId('76561202255233024'), null); // one past the maximum
        assert.equal(parseSteamAccountId('10000000000000000'), null); // below the base
    });

    it('rejects malformed input', () => {
        for (const input of [
            '',
            'abc',
            '-5',
            '12.5',
            '1e5',
            '123456789012', // 12 digits: too long for an account ID, too short for SteamID64
            `${STEAM_ID_64}0`,
            'STEAM_0:0:11101',
            '[U:1:22202]',
            'https://steamcommunity.com/id/gabelogannewell',
            `https://example.com/profiles/${STEAM_ID_64}`,
        ]) {
            assert.equal(parseSteamAccountId(input), null, input);
        }
    });
});

describe('isVanityUrl', () => {
    it('detects custom profile URLs', () => {
        assert.equal(isVanityUrl('https://steamcommunity.com/id/gabelogannewell'), true);
        assert.equal(isVanityUrl('steamcommunity.com/ID/someone/'), true);
    });

    it('does not flag numeric profile links or IDs', () => {
        assert.equal(isVanityUrl(`https://steamcommunity.com/profiles/${STEAM_ID_64}`), false);
        assert.equal(isVanityUrl(STEAM_ID_64), false);
    });
});

describe('toSteamId64', () => {
    it('converts an account ID to a SteamID64', () => {
        assert.equal(toSteamId64(ACCOUNT_ID), STEAM_ID_64);
        assert.equal(toSteamId64(MAX_ACCOUNT_ID), '76561202255233023');
    });

    it('round-trips through parseSteamAccountId', () => {
        for (const accountId of [1, ACCOUNT_ID, MAX_ACCOUNT_ID]) {
            assert.equal(parseSteamAccountId(toSteamId64(accountId)), accountId);
        }
    });
});

describe('buildSteamProfileUrl', () => {
    it('links to the numeric profile', () => {
        assert.equal(
            buildSteamProfileUrl(ACCOUNT_ID),
            `https://steamcommunity.com/profiles/${STEAM_ID_64}`,
        );
    });
});
