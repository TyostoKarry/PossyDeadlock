const STEAM64_BASE = 76561197960265728n;
const MAX_ACCOUNT_ID = 4294967295;

const STEAM64_PATTERN = /^\d{17}$/;
const ACCOUNT_ID_PATTERN = /^\d{1,10}$/;
const PROFILE_URL_PATTERN =
    /^(?:https?:\/\/)?(?:www\.)?steamcommunity\.com\/profiles\/(\d{17})(?:[/?#].*)?$/i;
const VANITY_URL_PATTERN = /steamcommunity\.com\/id\//i;

const isValidAccountId = (accountId: number): boolean =>
    accountId >= 1 && accountId <= MAX_ACCOUNT_ID;

export const parseSteamAccountId = (input: string): number | null => {
    const trimmed = input.trim();
    const steamId64 = trimmed.match(PROFILE_URL_PATTERN)?.[1] ?? trimmed;

    if (STEAM64_PATTERN.test(steamId64)) {
        const accountId = Number(BigInt(steamId64) - STEAM64_BASE);
        return isValidAccountId(accountId) ? accountId : null;
    }

    if (ACCOUNT_ID_PATTERN.test(trimmed)) {
        const accountId = Number(trimmed);
        return isValidAccountId(accountId) ? accountId : null;
    }

    return null;
};

export const isVanityUrl = (input: string): boolean => VANITY_URL_PATTERN.test(input);

export const toSteamId64 = (accountId: number): string =>
    (BigInt(accountId) + STEAM64_BASE).toString();

export const buildSteamProfileUrl = (accountId: number): string =>
    `https://steamcommunity.com/profiles/${toSteamId64(accountId)}`;
