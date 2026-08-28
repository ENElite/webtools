import { describe, expect, it } from 'vitest';

import { createJsonMediaSource } from '../infrastructure';
import { MediaSourceCatalog } from './media-source-catalog';

describe('MediaSourceCatalog', () => {
    it('keeps registrations scoped to the explicit catalog instance', () => {
        const first = new MediaSourceCatalog([createJsonMediaSource()]);
        const second = new MediaSourceCatalog();

        expect(first.ids()).toEqual(['json']);
        expect(second.ids()).toEqual([]);
        expect(() => second.get('json')).toThrow('Unknown media source');
    });

    it('rejects duplicate source ids', () => {
        expect(() => new MediaSourceCatalog([
            createJsonMediaSource(),
            createJsonMediaSource(),
        ])).toThrow('already registered');
    });
});
