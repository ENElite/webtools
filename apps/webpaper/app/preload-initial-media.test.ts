import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactDom = vi.hoisted(() => ({ preload: vi.fn() }));

vi.mock('react-dom', () => ({ preload: reactDom.preload }));

import type { MediaPlayerInitialPage } from '../src/features/player';
import { preloadInitialMediaImages } from './preload-initial-media';

describe('initial media preloads', () => {
    beforeEach(() => reactDom.preload.mockClear());

    it('prioritizes the current image and warms the next image at low priority', () => {
        const initialPage: MediaPlayerInitialPage = {
            selection: {
                sourceId: 'konachan',
                pageSize: 12,
                params: { tags: 'rating:safe', rating: 'safe', quality: 'jpeg_url' },
            },
            page: {
                sourceId: 'konachan',
                page: 1,
                pageSize: 12,
                hasMore: true,
                items: [
                    {
                        id: 'konachan:1',
                        sourceId: 'konachan',
                        kind: 'image',
                        url: 'https://img.example.test/first.jpg',
                        raw: null,
                    },
                    {
                        id: 'konachan:2',
                        sourceId: 'konachan',
                        kind: 'image',
                        url: 'https://img.example.test/second.jpg',
                        raw: null,
                    },
                ],
            },
        };

        expect(preloadInitialMediaImages(initialPage)).toEqual({
            current: 'https://img.example.test/first.jpg',
            next: 'https://img.example.test/second.jpg',
        });
        expect(reactDom.preload).toHaveBeenNthCalledWith(
            1,
            'https://img.example.test/first.jpg',
            { as: 'image', fetchPriority: 'high' },
        );
        expect(reactDom.preload).toHaveBeenNthCalledWith(
            2,
            'https://img.example.test/second.jpg',
            { as: 'image', fetchPriority: 'low' },
        );
    });

    it('emits nothing when server prefetch fell back to the client', () => {
        expect(preloadInitialMediaImages(null)).toEqual({ current: null, next: null });
        expect(reactDom.preload).not.toHaveBeenCalled();
    });
});
