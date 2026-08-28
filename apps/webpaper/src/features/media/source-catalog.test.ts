import { describe, expect, it } from 'vitest';

import type { FetchClient } from '../../infrastructure';
import { createWebPaperMediaCatalog, MEDIA_SOURCE_OPTIONS } from './source-catalog';

describe('webpaper media catalog', () => {
    it('explicitly registers Konachan, BirdPaper and JSON per catalog instance', () => {
        const fetchClient: FetchClient = async () => Response.json([]);
        const first = createWebPaperMediaCatalog({ fetch: fetchClient });
        const second = createWebPaperMediaCatalog({ fetch: fetchClient });

        expect(first.ids()).toEqual(['konachan', 'bird-paper', 'json']);
        expect(second.ids()).toEqual(['konachan', 'bird-paper', 'json']);
        expect(first).not.toBe(second);
        expect(MEDIA_SOURCE_OPTIONS.map(({ id }) => id)).toEqual(first.ids());
    });
});
