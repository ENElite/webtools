import { useCallback, useMemo } from 'react';

import { useOverlayStore as useOverlayRootStore } from './overlay_state_store';

export function useOverlayWidgetStore() {
    const state = useOverlayRootStore((rootState) => rootState.overlay);
    const setActiveWidget = useOverlayRootStore((rootState) => rootState.setOverlayActiveWidget);
    const updateWidgetLayoutFromTarget = useOverlayRootStore((rootState) => rootState.updateOverlayWidgetLayoutFromTarget);
    const updateWidgetStyleFromTarget = useOverlayRootStore((rootState) => rootState.updateOverlayWidgetStyleFromTarget);

    const activeWidget = useMemo(() => {
        if (!state.activeWidgetId) {
            return null;
        }

        return state.widgets.find((widget) => widget.id === state.activeWidgetId) || null;
    }, [state.activeWidgetId, state.widgets]);

    const activateWidget = useCallback((widgetId: string | null) => {
        setActiveWidget(widgetId);
    }, [setActiveWidget]);

    const onWidgetStyleChange = useCallback((widgetId: string, target: HTMLElement | null) => {
        updateWidgetStyleFromTarget(widgetId, target);
    }, [updateWidgetStyleFromTarget]);

    const onWidgetLayoutChange = useCallback((widgetId: string, target: HTMLElement | null, container: HTMLElement | null) => {
        updateWidgetLayoutFromTarget(widgetId, target, container);
    }, [updateWidgetLayoutFromTarget]);

    return {
        state,
        activeWidget,
        activateWidget,
        onWidgetLayoutChange,
        onWidgetStyleChange,
    };
}
