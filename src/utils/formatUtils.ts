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

export const extractNewsImageUrl = (content: string): string | null => {
    const match = content.match(/<img[^>]+src="([^"]+)"/i);
    return match?.[1] ?? null;
};

export const fetchNewsOgImageUrl = async (url: string): Promise<string | null> => {
    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) return null;

        const html = await response.text();
        return html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1] ?? null;
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

export const splitIntoSections = (text: string): string[] => {
    // Replace section headers with placeholders before any stripping
    const headerRegex = /\\?\[ ([A-Z][A-Za-z &]+) \]/g;
    const withPlaceholders = text.replace(headerRegex, '\n%%SECTION%%$1%%SECTION%%\n');

    const parts = withPlaceholders.split(/(?=\n%%SECTION%%)/).filter((s) => s.trim().length > 0);

    const chunks: string[] = [];

    for (const part of parts) {
        // Restore header formatting after stripping
        const cleaned = stripHtml(part)
            .replace(/%%SECTION%%([^%]+)%%SECTION%%/g, '[ $1 ]')
            .trim();

        if (!cleaned) continue;

        // If a single section somehow exceeds discord's 2000 character limit, split it further
        if (cleaned.length <= 2000) {
            chunks.push(cleaned);
        } else {
            const lines = cleaned.split('\n');
            let current = '';
            for (const line of lines) {
                if ((current + '\n' + line).length > 2000) {
                    if (current) chunks.push(current.trim());
                    current = line;
                } else {
                    current = current ? current + '\n' + line : line;
                }
            }
            if (current) chunks.push(current.trim());
        }
    }

    return chunks.length > 0 ? chunks : [stripHtml(text).slice(0, 2000)];
};

export const formatRelativeTime = (utcDateString: string): string => {
    const updatedAt = new Date(`${utcDateString.replace(' ', 'T')}Z`);
    const diffMinutes = Math.floor((Date.now() - updatedAt.getTime()) / 60000);

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
};
