import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DEFAULT_OVERLAY_Z_INDEX } from './constants';
import { ClockWidget } from './clock';
import { ImageWidget } from './image';
import { VideoWidget } from './video';
import { OverlayMoveable } from './moveable';
import { resolveWidgetRenderer } from './registry';
import { SettingsPanel } from './settings/settings_panel';
import { useOverlayStore as useOverlayRootStore, useOverlayWidgetStore } from './store';
import { HtmlWidget } from './html';
import { IframeWidget } from './iframe';
import { TextWidget } from './text';
import type { WidgetRendererMap, WidgetableActionEvent } from './types';
import { buildTransformString, parseTransformString } from './transform_utils';
import { Widget } from './widget';
import { createWidgetRegistry } from './registry';

type OverlayRootProps = {
    renderers: WidgetRendererMap;
    onWidgetContextMenu?: () => void;
};

export function createDefaultOverlayRenderers(): WidgetRendererMap {
    // cast to WidgetRendererMap to avoid excess property checking on the literal
    return createWidgetRegistry({
        clock: ClockWidget,
        image: ImageWidget,
        video: VideoWidget,
        text: TextWidget,
        html: HtmlWidget,
        iframe: IframeWidget,
    } as WidgetRendererMap);
}

export { createTextWidget, createHtmlWidget, createImageWidget, createVideoWidget, createIframeWidget } from '@/store/overlay_defaults';

