import { useCallback, useMemo } from 'react';

import { useOverlayStore as useOverlayRootStore } from './overlay_state_store';
import type { WidgetModel } from '@/features/overlay/types';

export function useOverlayWidgetStore() {
    const state = useOverlayRootStore((rootState) => rootState.overlay);
    const setActiveWidget = useOverlayRootStore((rootState) => rootState.setOverlayActiveWidget);
    const updateWidget = useOverlayRootStore((rootState) => rootState.updateOverlayWidget);

    const activeWidget = useMemo(() => {
        if (!state.activeWidgetId) {
            return null;
        }

        return state.widgets.find((widget) => widget.id === state.activeWidgetId) || null;
    }, [state.activeWidgetId, state.widgets]);

    const activateWidget = useCallback((widgetId: string | null) => {
        setActiveWidget(widgetId);
    }, [setActiveWidget]);

    const updateWidgetStyle = useCallback((widgetId: string, style: WidgetModel['style']) => {
        updateWidget(widgetId, { style });
    }, [updateWidget]);

    return {
        state,
        activeWidget,
        activateWidget,
        updateWidgetStyle,
    };
}
