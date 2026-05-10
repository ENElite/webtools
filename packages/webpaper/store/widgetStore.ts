import { useCallback, useMemo } from 'react';

import { useOverlayStore } from './overlayStore';
import { WidgetId } from '@/shared/types';

export type WidgetActionEvent =
    | { type: 'move-widget-up'; widgetId: WidgetId }
    | { type: 'move-widget-down'; widgetId: WidgetId }
    | { type: 'move-widget-to-top'; widgetId: WidgetId }
    | { type: 'move-widget-to-bottom'; widgetId: WidgetId }
    | { type: 'remove-widget'; widgetId: WidgetId }
    | { type: 'copy-widget'; widgetId: WidgetId; }
    | { type: 'reset-widget-rotation'; widgetId: WidgetId }
    | { type: 'toggle-widget-lock'; widgetId: WidgetId; locked: boolean }
    | { type: 'open-widget-settings'; widgetId: WidgetId };

export function useWidgetAction() {
    // 操作 widgets 数组的函数
    const moveUp = useOverlayStore((state) => state.moveWidgetUp);
    const moveDown = useOverlayStore((state) => state.moveWidgetDown);
    const moveToTop = useOverlayStore((state) => state.moveWidgetToTop);
    const moveToBottom = useOverlayStore((state) => state.moveWidgetToBottom);
    const remove = useOverlayStore((state) => state.removeWidget);
    const copy = useOverlayStore((state) => state.copyWidget);

    // 其他操作
    const updateWidget = useOverlayStore((state) => state.updateWidget);
    const updateWidgetLayout = useOverlayStore((state) => state.updateWidgetLayout);

    const resetRotation = useCallback((widgetId: string) => {
        return updateWidgetLayout(widgetId, { rotation: 0 });
    }, [updateWidgetLayout]);
    const toggleLock = useCallback((widgetId: string, locked: boolean) => {
        return updateWidget(widgetId, { locked });
    }, [updateWidget]);

    return {
        moveUp,
        moveDown,
        moveToTop,
        moveToBottom,
        remove,
        copy,
        resetRotation,
        toggleLock,
    };
}

export function useWidgetStore() {
    const updateWidgetLayout = useOverlayStore((state) => state.changeWidgetLayout);
    const updateWidgetStyle = useOverlayStore((state) => state.changeWidgetStyle);

    const activeWidgetId = useOverlayStore((state) => state.activeWidgetId);
    const widgets = useOverlayStore((state) => state.widgets);
    // 修改 overlay 的函数
    const activate = useOverlayStore((state) => state.setActiveWidget);

    const findWidget = useCallback((widgetId: string | null) => {
        if (!widgetId) return null;
        return widgets.find((widget) => widget.id === widgetId) || null;
    }, [widgets]);

    const activeWidget = useMemo(() => {
        return findWidget(activeWidgetId);
    }, [activeWidgetId, widgets]);

    const onWidgetStyleChange = useCallback((widgetId: string, target: HTMLElement | null) => {
        updateWidgetStyle(widgetId, target);
    }, [updateWidgetStyle]);

    const onWidgetLayoutChange = useCallback((widgetId: string, target: HTMLElement | null, container: HTMLElement | null) => {
        updateWidgetLayout(widgetId, target, container);
    }, [updateWidgetLayout]);

    return {
        activeWidgetId,
        activeWidget,
        widgets,
        findWidget,
        activate,
        onWidgetLayoutChange,
        onWidgetStyleChange,
    };
}