export function OverlayRoot({ renderers, onWidgetContextMenu }: OverlayRootProps) {
    const {
        state,
        activeWidget,
        activateWidget,
        updateWidgetStyle,
    } = useOverlayWidgetStore();
    const moveOverlayWidgetUp = useOverlayRootStore((rootState) => rootState.moveOverlayWidgetUp);
    const moveOverlayWidgetDown = useOverlayRootStore((rootState) => rootState.moveOverlayWidgetDown);
    const moveOverlayWidgetToTop = useOverlayRootStore((rootState) => rootState.moveOverlayWidgetToTop);
    const moveOverlayWidgetToBottom = useOverlayRootStore((rootState) => rootState.moveOverlayWidgetToBottom);
    const removeOverlayWidget = useOverlayRootStore((rootState) => rootState.removeOverlayWidget);
    const copyOverlayWidget = useOverlayRootStore((rootState) => rootState.copyOverlayWidget);
    const setOverlayActiveWidget = useOverlayRootStore((rootState) => rootState.setOverlayActiveWidget);
    const updateOverlayWidget = useOverlayRootStore((rootState) => rootState.updateOverlayWidget);
    const pendingSettingsWidgetId = useOverlayRootStore((rootState) => rootState.pendingSettingsWidgetId);
    const clearOverlayWidgetSettingsRequest = useOverlayRootStore((rootState) => rootState.clearOverlayWidgetSettingsRequest);

    const overlayRef = useRef<HTMLDivElement | null>(null);
    const widgetElementRef = useRef<Record<string, HTMLDivElement | null>>({});
    const [settingsWidgetId, setSettingsWidgetId] = useState<string | null>(null);
    const [hoveredWidgetId, setHoveredWidgetId] = useState<string | null>(null);
    const [widgetableVisibleWidgetId, setWidgetableVisibleWidgetId] = useState<string | null>(null);
    const widgetableHideTimerRef = useRef<number | null>(null);

    const clearWidgetableHideTimer = useCallback(() => {
        if (widgetableHideTimerRef.current !== null) {
            window.clearTimeout(widgetableHideTimerRef.current);
            widgetableHideTimerRef.current = null;
        }
    }, []);

    const hideWidgetableNow = useCallback(() => {
        clearWidgetableHideTimer();
        setHoveredWidgetId(null);
        setWidgetableVisibleWidgetId(null);
    }, [clearWidgetableHideTimer]);

    const showWidgetableForWidget = useCallback((widgetId: string) => {
        clearWidgetableHideTimer();
        setWidgetableVisibleWidgetId(widgetId);
    }, [clearWidgetableHideTimer]);

    const hideWidgetableLater = useCallback((widgetId: string) => {
        clearWidgetableHideTimer();
        widgetableHideTimerRef.current = window.setTimeout(() => {
            setWidgetableVisibleWidgetId((current) => (current === widgetId ? null : current));
            setHoveredWidgetId((current) => (current === widgetId ? null : current));
            widgetableHideTimerRef.current = null;
        }, 2000);
    }, [clearWidgetableHideTimer]);

    const settingsSourceWidget = useMemo(() => {
        if (!settingsWidgetId) {
            return null;
        }

        return state.widgets.find((widget) => widget.id === settingsWidgetId) || null;
    }, [settingsWidgetId, state.widgets]);

    useEffect(() => {
        if (settingsWidgetId && !settingsSourceWidget) {
            setSettingsWidgetId(null);
        }
    }, [settingsSourceWidget, settingsWidgetId]);

    useEffect(() => {
        if (state.activeWidgetId) {
            setHoveredWidgetId(null);
            clearWidgetableHideTimer();
            setWidgetableVisibleWidgetId(state.activeWidgetId);
            return;
        }

        hideWidgetableNow();
    }, [clearWidgetableHideTimer, hideWidgetableNow, state.activeWidgetId]);

    useEffect(() => {
        if (!pendingSettingsWidgetId) {
            return;
        }

        setOverlayActiveWidget(pendingSettingsWidgetId);
        setSettingsWidgetId(pendingSettingsWidgetId);
        clearOverlayWidgetSettingsRequest();
    }, [clearOverlayWidgetSettingsRequest, pendingSettingsWidgetId, setOverlayActiveWidget]);

    const hoveredWidget = useMemo(() => {
        if (!hoveredWidgetId) {
            return null;
        }

        return state.widgets.find((widget) => widget.id === hoveredWidgetId) || null;
    }, [hoveredWidgetId, state.widgets]);

    const handleWidgetableAction = useCallback((event: WidgetableActionEvent) => {
        switch (event.type) {
            case 'move-widget-up':
                moveOverlayWidgetUp(event.widgetId);
                return;
            case 'move-widget-down':
                moveOverlayWidgetDown(event.widgetId);
                return;
            case 'move-widget-to-top':
                moveOverlayWidgetToTop(event.widgetId);
                return;
            case 'move-widget-to-bottom':
                moveOverlayWidgetToBottom(event.widgetId);
                return;
            case 'remove-widget':
                removeOverlayWidget(event.widgetId);
                if (event.widgetId === settingsWidgetId) {
                    setSettingsWidgetId(null);
                }
                return;
            case 'toggle-widget-lock':
                updateOverlayWidget(event.widgetId, { locked: event.locked });
                return;
            case 'reset-widget-rotation': {
                const widget = state.widgets.find((item) => item.id === event.widgetId);
                if (!widget) {
                    return;
                }

                const { x, y } = parseTransformString(widget.style.transform);

                updateOverlayWidget(event.widgetId, {
                    style: {
                        ...event.style,
                        transform: buildTransformString(x, y, 0),
                    },
                });
                return;
            }
            case 'copy-widget':
                copyOverlayWidget(event.widgetId, event.style);
                return;
            case 'open-widget-settings':
                hideWidgetableNow();
                setOverlayActiveWidget(null);
                setSettingsWidgetId(event.widgetId);
                return;
            default:
                return;
        }
    }, [clearWidgetableHideTimer, copyOverlayWidget, hideWidgetableNow, moveOverlayWidgetDown, moveOverlayWidgetToBottom, moveOverlayWidgetToTop, moveOverlayWidgetUp, removeOverlayWidget, setOverlayActiveWidget, settingsWidgetId, state.widgets, updateOverlayWidget]);

    return (
        <div
            ref={overlayRef}
            className='absolute inset-0 overflow-hidden'
            style={{ zIndex: DEFAULT_OVERLAY_Z_INDEX }}
            onMouseDown={(event) => {
                if (event.target !== event.currentTarget) {
                    return;
                }
                activateWidget(null);
                // 点击空白处时清除 hover 与 widgetable 可见状态
                setHoveredWidgetId(null);
                hideWidgetableNow();
            }}
        >
            {state.widgets.map((widget) => {
                const WidgetRenderer = resolveWidgetRenderer(renderers, widget.kind);
                if (!WidgetRenderer) {
                    return null;
                }

                return (
                    <Widget
                        key={widget.id}
                        widget={widget}
                        active={widget.id === state.activeWidgetId}
                        rootRef={(element) => {
                            widgetElementRef.current[widget.id] = element;
                        }}
                        onClick={() => activateWidget(widget.id)}
                        onMouseEnter={() => {
                            if (state.activeWidgetId === null || state.activeWidgetId === widget.id) {
                                setHoveredWidgetId(widget.id);
                                showWidgetableForWidget(widget.id);
                            } else {
                                setHoveredWidgetId(null);
                            }
                        }}
                        onMouseLeave={() => {
                            if (state.activeWidgetId === null) {
                                hideWidgetableLater(widget.id);
                            }
                        }}
                        onContextMenu={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            activateWidget(widget.id);
                            onWidgetContextMenu?.();
                        }}
                    >
                        <WidgetRenderer
                            widget={widget}
                            active={widget.id === state.activeWidgetId}
                        />
                    </Widget>
                );
            })}

            <OverlayMoveable
                activeWidget={activeWidget}
                hoveredWidget={hoveredWidget}
                widgetableVisibleWidgetId={widgetableVisibleWidgetId}
                overlayRef={overlayRef}
                widgetElementRef={widgetElementRef}
                widgets={state.widgets}
                onWidgetableMouseEnter={(widgetId) => {
                    if (state.activeWidgetId !== null) {
                        return;
                    }
                    setHoveredWidgetId(widgetId);
                    showWidgetableForWidget(widgetId);
                }}
                onWidgetableMouseLeave={(widgetId) => {
                    if (state.activeWidgetId === null) {
                        hideWidgetableLater(widgetId);
                    }
                }}
                onWidgetableAction={handleWidgetableAction}
                onWidgetTransformChange={updateWidgetStyle}
            />

            {settingsSourceWidget
                ? (
                    <SettingsPanel
                        sourceWidget={settingsSourceWidget}
                        container={overlayRef.current || document.body}
                        onClose={() => setSettingsWidgetId(null)}
                    />
                )
                : null}

        </div>
    );
}

export const Overlay = OverlayRoot;
