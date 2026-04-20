import { useEffect, useLayoutEffect, useMemo, useReducer, useRef } from 'react';

import { DEFAULT_OVERLAY_Z_INDEX } from './constants';
import { OverlayMoveable } from './moveable';
import { overlayReducer } from './reducer';
import { resolveWidgetRenderer } from './registry';
import { buildTransformString, parseTransformString } from './transform_utils';
import type {
    OverlayState,
    WidgetModel,
    WidgetableActionEvent,
    WidgetRendererMap,
} from './types';
import { Widget } from './widget';

type OverlayRootProps = {
    initialWidgets: WidgetModel[];
    renderers: WidgetRendererMap;
};

export function OverlayRoot({ initialWidgets, renderers }: OverlayRootProps) {
    const [state, dispatch] = useReducer(overlayReducer, {
        widgets: initialWidgets,
        activeWidgetId: null, // 初始时不选中任何组件
        bounds: null,
    } satisfies OverlayState);

    const overlayRef = useRef<HTMLDivElement | null>(null);
    const widgetElementRef = useRef<Record<string, HTMLDivElement | null>>({});

    useEffect(() => {
        dispatch({ type: 'set-widgets', widgets: initialWidgets });
    }, [initialWidgets]);

    useLayoutEffect(() => {
        const element = overlayRef.current;
        if (!element) {
            return;
        }

        const updateBounds = () => {
            const rect = element.getBoundingClientRect();
            dispatch({
                type: 'set-bounds',
                bounds: {
                    width: rect.width,
                    height: rect.height,
                },
            });
        };

        updateBounds();

        const observer = new ResizeObserver(() => {
            updateBounds();
        });

        observer.observe(element);
        return () => {
            observer.disconnect();
        };
    }, []);

    const activeWidget = useMemo(() => {
        if (!state.activeWidgetId) {
            return null;
        }

        return state.widgets.find((widget) => widget.id === state.activeWidgetId) || null;
    }, [state.activeWidgetId, state.widgets]);

    const activateWidget = (widgetId: string) => {
        dispatch({ type: 'set-active', widgetId });
    };

    const handleWidgetTransformChange = (widgetId: string, style: WidgetModel['style']) => {
        dispatch({
            type: 'update-widget',
            widgetId,
            patch: { style: style },
        });
    };

    const handleWidgetableAction = (event: WidgetableActionEvent) => {
        switch (event.type) {
            case 'move-widget-up':
            case 'move-widget-down':
            case 'move-widget-to-top':
            case 'move-widget-to-bottom':
            case 'remove-widget': {
                dispatch(event);
                return;
            }

            case 'toggle-widget-lock': {
                console.log('Toggle lock for widget:', event.widgetId, 'Locked:', event.locked);
                dispatch({
                    type: 'update-widget',
                    widgetId: event.widgetId,
                    patch: { locked: event.locked },
                });
                return;
            }

            case 'reset-widget-rotation': {
                const { x, y } = parseTransformString(event.style.transform);
                dispatch({
                    type: 'update-widget',
                    widgetId: event.widgetId,
                    patch: {
                        style: {
                            ...event.style,
                            transform: buildTransformString(x, y, 0),
                        },
                    },
                });
                return;
            }

            case 'copy-widget': {
                dispatch({
                    type: 'copy-widget',
                    widgetId: event.widgetId,
                    transform: event.style,
                });
                return;
            }

            case 'open-widget-settings': {
                console.log('Open settings for widget:', event.widgetId);
                return;
            }

            default:
                return;
        }
    };

    return (
        <div
            ref={overlayRef}
            className='absolute inset-0'
            style={{ zIndex: DEFAULT_OVERLAY_Z_INDEX }}
            onMouseDown={(event) => {
                if (event.target !== event.currentTarget) {
                    return;
                }
                dispatch({ type: 'set-active', widgetId: null });
            }}
        >
            {state.widgets.map((widget) => {
                const renderer = resolveWidgetRenderer(renderers, widget.kind);
                if (!renderer) {
                    return null;
                }

                const WidgetRenderer = renderer;

                return (
                    <Widget
                        key={widget.id}
                        widget={widget}
                        active={widget.id === state.activeWidgetId}
                        rootRef={(element) => {
                            widgetElementRef.current[widget.id] = element;
                        }}
                        onClick={() => activateWidget(widget.id)}
                    >
                        <WidgetRenderer widget={widget} active={widget.id === state.activeWidgetId} />
                    </Widget>
                );
            })}

            <OverlayMoveable
                activeWidget={activeWidget}
                overlayRef={overlayRef}
                widgetElementRef={widgetElementRef}
                widgets={state.widgets}
                onWidgetableAction={handleWidgetableAction}
                onWidgetTransformChange={handleWidgetTransformChange}
            />
        </div>
    );
}

export const Overlay = OverlayRoot;
