/** @vitest-environment jsdom */

import { StrictMode, useEffect } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MediaSourceCatalog } from '../../application';
import type { ImageMediaItem, MediaPage, MediaSource } from '../../domain';
import type { JsonMediaQueryParams } from '../../infrastructure';
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
});

function PlayerProbe({ catalog }: { readonly catalog: MediaSourceCatalog }) {
    const player = useMediaPlayer({ catalog });

    useEffect(() => {
        void player.controller.switchSource(TEST_SELECTION);
    }, [player.controller]);

    return <output>{player.status}:{player.currentMedia?.id ?? 'none'}</output>;
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
