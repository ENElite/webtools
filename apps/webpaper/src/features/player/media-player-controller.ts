import type { MediaSourceCatalog } from '../../application';
import {
    createPlayerSession,
    MediaSourceError,
    reducePlayerSession,
    selectCurrentMedia,
    type MediaItem,
    type PlayerSession,
    type PlayerSessionEvent,
} from '../../domain';
import type { MediaSourceSelection } from '../media';

export type MediaPlayerLoadStatus = 'idle' | 'loading' | 'loading-more' | 'ready' | 'error';

export interface MediaPlayerState {
    readonly session: PlayerSession;
    readonly selection: MediaSourceSelection | null;
    /** Last successfully loaded remote/local page. */
    readonly page: number;
    readonly hasMore: boolean;
    readonly status: MediaPlayerLoadStatus;
    readonly error: Error | null;
}

export interface CreateMediaPlayerControllerOptions {
    readonly catalog: MediaSourceCatalog;
    /** Starts prefetching once this many loaded items remain after the cursor. */
    readonly prefetchThreshold?: number;
}

export interface MediaPlayerController {
    getSnapshot(): MediaPlayerState;
    subscribe(listener: () => void): () => void;
    switchSource(selection: MediaSourceSelection): Promise<boolean>;
    loadMore(): Promise<boolean>;
    prefetch(): Promise<boolean>;
    navigate(delta: number): Promise<void>;
    next(): Promise<void>;
    previous(): Promise<void>;
    select(cursor: number): void;
    selectHistory(cursor: number): void;
    leaveHistory(): void;
    startAutoplay(intervalMs: number): void;
    stopAutoplay(): void;
    autoplayTick(): Promise<void>;
    handleMediaError(): Promise<void>;
    cancelLoad(): void;
    dispose(): void;
}

const INITIAL_STATE: MediaPlayerState = {
    session: createPlayerSession(),
    selection: null,
    page: 0,
    hasMore: false,
    status: 'idle',
    error: null,
};

/**
 * Owns the asynchronous application workflow while delegating all playback
 * transitions to the pure PlayerSession reducer.
 */
