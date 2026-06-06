import { useEffect, useRef, useState, useCallback } from 'react';
import { signalBus } from '../engine/signal/bus';
import type { Signal, SignalSource } from '../engine/signal/types';
import { useDevtoolsStore } from './useDevtools';

export type SignalLogEntry = {
    id: number;
    timestamp: number;
    source: SignalSource;
    type: string;
    widgetId?: string;
    payloadSummary: string;
    raw: Signal;
};

const MAX_LOG_ENTRIES = 200;

let nextLogId = 0;

function summarizePayload(signal: Signal): string {
    if (signal.payload === undefined) return '';
    if (signal.source === 'widget') {
        const { prev, next } = signal.payload as { prev: unknown; next: unknown };
        const prevStr = typeof prev === 'object' ? JSON.stringify(prev) : String(prev);
        const nextStr = typeof next === 'object' ? JSON.stringify(next) : String(next);
        return `${prevStr} → ${nextStr}`;
    }
    return '';
}

export function useSignalLog() {
    const [entries, setEntries] = useState<SignalLogEntry[]>([]);
    const entriesRef = useRef<SignalLogEntry[]>([]);
    const paused = useDevtoolsStore((s) => s.signalPaused);
    const pausedRef = useRef(paused);

    useEffect(() => {
        pausedRef.current = paused;
    }, [paused]);

    useEffect(() => {
        const unsubscribe = signalBus.onAny((signal) => {
            if (pausedRef.current) return;

            const entry: SignalLogEntry = {
                id: nextLogId++,
                timestamp: signal.timestamp,
                source: signal.source,
                type: signal.type,
                widgetId: signal.widgetId,
                payloadSummary: summarizePayload(signal),
                raw: signal,
            };

            entriesRef.current = [entry, ...entriesRef.current].slice(0, MAX_LOG_ENTRIES);
            setEntries(entriesRef.current);
        });

        return unsubscribe;
    }, []);

    const clear = useCallback(() => {
        entriesRef.current = [];
        setEntries([]);
    }, []);

    const filterBy = useCallback(
        (source: SignalSource | 'all') => {
            if (source === 'all') return entries;
            return entries.filter((e) => e.source === source);
        },
        [entries],
    );

    return { entries, clear, filterBy };
}
