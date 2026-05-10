import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { OverlayMoveable } from './moveable';
import { resolveWidgetRenderer, DEFAULT_OVERLAY_Z_INDEX } from './registry';
import { SettingsPanel } from './settings_panel';
import { useElementSize } from '@reactuses/core';
import { useOverlayStore, useWidgetStore } from '@/store';
import type { WidgetRendererMap } from './types';

import { Widget } from './widget';

type OverlayRootProps = {
    renderers: WidgetRendererMap;
    onWidgetContextMenu?: () => void;
};


export function OverlayRoot({ renderers, onWidgetContextMenu }: OverlayRootProps) {
    const {
        activeWidgetId,
        activeWidget,
        widgets,
        activate,
        findWidget,
        onWidgetLayoutChange,
        onWidgetStyleChange,
    } = useWidgetStore();
    const pendingSettingsWidgetId = useOverlayStore((rootState) => rootState.pendingSettingsWidgetId);
    const clearWidgetSettingsRequest = useOverlayStore((rootState) => rootState.clearWidgetSettingsRequest);

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
        return findWidget(settingsWidgetId);
    }, [settingsWidgetId]);

    useEffect(() => {
        if (settingsWidgetId && !settingsSourceWidget) {
            setSettingsWidgetId(null);
        }
    }, [settingsSourceWidget, settingsWidgetId]);

    useEffect(() => {
        if (activeWidgetId) {
            setHoveredWidgetId(null);
            clearWidgetableHideTimer();
            setWidgetableVisibleWidgetId(activeWidgetId);
            return;
        }

        hideWidgetableNow();
    }, [clearWidgetableHideTimer, hideWidgetableNow, activeWidgetId]);

    useEffect(() => {
        if (!pendingSettingsWidgetId) {
            return;
        }

        hideWidgetableNow();
        activate(null);
        setSettingsWidgetId(pendingSettingsWidgetId);
        clearWidgetSettingsRequest();
    }, [clearWidgetSettingsRequest, hideWidgetableNow, pendingSettingsWidgetId]);

    const hoveredWidget = useMemo(() => {
        return findWidget(hoveredWidgetId);
    }, [hoveredWidgetId, findWidget]);

    return (
        <div
            ref={overlayRef}
            className='absolute inset-0 overflow-hidden'
            style={{ zIndex: DEFAULT_OVERLAY_Z_INDEX }}
            onMouseDown={(event) => {
                if (event.target !== event.currentTarget) {
                    return;
                }
                activate(null);
                // 点击空白处时清除 hover 与 widgetable 可见状态
                setHoveredWidgetId(null);
                hideWidgetableNow();
            }}
        >
            {widgets.map((widget) => {
                const WidgetRenderer = resolveWidgetRenderer(renderers, widget.kind);
                if (!WidgetRenderer) {
                    return null;
                }

                return (
                    <Widget
                        key={widget.id}
                        widget={widget}
                        active={widget.id === activeWidgetId}
                        containerBounds={{
                            width: overlayBounds[0],
                            height: overlayBounds[1],
                        }}
                        rootRef={(element) => {
                            widgetElementRef.current[widget.id] = element;
                        }}
                        onClick={() => activate(widget.id)}
                        onMouseEnter={() => {
                            if (activeWidgetId === null || activeWidgetId === widget.id) {
                                setHoveredWidgetId(widget.id);
                                showWidgetableForWidget(widget.id);
                            } else {
                                setHoveredWidgetId(null);
                            }
                        }}
                        onMouseLeave={() => {
                            if (activeWidgetId === null) {
                                hideWidgetableLater(widget.id);
                            }
                        }}
                        onContextMenu={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            activate(widget.id);
                            onWidgetContextMenu?.();
                        }}
                    >
                        <WidgetRenderer
                            widget={widget}
                            active={widget.id === activeWidgetId}
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
                widgets={widgets}
                onWidgetableMouseEnter={(widgetId) => {
                    if (activeWidgetId !== null) {
                        return;
                    }
                    setHoveredWidgetId(widgetId);
                    showWidgetableForWidget(widgetId);
                }}
                onWidgetableMouseLeave={(widgetId) => {
                    if (activeWidgetId === null) {
                        hideWidgetableLater(widgetId);
                    }
                }}
                onWidgetSettingsClick={() => {
                    if (activeWidget) {
                        setSettingsWidgetId(activeWidget.id);
                        activate(null);
                    }
                }}
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
