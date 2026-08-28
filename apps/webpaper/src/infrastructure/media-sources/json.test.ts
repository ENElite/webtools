import { describe, expect, it } from 'vitest';

import { createJsonMediaSource } from './json';

describe('JSON media source', () => {
    it('parses the discriminated media union and paginates local content', async () => {
        const source = createJsonMediaSource();
        const content = JSON.stringify([
            { id: 'cover', type: 'image', url: '/cover.jpg', width: 100 },
            { id: 'clip', type: 'video', url: '/clip.mp4', preview: '/poster.jpg' },
            { id: 'tail', url: '/tail.jpg' },
        ]);

        const firstPage = await source.fetchPage({
            sourceId: 'json',
            page: 1,
            pageSize: 2,
            params: { content },
        });
        const secondPage = await source.fetchPage({
            sourceId: 'json',
            page: 2,
            pageSize: 2,
            params: { content },
        });

        expect(firstPage.hasMore).toBe(true);
        expect(firstPage.totalPages).toBe(2);
        expect(firstPage.items[0]).toMatchObject({ id: 'json:cover', kind: 'image' });
        expect(firstPage.items[1]).toMatchObject({
            id: 'json:clip',
            kind: 'video',
            posterUrl: '/poster.jpg',
        });
        expect(secondPage.hasMore).toBe(false);
        expect(secondPage.items).toHaveLength(1);
    });

    it('reports invalid JSON and malformed records', async () => {
        const source = createJsonMediaSource();
        await expect(source.fetchPage({
            sourceId: 'json',
            page: 1,
            params: { content: '{' },
        })).rejects.toMatchObject({ code: 'invalid-response' });

        await expect(source.fetchPage({
            sourceId: 'json',
            page: 1,
            params: { content: '[{"id":"missing-url"}]' },
        })).rejects.toMatchObject({ code: 'invalid-response' });
    });
});
