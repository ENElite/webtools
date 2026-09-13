import { describe, expect, it, vi } from 'vitest';

import { MediaSourceCatalog } from '../../application';
import type { ImageMediaItem, MediaPage, MediaSource } from '../../domain';
import type { JsonMediaQueryParams } from '../../infrastructure';
import { createMediaPlayerController } from './media-player-controller';

function image(id: string): ImageMediaItem {
    return {
        id,
        sourceId: 'json',
        kind: 'image',
        url: `/${id}.jpg`,
        raw: null,
    };
}

function page(pageNumber: number, items: readonly ImageMediaItem[], hasMore: boolean): MediaPage<ImageMediaItem> {
    return {
        sourceId: 'json',
        page: pageNumber,
        pageSize: 2,
        items,
        hasMore,
    };
}

describe('media player controller', () => {
    it('hydrates a server page without requesting it again and continues at page two', async () => {
        const fetchPage = vi.fn<MediaSource<JsonMediaQueryParams, ImageMediaItem>['fetchPage']>(
            async () => page(2, [image('c')], false),
        );
        const catalog = new MediaSourceCatalog([{ id: 'json', fetchPage }]);
        const selection = { sourceId: 'json', params: { content: '[]' }, pageSize: 2 } as const;
        const controller = createMediaPlayerController({
            catalog,
            initialPage: {
                selection,
                page: page(1, [image('a'), image('b')], true),
            },
        });

        expect(controller.getSnapshot()).toMatchObject({ page: 1, status: 'ready', hasMore: true });
        expect(controller.getSnapshot().session.items.map(({ id }) => id)).toEqual(['a', 'b']);

        await controller.switchSource({
            sourceId: 'json',
            params: { content: '[]' },
            pageSize: 2,
        });
        expect(fetchPage).not.toHaveBeenCalled();

        await controller.loadMore();
        expect(fetchPage).toHaveBeenCalledOnce();
        expect(fetchPage.mock.calls[0]?.[0].page).toBe(2);
        expect(controller.getSnapshot().session.items.map(({ id }) => id)).toEqual(['a', 'b', 'c']);
    });

    it('combines pagination, prefetch and the pure player session state', async () => {
        const fetchPage = vi.fn<MediaSource<JsonMediaQueryParams, ImageMediaItem>['fetchPage']>(
            async (query) => query.page === 1
                ? page(1, [image('a'), image('b')], true)
                : page(2, [image('b'), image('c')], false),
        );
        const catalog = new MediaSourceCatalog([{ id: 'json', fetchPage }]);
        const controller = createMediaPlayerController({ catalog, prefetchThreshold: 1 });

        await controller.switchSource({ sourceId: 'json', params: { content: '[]' }, pageSize: 2 });
        expect(controller.getSnapshot().session.items.map(({ id }) => id)).toEqual(['a', 'b']);

        await controller.next();
        await controller.loadMore();
        const state = controller.getSnapshot();
        expect(state.session.items.map(({ id }) => id)).toEqual(['a', 'b', 'c']);
        expect(state.session.history.map(({ id }) => id)).toEqual(['a', 'b']);
        expect(state.hasMore).toBe(false);
        expect(fetchPage).toHaveBeenCalledTimes(2);

        controller.selectHistory(0);
        expect(controller.getSnapshot().session.mode).toEqual({ kind: 'history', cursor: 0 });
        await controller.next();
        expect(controller.getSnapshot().session.mode).toEqual({ kind: 'history', cursor: 1 });
        controller.leaveHistory();
        expect(controller.getSnapshot().session.mode).toEqual({ kind: 'current' });

        controller.startAutoplay(2_000);
        expect(controller.getSnapshot().session.autoplay).toEqual({ kind: 'running', intervalMs: 2_000 });
        expect('timerId' in controller.getSnapshot()).toBe(false);
        await controller.autoplayTick();
        expect(controller.getSnapshot().session.cursor).toBe(2);
        await controller.autoplayTick();
        expect(controller.getSnapshot().session.autoplay).toEqual({ kind: 'stopped' });
    });

    it('aborts an obsolete source switch and ignores its late result', async () => {
        const requests: Array<{
            readonly signal: AbortSignal | undefined;
            readonly deferred: Deferred<MediaPage<ImageMediaItem>>;
        }> = [];
        const source: MediaSource<JsonMediaQueryParams, ImageMediaItem> = {
            id: 'json',
            fetchPage: (_query, options) => {
                const deferred = createDeferred<MediaPage<ImageMediaItem>>();
                requests.push({ signal: options?.signal, deferred });
                return deferred.promise;
            },
        };
        const controller = createMediaPlayerController({
            catalog: new MediaSourceCatalog([source]),
        });

        const firstSwitch = controller.switchSource({ sourceId: 'json', params: { content: 'first' } });
        const secondSwitch = controller.switchSource({ sourceId: 'json', params: { content: 'second' } });
        expect(requests[0]?.signal?.aborted).toBe(true);

        requests[1]?.deferred.resolve(page(1, [image('new')], false));
        await secondSwitch;
        requests[0]?.deferred.resolve(page(1, [image('stale')], false));
        await firstSwitch;

        expect(controller.getSnapshot().session.items.map(({ id }) => id)).toEqual(['new']);
        expect(controller.getSnapshot().status).toBe('ready');
    });

    it('automatically advances after a media error and stops at the final item', async () => {
        const source: MediaSource<JsonMediaQueryParams, ImageMediaItem> = {
            id: 'json',
            fetchPage: async () => page(1, [image('a'), image('b')], false),
        };
        const controller = createMediaPlayerController({
            catalog: new MediaSourceCatalog([source]),
        });
        await controller.switchSource({ sourceId: 'json', params: { content: '[]' } });
        controller.startAutoplay(5_000);

        await controller.handleMediaError();
        expect(controller.getSnapshot().session.cursor).toBe(1);
        expect(controller.getSnapshot().session.autoplay.kind).toBe('running');

        await controller.handleMediaError();
        expect(controller.getSnapshot().session.cursor).toBe(1);
        expect(controller.getSnapshot().session.autoplay.kind).toBe('stopped');
    });
});

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
