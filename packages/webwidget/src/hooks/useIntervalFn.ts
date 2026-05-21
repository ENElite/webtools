import { useRef } from 'react';
import { useInterval, useRafFn } from '@reactuses/core';
import type { RefObject } from 'react';

export type UseIntervalFnOptions = {
    immediate?: boolean;
};

export type PausableControls = {
    isActive: RefObject<boolean>;
    pause: () => void;
    resume: () => void;
};

export function useIntervalFn(
    callback: () => void,
    interval?: number | 'requestAnimationFrame',
    options: UseIntervalFnOptions = {}
): PausableControls {
    const useIntervalMode = typeof interval === 'number';

    if (useIntervalMode) {
        const pausable = useInterval(callback, interval as number, { immediate: !!options.immediate, controls: true } as any);
        // `useInterval` returns a Pausable with the same shape already
        return {
            isActive: pausable.isActive,
            pause: pausable.pause,
            resume: pausable.resume,
        };
    }

    // RAF mode: adapt the tuple returned by useRafFn to PausableControls
    const [stop, start, isActiveFn] = useRafFn(callback, !!options.immediate);

    const isActiveRef = useRef<boolean>(Boolean(isActiveFn()));

    const pause = () => {
        stop();
        isActiveRef.current = false;
    };

    const resume = () => {
        start();
        isActiveRef.current = true;
    };

    // Keep initial state in sync
    isActiveRef.current = Boolean(isActiveFn());

    return {
        isActive: isActiveRef,
        pause,
        resume,
    };
}
