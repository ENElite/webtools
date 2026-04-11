import { useTimestamp } from '@webtools/reactuse';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
    const pendingIntervalRef = useRef<number | null>(null);
    const { timestamp } = useTimestamp();

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
        setCycleStartedAt(Date.now());
    }, [desiredIntervalSec, effectiveIntervalSec, isRunning, normalizeInterval]);

    useEffect(() => {
        if (isRunning) {
            return;
        }

        const pending = pendingIntervalRef.current;
        if (pending !== null) {
            setEffectiveIntervalSec(pending);
            pendingIntervalRef.current = null;
        }

        setCycleStartedAt(Date.now());
    }, [isRunning]);

    const markCycleStart = useCallback(() => {
        setCycleStartedAt(Date.now());
    }, []);

    const markCycleComplete = useCallback(() => {
        const pending = pendingIntervalRef.current;
        if (pending !== null) {
            setEffectiveIntervalSec(pending);
            pendingIntervalRef.current = null;
        }

        setCycleStartedAt(Date.now());
    }, []);

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
