import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useEvent, useInterval } from '@reactuses/core';

type UsePlaybackSchedulerParams = {
    desiredIntervalSec: number;
    isRunning: boolean;
};

type UsePlaybackSchedulerResult = {
    effectiveIntervalSec: number;
    remainingMs: number;
    progress: number;
    markCycleStart: () => void;
    markCycleComplete: () => void;
};

export function usePlaybackScheduler({ desiredIntervalSec, isRunning }: UsePlaybackSchedulerParams): UsePlaybackSchedulerResult {
    const [effectiveIntervalSec, setEffectiveIntervalSec] = useState(desiredIntervalSec);
    const [cycleStartedAt, setCycleStartedAt] = useState(Date.now());
    const [timestamp, setTimestamp] = useState(Date.now());
    const pendingIntervalRef = useRef<number | null>(null);

    const syncCycleStartedAt = useEvent(() => {
        setCycleStartedAt(Date.now());
    });

    const flushPendingInterval = useEvent(() => {
        const pending = pendingIntervalRef.current;
        if (pending === null) {
            return;
        }

        setEffectiveIntervalSec(pending);
        pendingIntervalRef.current = null;
    });

    useInterval(() => {
        setTimestamp(Date.now());
    }, isRunning ? 250 : null);

    const normalizeInterval = useCallback((value: number): number => {
        if (!Number.isFinite(value)) {
            return 30;
        }

        return Math.max(5, Math.min(180, Math.round(value)));
    }, []);

    useEffect(() => {
        const normalizedDesired = normalizeInterval(desiredIntervalSec);
        if (normalizedDesired === effectiveIntervalSec) {
            return;
        }

        if (isRunning) {
            pendingIntervalRef.current = normalizedDesired;
            return;
        }

        pendingIntervalRef.current = null;
        setEffectiveIntervalSec(normalizedDesired);
        syncCycleStartedAt();
    }, [desiredIntervalSec, effectiveIntervalSec, isRunning, normalizeInterval, syncCycleStartedAt]);

    useEffect(() => {
        if (isRunning) {
            return;
        }

        flushPendingInterval();

        syncCycleStartedAt();
    }, [flushPendingInterval, isRunning, syncCycleStartedAt]);

    const markCycleStart = useEvent(() => {
        syncCycleStartedAt();
    });

    const markCycleComplete = useEvent(() => {
        flushPendingInterval();
        syncCycleStartedAt();
    });

    const countdown = useMemo(() => {
        if (!isRunning) {
            return { remainingMs: 0, progress: 0 };
        }

        const durationMs = Math.max(effectiveIntervalSec * 1000, 1);
        const elapsed = Math.max(timestamp - cycleStartedAt, 0);
        const mod = elapsed % durationMs;
        const remainingMs = durationMs - mod;
        const progress = 1 - mod / durationMs;
        return {
            remainingMs,
            progress: Math.max(Math.min(progress, 1), 0),
        };
    }, [cycleStartedAt, effectiveIntervalSec, isRunning, timestamp]);

    return {
        effectiveIntervalSec,
        remainingMs: countdown.remainingMs,
        progress: countdown.progress,
        markCycleStart,
        markCycleComplete,
    };
}
