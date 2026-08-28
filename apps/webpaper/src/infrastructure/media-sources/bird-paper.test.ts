import { describe, expect, it, vi } from 'vitest';

import { type FetchClient } from './http';
import { createBirdPaperSource } from './bird-paper';

function birdResponse(overrides: Record<string, unknown> = {}) {
    return {
        errno: 0,
        msg: '',
        data: {
            total_count: 21,
            total_page: 3,
            pageno: 2,
            count: 1,
            list: [{
                id: 'bird-1',
                category: '动漫卡通',
                tag: '国漫,风景',
                class_id: '26',
                url: 'http://cdn-hsyq-static.shanhutech.cn/bizhi/a.jpg',
            }],
        },
        ...overrides,
    };
}

describe('BirdPaper media source', () => {
    it('calls the same-origin BFF with encoded search parameters and parses pagination', async () => {
        const fetchMock = vi.fn<FetchClient>(async () => Response.json(birdResponse()));
        const source = createBirdPaperSource({ fetch: fetchMock });

        const page = await source.fetchPage({
            sourceId: 'bird-paper',
            page: 2,
            pageSize: 10,
            params: { mode: 'search', query: '猫 & 风景' },
        });

        const requestedUrl = new URL(String(fetchMock.mock.calls[0]?.[0]), 'https://webpaper.test');
        expect(requestedUrl.pathname).toBe('/api/media/birdpaper');
        expect(requestedUrl.searchParams.get('mode')).toBe('search');
        expect(requestedUrl.searchParams.get('query')).toBe('猫 & 风景');
        expect(requestedUrl.searchParams.get('page')).toBe('2');
        expect(requestedUrl.searchParams.get('count')).toBe('10');
        expect(page).toMatchObject({ hasMore: true, totalItems: 21, totalPages: 3 });
        expect(page.items[0]).toMatchObject({
            id: 'bird-paper:bird-1',
            sourceId: 'bird-paper',
            kind: 'image',
            url: 'https://cdn-hsyq-static.shanhutech.cn/bizhi/a.jpg',
        });
    });

    it('rejects endpoints that could bypass the BFF', async () => {
        const source = createBirdPaperSource({
            endpoint: 'http://wp.birdpaper.com.cn/intf/newestList',
            fetch: vi.fn<FetchClient>(),
        });

        await expect(source.fetchPage({
            sourceId: 'bird-paper',
            page: 1,
            params: { mode: 'latest' },
        })).rejects.toMatchObject({ code: 'invalid-query' });
    });

    it('rejects an upstream error and non-allowlisted insecure image URLs', async () => {
        const upstreamError = createBirdPaperSource({
            fetch: vi.fn<FetchClient>(async () => Response.json(birdResponse({ errno: 12, msg: 'busy' }))),
        });
        await expect(upstreamError.fetchPage({
            sourceId: 'bird-paper',
            page: 1,
            params: { mode: 'category', categoryId: '26' },
        })).rejects.toMatchObject({ code: 'upstream', message: 'busy' });

        const insecurePayload = birdResponse();
        insecurePayload.data.list[0]!.url = 'http://untrusted.example.test/image.jpg';
        const insecureImage = createBirdPaperSource({
            fetch: vi.fn<FetchClient>(async () => Response.json(insecurePayload)),
        });
        await expect(insecureImage.fetchPage({
            sourceId: 'bird-paper',
            page: 1,
            params: { mode: 'latest' },
        })).rejects.toMatchObject({ code: 'invalid-response' });
    });
});
