import { describe, expect, it, vi } from 'vitest';

import type { FetchClient } from '../src/infrastructure';
import { prefetchDefaultKonachanPage } from './server-konachan-prefetch';

describe('default Konachan RSC prefetch', () => {
    it('fetches and normalizes the default first page from the upstream server', async () => {
        const fetchMock = vi.fn<FetchClient>(async () => Response.json([
            {
                id: 42,
                jpeg_url: '//img.example.test/42.jpg',
                preview_url: '//img.example.test/42-preview.jpg',
                jpeg_width: 1280,
                jpeg_height: 720,
            },
        ]));

        const initialPage = await prefetchDefaultKonachanPage({ fetch: fetchMock, timeoutMs: 1_000 });
        const requestedUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));

        expect(requestedUrl.origin).toBe('https://konachan.com');
        expect(requestedUrl.searchParams.get('page')).toBe('1');
        expect(requestedUrl.searchParams.get('limit')).toBe('12');
        expect(requestedUrl.searchParams.get('tags')).toBe('rating:safe');
        expect(initialPage).toMatchObject({
            selection: { sourceId: 'konachan', pageSize: 12 },
            page: {
                sourceId: 'konachan',
                page: 1,
                items: [{
                    id: 'konachan:42',
                    kind: 'image',
                    url: 'https://img.example.test/42.jpg',
                }],
            },
        });
    });

    it('returns null so the client can fall back when the upstream is unavailable', async () => {
        const initialPage = await prefetchDefaultKonachanPage({
            fetch: vi.fn<FetchClient>(async () => {
                throw new Error('offline');
            }),
            timeoutMs: 1_000,
        });

        expect(initialPage).toBeNull();
    });
});
