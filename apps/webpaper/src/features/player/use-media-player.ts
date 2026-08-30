'use client';

import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';

import { selectCurrentMedia, type MediaItem } from '../../domain';
import {
    createMediaPlayerController,
    type CreateMediaPlayerControllerOptions,
    type MediaPlayerController,
    type MediaPlayerState,
} from './media-player-controller';

export interface UseMediaPlayerResult extends MediaPlayerState {
    readonly currentMedia: MediaItem | null;
    readonly controller: MediaPlayerController;
}

/**
 * React adapter for MediaPlayerController. The interval handle deliberately
 * lives in this effect and never becomes application/domain state.
 */
export function useMediaPlayer(
    options: CreateMediaPlayerControllerOptions,
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

    return {
        ...state,
        currentMedia: selectCurrentMedia(state.session),
        controller,
    };
}

interface ControllerLifecycle {
    readonly controller: MediaPlayerController;
    readonly generation: number;
}
