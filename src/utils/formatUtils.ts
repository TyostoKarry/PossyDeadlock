export const encodePostUrl = (url: string): string | null => {
    try {
        const encoded = encodeURI(url);
        const parsed = new URL(encoded);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return encoded;
        }
        return null;
    } catch {
        return null;
    }
};

export const stripHtml = (text: string): string => {
    return text
        .replace(/\[p\]/gi, '\n')
        .replace(/\[\/p\]/gi, '')
        .replace(/\[b\]|\[\/b\]/gi, '')
        .replace(/\[u\]|\[\/u\]/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/\{STEAM_CLAN_IMAGE\}[^\s]*/g, '')
        .replace(/\[.*?\]/g, '')
        .replace(/\\(?=\[|\s)/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};
