import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DEFAULT_OVERLAY_Z_INDEX, DEFAULT_TEXT_WIDGET_TRANSFORM } from './constants';
import { OverlayMoveable } from './moveable';
import { resolveWidgetRenderer } from './registry';
import { SettingsPanel } from './settings/settings_panel';
import { useOverlayStore as useOverlayRootStore, useOverlayWidgetStore } from './store';
import { DEFAULT_HTML_WIDGET_PROPS, HtmlWidget } from './html';
import { DEFAULT_IFRAME_WIDGET_PROPS, IframeWidget } from './iframe';
import { DEFAULT_TEXT_WIDGET_PROPS, TextWidget } from './text';
import type { WidgetModel, WidgetRendererMap, WidgetableActionEvent } from './types';
import { buildTransformString, parseTransformString } from './transform_utils';
import { Widget } from './widget';
import { createWidgetRegistry } from './registry';

type OverlayRootProps = {
    renderers: WidgetRendererMap;
    onWidgetContextMenu?: () => void;
};

const DEFAULT_STYLE_VISUAL = {
    backgroundColor: 'rgba(255, 255, 255, 0)',
    backgroundEffect: 'none' as const,
    backgroundImageUrl: '',
    borderColor: '#38bdf8',
    borderWidth: 0,
    borderStyle: 'solid' as const,
    shadowRadius: 0,
    shadowColor: 'rgba(0, 0, 0, 0.5)',
};

export function createDefaultOverlayRenderers(): WidgetRendererMap {
    return createWidgetRegistry({
        text: TextWidget,
        html: HtmlWidget,
        iframe: IframeWidget,
    });
}

export function createTextWidget(
    id: string,
    transform: Partial<WidgetModel['style']> = {}
): WidgetModel {
    return {
        id,
        kind: 'text',
        props: DEFAULT_TEXT_WIDGET_PROPS,
        style: {
            ...DEFAULT_STYLE_VISUAL,
            ...DEFAULT_TEXT_WIDGET_TRANSFORM,
            ...transform,
        },
        autoHide: false,
    };
}

export function createHtmlWidget(
    id: string,
    transform: Partial<WidgetModel['style']> = {}
): WidgetModel {
    return {
        id,
        kind: 'html',
        props: DEFAULT_HTML_WIDGET_PROPS,
        style: {
            ...DEFAULT_STYLE_VISUAL,
            ...DEFAULT_TEXT_WIDGET_TRANSFORM,
            ...transform,
        },
        autoHide: false,
    };
}

export function createIframeWidget(
    id: string,
    transform: Partial<WidgetModel['style']> = {}
): WidgetModel {
    return {
        id,
        kind: 'iframe',
        props: DEFAULT_IFRAME_WIDGET_PROPS,
        style: {
            ...DEFAULT_STYLE_VISUAL,
            ...DEFAULT_TEXT_WIDGET_TRANSFORM,
            ...transform,
        },
        autoHide: false,
    };
}

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

    const overlayRef = useRef<HTMLDivElement | null>(null);
    const widgetElementRef = useRef<Record<string, HTMLDivElement | null>>({});
    const [settingsWidgetId, setSettingsWidgetId] = useState<string | null>(null);

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
                setOverlayActiveWidget(null);
                setSettingsWidgetId(event.widgetId);
                return;
            default:
                return;
        }
    }, [copyOverlayWidget, moveOverlayWidgetDown, moveOverlayWidgetToBottom, moveOverlayWidgetToTop, moveOverlayWidgetUp, removeOverlayWidget, setOverlayActiveWidget, settingsWidgetId, state.widgets, updateOverlayWidget]);

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
                overlayRef={overlayRef}
                widgetElementRef={widgetElementRef}
                widgets={state.widgets}
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