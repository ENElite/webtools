import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    DEFAULT_KONACHAN_SETTINGS,
    buildKonachanPreviewUrl,
    buildKonachanQuery,
    pickKonachanUrl,
    type KonachanProviderSettings,
} from '@webpaper/providers/konachan/schema';
import { KonachanAdapter } from '@webpaper/providers/konachan/adapter';

function makeImage(id: number) {
    return {
        id,
        file_url: `https://img/${id}.jpg`,
        jpeg_url: `https://img/${id}.jpeg`,
        sample_url: `https://img/${id}.sample`,
        preview_url: `https://img/${id}.preview`,
    };
}

function createSettings(patch: Partial<KonachanProviderSettings> = {}): KonachanProviderSettings {
    return {
        ...DEFAULT_KONACHAN_SETTINGS,
        ...patch,
    };
}

describe('Konachan provider', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('builds query tags from filters', () => {
        const query = buildKonachanQuery(createSettings({
            page: 3,
            tags: 'cat, dog',
            rating: 'rating:safe',
            widthOperator: 'gte',
            widthValue: 1920,
            heightOperator: 'lte',
            heightValue: 1080,
        }));

        expect(query).toEqual({
            page: 3,
            tags: 'width:1920..+height:..1080+rating:safe+cat+dog',
        });
    });

    it('builds preview url from settings', () => {
        const previewUrl = buildKonachanPreviewUrl(createSettings({ page: 7, tags: 'loli' }));

        expect(previewUrl).toContain('page=7');
        expect(previewUrl).toContain('tags=rating:safe');
    });

    it('picks quality with fallback', () => {
        const image = makeImage(10);

        expect(pickKonachanUrl(image, 'sample_url')).toBe('https://img/10.sample');
        expect(pickKonachanUrl(image, 'unknown')).toBe('https://img/10.jpg');
    });

    it('normalizes and reports pagination', () => {
        const normalized = KonachanAdapter.normalize([makeImage(1), makeImage(2)] as never, { quality: 'preview_url' });

        expect(normalized).toEqual([
            expect.objectContaining({ id: 'Konachan-1', url: 'https://img/1.preview' }),
            expect.objectContaining({ id: 'Konachan-2', url: 'https://img/2.preview' }),
        ]);
        expect(KonachanAdapter.hasMore([makeImage(1)] as never, 1)).toBe(false);
    });

    it('fetches with manual query building', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => [makeImage(5)],
        });
        vi.stubGlobal('fetch', fetchMock);

        const result = await KonachanAdapter.fetch('/api/konachan', { tags: 'fox', quality: 'file_url' }, 4);

        expect(fetchMock).toHaveBeenCalledWith(
            '/api/konachan?tags=fox&quality=file_url&page=4&limit=10',
            expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/json' }) }),
        );
        expect(result.data).toHaveLength(1);
        expect(result.hasMore).toBe(false);
    });
});
