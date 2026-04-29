export type KonachanPost = {
    id: number;
    tags: string;
    rating: string;
    width: number;
    height: number;
    file_url?: string;
    jpeg_url?: string;
    sample_url?: string;
    preview_url?: string;
    source?: string;
};

export type KonachanQuery = {
    page?: number;
    tags?: string;
    limit?: number;
};

const KONACHAN_ENDPOINT = 'https://konachan.net/post.json';

function sanitizePage(value: number | undefined): number {
    if (!Number.isFinite(value)) {
        return 1;
    }

    return Math.max(1, Math.floor(value ?? 1));
}

function sanitizeLimit(value: number | undefined): number {
    if (!Number.isFinite(value)) {
        return 20;
    }

    return Math.max(1, Math.min(40, Math.floor(value ?? 20)));
}

function sanitizeTags(value: string | undefined): string {
    if (!value) {
        return 'loli';
    }

    return value
        .split(/[\s+]+/)
        .map((item) => item.trim().replace(/[^A-Za-z0-9_.:()-]/g, ''))
        .filter(Boolean)
        .slice(0, 8)
        .join('+') || 'loli';
}

export async function fetchKonachanPosts(query: KonachanQuery): Promise<KonachanPost[]> {
    const page = sanitizePage(query.page);
    const limit = sanitizeLimit(query.limit);
    const tags = sanitizeTags(query.tags);
    const endpoint = `${KONACHAN_ENDPOINT}?page=${page}&limit=${limit}&tags=${encodeURIComponent(tags)}`;

    const response = await fetch(endpoint, {
        headers: {
            Accept: 'application/json',
        },
        next: {
            revalidate: 20,
        },
    });

    if (!response.ok) {
        throw new Error(`Konachan request failed: ${response.status}`);
    }

    const data = (await response.json()) as unknown;
    if (!Array.isArray(data)) {
        throw new Error('Konachan response is not an array');
    }

    return data as KonachanPost[];
}

export function pickDisplayUrl(post: KonachanPost): string {
    return post.jpeg_url || post.sample_url || post.file_url || post.preview_url || '';
}