export function createMediaPlayerController(
    options: CreateMediaPlayerControllerOptions,
): MediaPlayerController {
    const prefetchThreshold = Math.max(0, Math.round(options.prefetchThreshold ?? 2));
    const listeners = new Set<() => void>();
    let state = INITIAL_STATE;
    let requestRevision = 0;
    let activeRequest: ActiveRequest | null = null;
    let disposed = false;

    const emit = (): void => {
        for (const listener of listeners) listener();
    };

    const replaceState = (nextState: MediaPlayerState): void => {
        if (disposed || nextState === state) return;
        state = nextState;
        emit();
    };

    const patchState = (patch: Partial<MediaPlayerState>): void => {
        replaceState({ ...state, ...patch });
    };

    const dispatch = (event: PlayerSessionEvent): void => {
        const session = reducePlayerSession(state.session, event);
        if (session !== state.session) patchState({ session });
    };

    const requestPage = (page: number, replace: boolean): Promise<boolean> => {
        const selection = state.selection;
        if (!selection || disposed) return Promise.resolve(false);

        const revision = requestRevision;
        const abortController = new AbortController();
        patchState({
            status: replace ? 'loading' : 'loading-more',
            error: null,
        });

        const promise = (async (): Promise<boolean> => {
            try {
                const response = await options.catalog.fetchPage({
                    sourceId: selection.sourceId,
                    page,
                    params: selection.params,
                    ...(selection.pageSize === undefined ? {} : { pageSize: selection.pageSize }),
                }, { signal: abortController.signal });

                if (disposed || revision !== requestRevision || abortController.signal.aborted) {
                    return false;
                }

                const items = replace
                    ? response.items
                    : uniqueNewItems(state.session.items, response.items);
                const session = reducePlayerSession(state.session, {
                    type: replace ? 'items.replaced' : 'items.appended',
                    items,
                });
                replaceState({
                    ...state,
                    session,
                    page: response.page,
                    hasMore: response.hasMore,
                    status: 'ready',
                    error: null,
                });
                return true;
            } catch (cause) {
                if (disposed || revision !== requestRevision || isAbort(cause, abortController.signal)) {
                    return false;
                }

                patchState({
                    status: 'error',
                    error: toError(cause),
                });
                return false;
            } finally {
                if (activeRequest?.controller === abortController) activeRequest = null;
            }
        })();

        activeRequest = { controller: abortController, promise };
        return promise;
    };

    const loadMore = (): Promise<boolean> => {
        if (!state.selection || !state.hasMore || disposed) return Promise.resolve(false);
        if (activeRequest) return activeRequest.promise;
        return requestPage(state.page + 1, false);
    };

    const prefetch = (): Promise<boolean> => {
        if (state.session.mode.kind !== 'current' || state.session.cursor === null) {
            return Promise.resolve(false);
        }
        const remaining = state.session.items.length - state.session.cursor - 1;
        return remaining <= prefetchThreshold ? loadMore() : Promise.resolve(false);
    };

    const navigate = async (delta: number): Promise<void> => {
        if (!Number.isInteger(delta) || delta === 0) return;
        if (state.session.mode.kind === 'history') {
            dispatch({ type: 'navigation.moved', delta });
            return;
        }

        const cursor = state.session.cursor;
        if (cursor === null) return;
        const desiredCursor = cursor + delta;
        while (desiredCursor >= state.session.items.length && state.hasMore) {
            const previousLength = state.session.items.length;
            const loaded = await loadMore();
            if (!loaded || state.session.items.length === previousLength) break;
        }
        dispatch({ type: 'navigation.selected', cursor: desiredCursor });
        if (delta > 0) void prefetch();
    };

    const controller: MediaPlayerController = {
        getSnapshot: () => state,
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        async switchSource(selection) {
            requestRevision += 1;
            activeRequest?.controller.abort();
            activeRequest = null;
            replaceState({
                session: createPlayerSession(),
                selection,
                page: Math.max(0, (selection.initialPage ?? 1) - 1),
                hasMore: true,
                status: 'idle',
                error: null,
            });
            return requestPage(selection.initialPage ?? 1, true);
        },
        loadMore,
        prefetch,
        navigate,
        next: () => navigate(1),
        previous: () => navigate(-1),
        select(cursor) {
            dispatch({ type: 'navigation.selected', cursor });
            void prefetch();
        },
        selectHistory(cursor) {
            dispatch({ type: 'history.entered', cursor });
        },
        leaveHistory() {
            dispatch({ type: 'history.left' });
        },
        startAutoplay(intervalMs) {
            dispatch({ type: 'autoplay.started', intervalMs });
        },
        stopAutoplay() {
            dispatch({ type: 'autoplay.stopped' });
        },
        async autoplayTick() {
            if (state.session.autoplay.kind !== 'running' || state.session.mode.kind === 'history') return;
            const atLoadedEnd = state.session.cursor !== null
                && state.session.cursor >= state.session.items.length - 1;
            if (atLoadedEnd && state.hasMore) await loadMore();
            dispatch({ type: 'autoplay.tick' });
            void prefetch();
        },
        async handleMediaError() {
            const failedItem = selectCurrentMedia(state.session);
            await navigate(1);
            if (selectCurrentMedia(state.session)?.id === failedItem?.id) {
                dispatch({ type: 'autoplay.stopped' });
            }
        },
        cancelLoad() {
            if (!activeRequest) return;
            requestRevision += 1;
            activeRequest.controller.abort();
            activeRequest = null;
            patchState({
                status: state.session.items.length > 0 ? 'ready' : 'idle',
                error: null,
            });
        },
        dispose() {
            if (disposed) return;
            disposed = true;
            requestRevision += 1;
            activeRequest?.controller.abort();
            activeRequest = null;
            listeners.clear();
        },
    };

    return controller;
}

interface ActiveRequest {
    readonly controller: AbortController;
    readonly promise: Promise<boolean>;
}

function uniqueNewItems(
    currentItems: readonly MediaItem[],
    incomingItems: readonly MediaItem[],
): readonly MediaItem[] {
    const ids = new Set(currentItems.map((item) => item.id));
    return incomingItems.filter((item) => {
        if (ids.has(item.id)) return false;
        ids.add(item.id);
        return true;
    });
}

function isAbort(cause: unknown, signal: AbortSignal): boolean {
    return signal.aborted
        || (cause instanceof MediaSourceError && cause.code === 'aborted')
        || (cause instanceof Error && cause.name === 'AbortError');
}

function toError(cause: unknown): Error {
    return cause instanceof Error ? cause : new Error(String(cause));
}
