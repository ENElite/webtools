export const KONACHAN_RATINGS = [
    'safe',
    'questionableless',
    'questionable',
    'questionableplus',
    'explicit',
] as const;

export type KonachanRating = (typeof KONACHAN_RATINGS)[number];

const RATING_TAG = /^rating:[^\s]*$/i;
const KNOWN_RATING_TAG = /^rating:(safe|questionableless|questionable|questionableplus|explicit)$/i;

function tagSet(tags: string): Set<string> {
    return new Set(tags.split(/\s+/u).map((tag) => tag.trim()).filter(Boolean));
}

export function sanitizeKonachanUserTags(tags: string): string {
    return [...tagSet(tags)].filter((tag) => !RATING_TAG.test(tag)).join(' ');
}

export function buildKonachanTags(tags: string, rating: KonachanRating): string {
    const uniqueTags = tagSet(sanitizeKonachanUserTags(tags));
    uniqueTags.add(`rating:${rating}`);
    return [...uniqueTags].join(' ');
}

export function findKonachanRating(tags: string): KonachanRating | undefined {
    for (const tag of tagSet(tags)) {
        const match = KNOWN_RATING_TAG.exec(tag);
        if (match?.[1]) return match[1].toLowerCase() as KonachanRating;
    }
    return undefined;
}
