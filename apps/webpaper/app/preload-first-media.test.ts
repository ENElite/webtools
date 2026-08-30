import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactDom = vi.hoisted(() => ({ preload: vi.fn() }));

vi.mock('react-dom', () => ({ preload: reactDom.preload }));

import type { MediaPlayerInitialPage } from '../src/features/player';
import { preloadFirstMediaImage } from './preload-first-media';

describe('first media preload', () => {
    beforeEach(() => reactDom.preload.mockClear());

    it('emits a high-priority image preload for the first rendered media URL', () => {
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
                items: [{
                    id: 'konachan:1',
                    sourceId: 'konachan',
                    kind: 'image',
                    url: 'https://img.example.test/first.jpg',
                    raw: null,
                }],
            },
        };

        expect(preloadFirstMediaImage(initialPage)).toBe('https://img.example.test/first.jpg');
        expect(reactDom.preload).toHaveBeenCalledWith(
            'https://img.example.test/first.jpg',
            { as: 'image', fetchPriority: 'high' },
        );
    });

    it('emits nothing when server prefetch fell back to the client', () => {
        expect(preloadFirstMediaImage(null)).toBeNull();
        expect(reactDom.preload).not.toHaveBeenCalled();
    });
});
