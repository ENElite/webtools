import { signalBus, createLifecycleSignal } from '../../engine/signal';
import type { LifecycleRuntime } from './types';

export function createLifecycleRuntimeImpl(): LifecycleRuntime {
    return {
        mount(widgetId) {
            signalBus.emit(createLifecycleSignal('mount', widgetId));
        },
        unmount(widgetId) {
            signalBus.emit(createLifecycleSignal('unmount', widgetId));
        },
    };
}
