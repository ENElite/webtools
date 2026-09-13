/** @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';

import { createImagePreloadCache } from './image-preload-cache';

describe('image preload cache', () => {
    it('deduplicates requests and marks loaded images ready for immediate display', async () => {
        const images: HTMLImageElement[] = [];
        const cache = createImagePreloadCache({
            createImage: () => {
                const image = document.createElement('img');
                image.decode = vi.fn(async () => undefined);
                images.push(image);
                return image;
            },
        });

        const first = cache.preload('/next.jpg');
        const duplicate = cache.preload('/next.jpg');
        expect(duplicate).toBe(first);
        expect(images).toHaveLength(1);
        expect(images[0]).toMatchObject({
            decoding: 'async',
            fetchPriority: 'low',
            referrerPolicy: 'no-referrer',
        });
        expect(cache.getStatus('/next.jpg')).toBe('loading');

        images[0]?.onload?.(new Event('load'));
        await expect(first).resolves.toBe(true);
        expect(cache.isReady('/next.jpg')).toBe(true);
        expect(images[0]?.decode).toHaveBeenCalledOnce();
    });

    it('drops failed and least-recently-used entries so they can be retried', async () => {
        const images: HTMLImageElement[] = [];
        const cache = createImagePreloadCache({
            capacity: 2,
            createImage: () => {
                const image = document.createElement('img');
                images.push(image);
                return image;
            },
        });

        const failed = cache.preload('/failed.jpg');
        images[0]?.onerror?.(new Event('error'));
        await expect(failed).resolves.toBe(false);
        expect(cache.getStatus('/failed.jpg')).toBeNull();

        void cache.preload('/first.jpg');
        void cache.preload('/second.jpg');
        void cache.preload('/third.jpg');
        expect(cache.getStatus('/first.jpg')).toBeNull();
        expect(cache.getStatus('/second.jpg')).toBe('loading');
        expect(cache.getStatus('/third.jpg')).toBe('loading');

        void cache.preload('/failed.jpg');
        expect(images).toHaveLength(5);
    });

    it('is inert during server rendering and validates its capacity', async () => {
        const cache = createImagePreloadCache({ createImage: () => null });
        await expect(cache.preload('/server.jpg')).resolves.toBe(false);
        expect(cache.isReady('/server.jpg')).toBe(false);
        expect(() => createImagePreloadCache({ capacity: 0 })).toThrow(RangeError);
    });
});
