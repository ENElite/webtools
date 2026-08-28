import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('BirdPaper BFF', () => {
    it('maps a latest request to the fixed upstream origin', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ errno: 0, data: {} }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));
        vi.stubGlobal('fetch', fetchMock);

        const response = await GET(new Request('https://webpaper.test/api/media/birdpaper?mode=latest&page=2&count=12'));

        expect(response.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledOnce();
        const [target] = fetchMock.mock.calls[0] as [URL, RequestInit];
        expect(target.origin).toBe('http://wp.birdpaper.com.cn');
        expect(target.pathname).toBe('/intf/newestList');
        expect(target.searchParams.get('pageno')).toBe('2');
        expect(target.searchParams.get('count')).toBe('12');
    });

    it('encodes search text through URLSearchParams', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ errno: 0, data: {} })));
        vi.stubGlobal('fetch', fetchMock);

        await GET(new Request('https://webpaper.test/api/media/birdpaper?mode=search&query=%E9%B8%9F%20wallpaper'));

        const [target] = fetchMock.mock.calls[0] as [URL, RequestInit];
        expect(target.pathname).toBe('/intf/search');
        expect(target.searchParams.get('content')).toBe('鸟 wallpaper');
    });

    it('rejects invalid input without contacting the upstream', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const response = await GET(new Request('https://webpaper.test/api/media/birdpaper?mode=category&categoryId=../../admin'));

        expect(response.status).toBe(400);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
