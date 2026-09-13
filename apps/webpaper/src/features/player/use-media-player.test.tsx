/** @vitest-environment jsdom */

import { StrictMode, useEffect } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MediaSourceCatalog } from '../../application';
import type { ImageMediaItem, MediaPage, MediaSource } from '../../domain';
import type { JsonMediaQueryParams } from '../../infrastructure';
import type { ImagePreloadCache } from './image-preload-cache';
import { useMediaPlayer } from './use-media-player';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let mountedRoot: ReturnType<typeof createRoot> | null = null;

afterEach(async () => {
    if (!mountedRoot) return;
    await act(async () => mountedRoot?.unmount());
    mountedRoot = null;
});

describe('useMediaPlayer', () => {
    it('keeps the initial request alive across the Strict Mode effect replay', async () => {
        const request = createDeferred<MediaPage<ImageMediaItem>>();
        const signals: AbortSignal[] = [];
        const fetchPage = vi.fn<MediaSource<JsonMediaQueryParams, ImageMediaItem>['fetchPage']>(
            (_query, options) => {
                if (options?.signal) signals.push(options.signal);
                return request.promise;
            },
        );
        const catalog = new MediaSourceCatalog([{ id: 'json', fetchPage }]);
        const host = document.createElement('div');
        mountedRoot = createRoot(host);

        await act(async () => {
            mountedRoot?.render(
                <StrictMode>
                    <PlayerProbe catalog={catalog} />
                </StrictMode>,
            );
        });

        await act(async () => {
            request.resolve(page([image('loaded')]));
            await request.promise;
        });

        expect(fetchPage).toHaveBeenCalledTimes(1);
        expect(signals[0]?.aborted).toBe(false);
        expect(host.querySelector('output')?.textContent).toBe('ready:loaded');
    });

    it('still cancels a pending request when the component really unmounts', async () => {
        const request = createDeferred<MediaPage<ImageMediaItem>>();
        let signal: AbortSignal | undefined;
        const source: MediaSource<JsonMediaQueryParams, ImageMediaItem> = {
            id: 'json',
            fetchPage: (_query, options) => {
                signal = options?.signal;
                return request.promise;
            },
        };
        const catalog = new MediaSourceCatalog([source]);
        mountedRoot = createRoot(document.createElement('div'));

        await act(async () => {
            mountedRoot?.render(<PlayerProbe catalog={catalog} />);
        });
        expect(signal?.aborted).toBe(false);

        await act(async () => mountedRoot?.unmount());
        mountedRoot = null;
        expect(signal?.aborted).toBe(true);

        request.resolve(page([]));
        await request.promise;
    });

    it('preloads the next image and exposes it as immediately displayable after navigation', async () => {
        const ready = new Set<string>();
        const imagePreloadCache: ImagePreloadCache = {
            preload: vi.fn(async (url) => {
                ready.add(url);
                return true;
            }),
            isReady: (url) => ready.has(url),
            getStatus: (url) => ready.has(url) ? 'ready' : null,
            clear: () => ready.clear(),
        };
        const source: MediaSource<JsonMediaQueryParams, ImageMediaItem> = {
            id: 'json',
            fetchPage: async () => page([image('first'), image('second')]),
        };
        const catalog = new MediaSourceCatalog([source]);
        const host = document.createElement('div');
        mountedRoot = createRoot(host);

        await act(async () => {
            mountedRoot?.render(
                <ImageCacheProbe catalog={catalog} imagePreloadCache={imagePreloadCache} />,
            );
            await Promise.resolve();
        });

        expect(imagePreloadCache.preload).toHaveBeenCalledWith('/second.jpg');
        expect(host.querySelector('output')?.textContent).toBe('first:false');
        await act(async () => host.querySelector('button')?.click());
        expect(host.querySelector('output')?.textContent).toBe('second:true');
    });
});

function PlayerProbe({ catalog }: { readonly catalog: MediaSourceCatalog }) {
    const player = useMediaPlayer({ catalog });

    useEffect(() => {
        void player.controller.switchSource(TEST_SELECTION);
    }, [player.controller]);

    return <output>{player.status}:{player.currentMedia?.id ?? 'none'}</output>;
}

function ImageCacheProbe({
    catalog,
    imagePreloadCache,
}: {
    readonly catalog: MediaSourceCatalog;
    readonly imagePreloadCache: ImagePreloadCache;
}) {
    const player = useMediaPlayer({ catalog, imagePreloadCache });

    useEffect(() => {
        void player.controller.switchSource(TEST_SELECTION);
    }, [player.controller]);

    return (
        <>
            <output>{player.currentMedia?.id ?? 'none'}:{String(player.currentImagePreloaded)}</output>
            <button type='button' onClick={() => void player.controller.next()}>Next</button>
        </>
    );
}

const TEST_SELECTION = {
    sourceId: 'json',
    params: { content: '[]' },
} as const;

function image(id: string): ImageMediaItem {
    return {
        id,
        sourceId: 'json',
        kind: 'image',
        url: `/${id}.jpg`,
        raw: null,
    };
}

function page(items: readonly ImageMediaItem[]): MediaPage<ImageMediaItem> {
    return {
        sourceId: 'json',
        page: 1,
        pageSize: 10,
        items,
        hasMore: false,
    };
}

interface Deferred<T> {
    readonly promise: Promise<T>;
    readonly resolve: (value: T) => void;
}

function createDeferred<T>(): Deferred<T> {
    let resolvePromise: ((value: T) => void) | undefined;
    const promise = new Promise<T>((resolve) => {
        resolvePromise = resolve;
    });
    return {
        promise,
        resolve(value) {
            resolvePromise?.(value);
        },
    };
}
