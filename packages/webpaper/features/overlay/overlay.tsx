import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { OverlayMoveable } from './moveable';
import { resolveWidgetRenderer, DEFAULT_OVERLAY_Z_INDEX } from './registry';
import { SettingsPanel } from './settings/settings_panel';
import { useElementSize } from '@reactuses/core';
import { useOverlayStore, useOverlayWidgetStore } from './store';
import type { WidgetRendererMap, WidgetableActionEvent } from './types';

import { Widget } from './widget';

type OverlayRootProps = {
    renderers: WidgetRendererMap;
    onWidgetContextMenu?: () => void;
};


export function OverlayRoot({ renderers, onWidgetContextMenu }: OverlayRootProps) {
    const {
        state,
        activeWidget,
        activateWidget,
        onWidgetLayoutChange,
        onWidgetStyleChange,
    } = useOverlayWidgetStore();
    const moveOverlayWidgetUp = useOverlayStore((rootState) => rootState.moveOverlayWidgetUp);
    const moveOverlayWidgetDown = useOverlayStore((rootState) => rootState.moveOverlayWidgetDown);
    const moveOverlayWidgetToTop = useOverlayStore((rootState) => rootState.moveOverlayWidgetToTop);
    const moveOverlayWidgetToBottom = useOverlayStore((rootState) => rootState.moveOverlayWidgetToBottom);
    const removeOverlayWidget = useOverlayStore((rootState) => rootState.removeOverlayWidget);
    const copyOverlayWidget = useOverlayStore((rootState) => rootState.copyOverlayWidget);
    const setOverlayActiveWidget = useOverlayStore((rootState) => rootState.setOverlayActiveWidget);
    const updateOverlayWidget = useOverlayStore((rootState) => rootState.updateOverlayWidget);
    const pendingSettingsWidgetId = useOverlayStore((rootState) => rootState.pendingSettingsWidgetId);
    const clearOverlayWidgetSettingsRequest = useOverlayStore((rootState) => rootState.clearOverlayWidgetSettingsRequest);

    const overlayRef = useRef<HTMLDivElement | null>(null);
    const widgetElementRef = useRef<Record<string, HTMLDivElement | null>>({});
    const [settingsWidgetId, setSettingsWidgetId] = useState<string | null>(null);
    const [hoveredWidgetId, setHoveredWidgetId] = useState<string | null>(null);
    const [widgetableVisibleWidgetId, setWidgetableVisibleWidgetId] = useState<string | null>(null);
    const widgetableHideTimerRef = useRef<number | null>(null);
    const overlayBounds = useElementSize(overlayRef.current);

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

        hideWidgetableNow();
        setOverlayActiveWidget(null);
        setSettingsWidgetId(pendingSettingsWidgetId);
        clearOverlayWidgetSettingsRequest();
    }, [clearOverlayWidgetSettingsRequest, hideWidgetableNow, pendingSettingsWidgetId, setOverlayActiveWidget]);

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
                updateOverlayWidget(event.widgetId, {
                    layout: {
                        ...widget.layout,
                        rotation: 0,
                    },
                });
                return;
            }
            case 'copy-widget':
                copyOverlayWidget(event.widgetId, event.layout);
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
                        containerBounds={{
                            width: overlayBounds[0],
                            height: overlayBounds[1],
                        }}
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
                onWidgetLayoutChange={onWidgetLayoutChange}
                onWidgetStyleChange={onWidgetStyleChange}
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
