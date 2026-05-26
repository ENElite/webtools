import type { VisualStateRuntime, VisualMotionState } from './types';

const EMPTY_STATE: VisualMotionState = {
    animate: {},
    transition: {},
};

export function createVisualStateRuntimeImpl(): VisualStateRuntime {
    const stateMap = new Map<string, VisualMotionState>();
    const listeners = new Map<string, Set<() => void>>();

    function notify(widgetId: string) {
        const widgetListeners = listeners.get(widgetId);
        if (widgetListeners) {
            for (const listener of widgetListeners) {
                listener();
            }
        }
    }

    return {
        set(widgetId, state) {
            stateMap.set(widgetId, state);
            notify(widgetId);
        },

        get(widgetId) {
            return stateMap.get(widgetId) ?? EMPTY_STATE;
        },

        clear(widgetId) {
            stateMap.delete(widgetId);
            notify(widgetId);
        },

        subscribe(widgetId, listener) {
            if (!listeners.has(widgetId)) {
                listeners.set(widgetId, new Set());
            }
            listeners.get(widgetId)!.add(listener);
            return () => {
                listeners.get(widgetId)?.delete(listener);
            };
        },
    };
}
