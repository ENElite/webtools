import { useSyncExternalStore, useCallback } from 'react';
import { useRuntime } from './useRuntime';
import type { VisualMotionState } from './runtimes/types';

const EMPTY_STATE: VisualMotionState = {
    animate: {},
    transition: {},
};

export function useVisualMotionState(widgetId: string): VisualMotionState {
    const { visualStateRuntime } = useRuntime();

    const subscribe = useCallback(
        (onStoreChange: () => void) => {
            return visualStateRuntime.subscribe(widgetId, onStoreChange);
        },
        [visualStateRuntime, widgetId],
    );

    const getSnapshot = useCallback(() => {
        return visualStateRuntime.get(widgetId);
    }, [visualStateRuntime, widgetId]);

    return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_STATE);
}
