import { useCallback, useMemo } from 'react';

import { useOverlayStore } from './overlayStore';
import type { WidgetId } from '../overlay/types';
import {
    RemoveWidgetCommand,
    UpdateWidgetCommand,
    MoveWidgetCommand,
    CopyWidgetCommand,
} from '../overlay/commands';
import { layoutFromPx, parseTransformString } from '../overlay/transform_utils';
import type { WidgetLayout } from '../overlay/types';

export type WidgetActionEvent =
    | { type: 'move-widget-up'; widgetId: WidgetId }
    | { type: 'move-widget-down'; widgetId: WidgetId }
    | { type: 'move-widget-to-top'; widgetId: WidgetId }
    | { type: 'move-widget-to-bottom'; widgetId: WidgetId }
    | { type: 'remove-widget'; widgetId: WidgetId }
    | { type: 'copy-widget'; widgetId: WidgetId }
    | { type: 'reset-widget-rotation'; widgetId: WidgetId }
    | { type: 'toggle-widget-lock'; widgetId: WidgetId; locked: boolean }
    | { type: 'open-widget-settings'; widgetId: WidgetId };

export function useWidgetAction() {
    const executeCommand = useOverlayStore((state) => state.executeCommand);

    // Command-based operations
    const moveUp = useCallback(
        (widgetId: WidgetId) => {
            const command = new MoveWidgetCommand(widgetId, 'up');
            executeCommand(command);
        },
        [executeCommand],
    );

    const moveDown = useCallback(
        (widgetId: WidgetId) => {
            const command = new MoveWidgetCommand(widgetId, 'down');
            executeCommand(command);
        },
        [executeCommand],
    );

    const moveToTop = useCallback(
        (widgetId: WidgetId) => {
            const command = new MoveWidgetCommand(widgetId, 'top');
            executeCommand(command);
        },
        [executeCommand],
    );

    const moveToBottom = useCallback(
        (widgetId: WidgetId) => {
            const command = new MoveWidgetCommand(widgetId, 'bottom');
            executeCommand(command);
        },
        [executeCommand],
    );

    const remove = useCallback(
        (widgetId: WidgetId) => {
            const command = new RemoveWidgetCommand(widgetId);
            executeCommand(command);
        },
        [executeCommand],
    );

    const copy = useCallback(
        (widgetId: WidgetId) => {
            const command = new CopyWidgetCommand(widgetId);
            executeCommand(command);
        },
        [executeCommand],
    );

    const resetRotation = useCallback(
        (widgetId: WidgetId) => {
            const command = new UpdateWidgetCommand(widgetId, {
                layout: { rotation: 0 },
            } as any);
            executeCommand(command);
        },
        [executeCommand],
    );

    const toggleLock = useCallback(
        (widgetId: WidgetId, locked: boolean) => {
            const command = new UpdateWidgetCommand(widgetId, { locked } as any);
            executeCommand(command);
        },
        [executeCommand],
    );

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
    const activeWidgetId = useOverlayStore((state) => state.activeWidgetId);
    const widgets = useOverlayStore((state) => state.widgets);
    const activate = useOverlayStore((state) => state.setActiveWidget);
    const executeCommand = useOverlayStore((state) => state.executeCommand);

    const findWidget = useCallback(
        (widgetId: string | null) => {
            if (!widgetId) return null;
            return widgets.find((widget) => widget.id === widgetId) || null;
        },
        [widgets],
    );

    const activeWidget = useMemo(() => {
        return findWidget(activeWidgetId);
    }, [activeWidgetId, findWidget]);

    const onWidgetStyleChange = useCallback(
        (widgetId: string, target: HTMLElement | null) => {
            if (!(target instanceof HTMLElement)) {
                return;
            }

            const command = new UpdateWidgetCommand(widgetId, {
                style: {
                    borderRadius: target.style.borderRadius || undefined,
                },
            } as any);
            executeCommand(command);
        },
        [executeCommand],
    );

    const onWidgetLayoutChange = useCallback(
        (widgetId: string, target: HTMLElement | null, container: HTMLElement | null) => {
            if (!(target instanceof HTMLElement)) {
                return;
            }

            const widget = widgets.find((item) => item.id === widgetId);
            if (!widget) {
                return;
            }

            const containerRect = container?.getBoundingClientRect();
            const containerWidth = containerRect?.width ?? window.innerWidth;
            const containerHeight = containerRect?.height ?? window.innerHeight;

            const rotation = parseTransformString(target.style.transform).rotation;
            const targetRect = target.getBoundingClientRect();
            const containerLeft = containerRect?.left ?? 0;
            const containerTop = containerRect?.top ?? 0;

            const layout = layoutFromPx(
                {
                    x: targetRect.left - containerLeft,
                    y: targetRect.top - containerTop,
                    w: targetRect.width,
                    h: targetRect.height,
                    rotation,
                },
                containerWidth,
                containerHeight,
                widget.layout.anchorX,
                widget.layout.anchorY,
                widget.layout.adapt,
            );

            const command = new UpdateWidgetCommand(widgetId, { layout } as { layout: WidgetLayout });
            executeCommand(command);
        },
        [executeCommand, widgets],
    );

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
