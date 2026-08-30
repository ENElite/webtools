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
    });
});
