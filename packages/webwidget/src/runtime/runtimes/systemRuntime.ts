import { signalBus, createSystemSignal } from '../../engine/signal';
import type { SystemRuntime } from './types';

export function createSystemRuntimeImpl(): SystemRuntime {
    return {
        emitIdle() {
            signalBus.emit(createSystemSignal('idle'));
        },
        emitActive() {
            signalBus.emit(createSystemSignal('active'));
        },
    };
}
