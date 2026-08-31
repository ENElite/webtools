import { describe, expect, it } from 'vitest';

import { buildKonachanTags, findKonachanRating, sanitizeKonachanUserTags } from './konachan-tags';

describe('Konachan tags', () => {
    it('deduplicates user tags and injects exactly one selected rating', () => {
        expect(buildKonachanTags(
            'cat rating:safe cat RATING:explicit landscape rating:unknown',
            'questionable',
        )).toBe('cat landscape rating:questionable');
    });

    it('keeps user tags separate and can read a legacy known rating', () => {
        expect(sanitizeKonachanUserTags('blue_hair rating:explicit blue_hair')).toBe('blue_hair');
        expect(findKonachanRating('blue_hair RATING:Explicit')).toBe('explicit');
        expect(findKonachanRating('blue_hair rating:questionableless')).toBe('questionableless');
        expect(findKonachanRating('blue_hair rating:questionableplus')).toBe('questionableplus');
    });

    it.each([
        ['questionableless', 'rating:questionableless'],
        ['questionableplus', 'rating:questionableplus'],
    ] as const)('builds the combined %s rating tag', (rating, expectedTag) => {
        expect(buildKonachanTags('cat rating:safe', rating)).toBe(`cat ${expectedTag}`);
    });
});
