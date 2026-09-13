'use client';

import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';

import { selectCurrentMedia, selectNextMedia, type MediaItem } from '../../domain';
import {
    browserImagePreloadCache,
    type ImagePreloadCache,
} from './image-preload-cache';
import {
    createMediaPlayerController,
    type CreateMediaPlayerControllerOptions,
    type MediaPlayerController,
    type MediaPlayerState,
} from './media-player-controller';

export interface UseMediaPlayerResult extends MediaPlayerState {
    readonly currentMedia: MediaItem | null;
    readonly currentImagePreloaded: boolean;
    readonly controller: MediaPlayerController;
}

export interface UseMediaPlayerOptions extends CreateMediaPlayerControllerOptions {
    readonly imagePreloadCache?: ImagePreloadCache;
}

/**
 * React adapter for MediaPlayerController. The interval handle deliberately
 * lives in this effect and never becomes application/domain state.
 */
export function useMediaPlayer(
    options: UseMediaPlayerOptions,
): UseMediaPlayerResult {
    const controller = useMemo(
        () => createMediaPlayerController(options),
        [options.catalog, options.initialPage, options.prefetchThreshold],
    );
    const state = useSyncExternalStore(
        controller.subscribe,
        controller.getSnapshot,
        controller.getSnapshot,
    );
    const lifecycle = useRef<ControllerLifecycle | null>(null);
    const imagePreloadCache = options.imagePreloadCache ?? browserImagePreloadCache;
    const currentMedia = selectCurrentMedia(state.session);
    const nextMedia = selectNextMedia(state.session);
    const nextImageUrl = nextMedia?.kind === 'image' ? nextMedia.url : null;

    useEffect(() => {
        const generation = (lifecycle.current?.generation ?? 0) + 1;
        lifecycle.current = { controller, generation };

        return () => {
            queueMicrotask(() => {
                const current = lifecycle.current;
                const controllerWasReplaced = current?.controller !== controller;
                const componentRemainedUnmounted = current?.generation === generation;
                if (controllerWasReplaced || componentRemainedUnmounted) controller.dispose();
            });
        };
    }, [controller]);

    useEffect(() => {
        if (state.session.autoplay.kind !== 'running') return undefined;
        const intervalId = globalThis.setInterval(() => {
            void controller.autoplayTick();
        }, state.session.autoplay.intervalMs);
        return () => globalThis.clearInterval(intervalId);
    }, [controller, state.session.autoplay]);

    useEffect(() => {
        if (!nextImageUrl) return;
        void imagePreloadCache.preload(nextImageUrl);
    }, [imagePreloadCache, nextImageUrl]);

    return {
        ...state,
        currentMedia,
        currentImagePreloaded: currentMedia?.kind === 'image'
            && imagePreloadCache.isReady(currentMedia.url),
        controller,
    };
}

interface ControllerLifecycle {
    readonly controller: MediaPlayerController;
    readonly generation: number;
}
