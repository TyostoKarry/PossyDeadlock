const DEADLOCK_APP_ID = '1422450';
const STEAM_NEWS_URL = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${DEADLOCK_APP_ID}&count=10&format=json`;

export const OFFICIAL_FEED = 'steam_community_announcements';

export interface SteamNewsPost {
    gid: string;
    title: string;
    url: string;
    author: string;
    contents: string;
    date: number;
    feedname: string;
}

interface SteamNewsResponse {
    appnews: {
        newsitems: SteamNewsPost[];
    };
}

export const fetchDeadlockNews = async (): Promise<SteamNewsPost[]> => {
    const response = await fetch(STEAM_NEWS_URL);
    if (!response.ok) throw new Error(`Steam API error: ${response.status}`);

    const data = (await response.json()) as SteamNewsResponse;
    return data.appnews.newsitems;
};
