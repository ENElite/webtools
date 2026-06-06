import { signalBus, createUserSignal } from '../../engine/signal';
import type { UserRuntime } from './types';

export function createUserRuntimeImpl(): UserRuntime {
    return {
        emitMouseEnter(widgetId) {
            signalBus.emit(createUserSignal('mouse.enter', widgetId));
        },
        emitMouseLeave(widgetId) {
            signalBus.emit(createUserSignal('mouse.leave', widgetId));
        },
        emitMouseClick(widgetId) {
            signalBus.emit(createUserSignal('mouse.click', widgetId));
        },
    };
}
