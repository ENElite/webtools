import { useEffect, useState } from 'react';

import { useEvent } from '@reactuses/core';
import { useIntervalFn, PausableControls } from '@/hooks/useIntervalFn';

export type UseTimestampOptions = {
    controls?: boolean;
    offset?: number;
    immediate?: boolean;
    interval?: number | 'requestAnimationFrame';
    callback?: (timestamp: number) => void;
};

export type UseTimestampReturn = number | ({ timestamp: number } & PausableControls);

export function useTimestamp(options: UseTimestampOptions & { controls: true }): ({ timestamp: number } & PausableControls);
export function useTimestamp(options?: UseTimestampOptions): number;

export function useTimestamp(options: UseTimestampOptions = {}): UseTimestampReturn {
    const {
        controls: wantControls = false,
        offset = 0,
        immediate = false,
        interval = 'requestAnimationFrame',
        callback,
    } = options;

    const [timestamp, setTimestamp] = useState(() => Date.now() + offset);
    const cb = callback ? (timestamp) => {
        setTimestamp(timestamp);
        callback(timestamp);
    } : setTimestamp;
    const syncTimestamp = useEvent(() => {
        const t = Date.now() + offset;
        cb(t);
    });

    const controls = useIntervalFn(syncTimestamp, interval, { immediate });

    useEffect(() => {
        if (typeof interval === 'number') {
            return;
        }

        controls.resume();

        return () => {
            controls.pause();
        };
        // controls identity is stable from the hook implementation
    }, [interval, immediate, controls]);

    if (wantControls) {
        return {
            timestamp,
            ...controls,
        };
    }

    return timestamp;
}
