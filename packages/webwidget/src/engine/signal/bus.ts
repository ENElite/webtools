import type { Signal } from './types';

type Handler<T extends Signal = Signal> = (signal: T) => void;

export interface SignalBus {
    emit(signal: Signal): void;
    on<T extends Signal['type']>(
        type: T,
        handler: Handler<Extract<Signal, { type: T }>>,
    ): () => void;
    onAny(handler: Handler): () => void;
    off(type: string, handler: Handler): void;
}

export function createSignalBus(): SignalBus {
    const handlers = new Map<string, Set<Handler>>();
    const anyHandlers = new Set<Handler>();

    return {
        emit(signal: Signal) {
            const typeHandlers = handlers.get(signal.type);
            if (typeHandlers) {
                for (const handler of typeHandlers) {
                    handler(signal as any);
                }
            }
            for (const handler of anyHandlers) {
                handler(signal);
            }
        },

        on(type, handler) {
            if (!handlers.has(type)) {
                handlers.set(type, new Set());
            }
            handlers.get(type)!.add(handler as Handler);
            return () => {
                handlers.get(type)?.delete(handler as Handler);
            };
        },

        onAny(handler) {
            anyHandlers.add(handler);
            return () => {
                anyHandlers.delete(handler);
            };
        },

        off(type, handler) {
            handlers.get(type)?.delete(handler);
        },
    };
}

export const signalBus = createSignalBus();
