import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIdle } from '@reactuses/core';

import { OverlayMoveable } from './Moveable';
import { resolveWidgetRenderer, DEFAULT_OVERLAY_Z_INDEX } from '../engine/model/widget';
import { SettingsPanel } from './SettingsPanel';
import { useElementSize } from '@reactuses/core';
import { useOverlayStore, useWidgetStore } from '../store';
import type { WidgetRendererMap } from '../engine/model';

import { Widget } from './Widget';
import { RuntimeProvider } from './RuntimeProvider';
import { useRuntime } from './useRuntime';
import { DevtoolsPanel } from '../devtools/DevtoolsPanel';

function SystemIdleEmitter() {
    const { systemRuntime } = useRuntime();
    const isIdle = useIdle(5000);
    const prevIdleRef = useRef(false);

    useEffect(() => {
        if (isIdle && !prevIdleRef.current) {
            systemRuntime.emitIdle();
        } else if (!isIdle && prevIdleRef.current) {
            systemRuntime.emitActive();
        }
        prevIdleRef.current = isIdle;
    }, [isIdle, systemRuntime]);

    return null;
}

type OverlayRootProps = {
    renderers: WidgetRendererMap;
    onWidgetContextMenu?: () => void;
};

export function OverlayRoot({ renderers, onWidgetContextMenu }: OverlayRootProps) {
    const OVERLAY_LOG_PREFIX = '[OverlayRoot]';
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
    const undo = useOverlayStore((rootState) => rootState.undo);
    const redo = useOverlayStore((rootState) => rootState.redo);
    const canUndo = useOverlayStore((rootState) => rootState.canUndo);
    const canRedo = useOverlayStore((rootState) => rootState.canRedo);
    const executeCommand = useOverlayStore((rootState) => rootState.executeCommand);

    const overlayRef = useRef<HTMLDivElement | null>(null);
    const widgetElementRef = useRef<Record<string, HTMLDivElement | null>>({});
    const [settingsWidgetId, setSettingsWidgetId] = useState<string | null>(null);
    const [hoveredWidgetId, setHoveredWidgetId] = useState<string | null>(null);
    const [widgetableVisibleWidgetId, setWidgetableVisibleWidgetId] = useState<string | null>(null);
    const isDraggingOrResizingRef = useRef(false);
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
    }, [settingsWidgetId, findWidget]);

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
    }, [clearWidgetSettingsRequest, hideWidgetableNow, pendingSettingsWidgetId, activate]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
                event.preventDefault();
                if (canUndo) {
                    undo();
                }
            }

            if (
                ((event.ctrlKey || event.metaKey) && event.key === 'y') ||
                ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z')
            ) {
                event.preventDefault();
                if (canRedo) {
                    redo();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, canUndo, canRedo]);

    const hoveredWidget = useMemo(() => {
        return findWidget(hoveredWidgetId);
    }, [hoveredWidgetId, findWidget]);

    useEffect(() => {
        const live2dWidgetIds = widgets.filter((item) => item.kind === 'live2d').map((item) => item.id);
        console.info(`${OVERLAY_LOG_PREFIX} widgets snapshot`, {
            totalWidgets: widgets.length,
            live2dCount: live2dWidgetIds.length,
            live2dWidgetIds,
            activeWidgetId,
        });
    }, [OVERLAY_LOG_PREFIX, activeWidgetId, widgets]);

    return (
        <RuntimeProvider executeCommand={executeCommand} getWidget={(id) => findWidget(id)}>
            <SystemIdleEmitter />
            <div
                ref={overlayRef}
                className='absolute inset-0 overflow-hidden'
                style={{ zIndex: DEFAULT_OVERLAY_Z_INDEX }}
                onMouseDown={(event) => {
                    if (event.target !== event.currentTarget) {
                        return;
                    }
                    activate(null);
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
                        containerBounds={{
                            width: overlayBounds[0],
                            height: overlayBounds[1],
                        }}
                        rootRef={(element) => {
                            widgetElementRef.current[widget.id] = element;
                        }}
                        onClick={() => activate(widget.id)}
                        onMouseEnter={() => {
                            if (isDraggingOrResizingRef.current) {
                                return;
                            }
                            if (activeWidgetId === null || activeWidgetId === widget.id) {
                                setHoveredWidgetId(widget.id);
                                showWidgetableForWidget(widget.id);
                            } else {
                                setHoveredWidgetId(null);
                            }
                        }}
                        onMouseLeave={() => {
                            if (isDraggingOrResizingRef.current) {
                                return;
                            }
                            if (activeWidgetId === null) {
                                hideWidgetableLater(widget.id);
                            }
                        }}
                        draggingOrResizingRef={isDraggingOrResizingRef}
                        onContextMenu={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            activate(widget.id);
                            onWidgetContextMenu?.();
                        }}
                    >
                        <WidgetRenderer widget={widget} />
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
                onDraggingOrResizingChange={(isDraggingOrResizing) => {
                    isDraggingOrResizingRef.current = isDraggingOrResizing;
                }}
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
                onWidgetSettingsClick={(widgetId) => {
                    setSettingsWidgetId(widgetId);
                    activate(null);
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

            <DevtoolsPanel />
            </div>
        </RuntimeProvider>
    );
}
