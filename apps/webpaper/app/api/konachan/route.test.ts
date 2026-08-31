import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('Konachan BFF', () => {
    it('forwards queries to the unrestricted upstream origin', async () => {
        const fetchMock = vi.fn().mockResolvedValue(Response.json([]));
        vi.stubGlobal('fetch', fetchMock);

        const response = await GET(new Request(
            'https://webpaper.test/api/konachan?page=2&limit=12&tags=rating%3Aquestionableplus',
        ));

        expect(response.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledOnce();
        const [target] = fetchMock.mock.calls[0] as [URL, RequestInit];
        expect(target.origin).toBe('https://konachan.com');
        expect(target.pathname).toBe('/post.json');
        expect(target.searchParams.get('page')).toBe('2');
        expect(target.searchParams.get('limit')).toBe('12');
        expect(target.searchParams.get('tags')).toBe('rating:questionableplus');
    });
});
