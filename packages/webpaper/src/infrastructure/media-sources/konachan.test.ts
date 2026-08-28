import { describe, expect, it, vi } from 'vitest';

import { type FetchClient } from './http';
import { createKonachanSource } from './konachan';

function konachanRecord(id: number) {
    return {
        id,
        file_url: `http://img.example.test/${id}/original.jpg`,
        jpeg_url: `//img.example.test/${id}/large.jpg`,
        preview_url: `http://img.example.test/${id}/preview.jpg`,
        width: 1920,
        height: 1080,
        jpeg_width: 1280,
        jpeg_height: 720,
    };
}

describe('Konachan media source', () => {
    it('encodes the query, validates records and reports page availability', async () => {
        const fetchMock = vi.fn<FetchClient>(async () => Response.json([
            konachanRecord(1),
            konachanRecord(2),
        ]));
        const source = createKonachanSource({ fetch: fetchMock });

        const page = await source.fetchPage({
            sourceId: 'konachan',
            page: 3,
            pageSize: 2,
            params: { tags: 'rating:safe cat & girl', quality: 'jpeg_url' },
        });

        const requestedUrl = new URL(String(fetchMock.mock.calls[0]?.[0]), 'https://webpaper.test');
        expect(requestedUrl.pathname).toBe('/api/konachan');
        expect(requestedUrl.searchParams.get('page')).toBe('3');
        expect(requestedUrl.searchParams.get('limit')).toBe('2');
        expect(requestedUrl.searchParams.get('tags')).toBe('rating:safe cat & girl');
        expect(page.hasMore).toBe(true);
        expect(page.items[0]).toMatchObject({
            id: 'konachan:1',
            sourceId: 'konachan',
            kind: 'image',
            url: 'https://img.example.test/1/large.jpg',
            previewUrl: 'https://img.example.test/1/preview.jpg',
            width: 1280,
            height: 720,
        });
    });

    it('forwards AbortSignal and classifies HTTP errors', async () => {
        const controller = new AbortController();
        const fetchMock = vi.fn<FetchClient>(async () => new Response('nope', { status: 503 }));
        const source = createKonachanSource({ fetch: fetchMock });

        const promise = source.fetchPage({
            sourceId: 'konachan',
            page: 1,
            params: {},
        }, { signal: controller.signal });

        await expect(promise).rejects.toMatchObject({
            code: 'http',
            status: 503,
            sourceId: 'konachan',
        });
        expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
    });

    it('rejects a structurally invalid response', async () => {
        const source = createKonachanSource({
            fetch: vi.fn<FetchClient>(async () => Response.json([{ id: 1 }])),
        });

        await expect(source.fetchPage({
            sourceId: 'konachan',
            page: 1,
            params: {},
        })).rejects.toMatchObject({ code: 'invalid-response' });
    });
});
