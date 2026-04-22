import { useEffect, useLayoutEffect, useMemo, useReducer, useRef } from 'react';

import { DEFAULT_OVERLAY_Z_INDEX } from './constants';
import { OverlayMoveable } from './moveable';
import { overlayReducer } from './reducer';
import { resolveWidgetRenderer } from './registry';
import { SettingWidget } from './settings/setting_widget';
import { buildTransformString, parseTransformString } from './transform_utils';
import { splitSettingsValues } from './settings_utils';
import type {
    WidgetPropPrimitive,
    OverlayState,
    WidgetModel,
    WidgetableActionEvent,
    WidgetRendererMap,
} from './types';
import type { SettingsWidgetProps } from './settings/schema';
import { Widget } from './widget';

type OverlayRootProps = {
    initialWidgets: WidgetModel[];
    renderers: WidgetRendererMap;
    onWidgetContextMenu?: () => void;
};

export function OverlayRoot({ initialWidgets, renderers, onWidgetContextMenu }: OverlayRootProps) {
    const [state, dispatch] = useReducer(overlayReducer, {
        widgets: initialWidgets,
        activeWidgetId: null,
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

    const commitSettingsField = (settingsWidgetId: string, key: string, nextValue: WidgetPropPrimitive) => {
        const settingsWidget = state.widgets.find((w) => w.id === settingsWidgetId);
        if (!settingsWidget || settingsWidget.kind !== 'settings') {
            return;
        }

        const settingsProps = settingsWidget.props as unknown as SettingsWidgetProps;
        const sourceWidget = state.widgets.find((w) => w.id === settingsProps.sourceWidgetId);
        if (!sourceWidget) {
            return;
        }

        // Build current draft from source widget + the new field value
        const { x, y, rotation } = parseTransformString(sourceWidget.style.transform);
        const width = Number.parseFloat(sourceWidget.style.width) || 0;
        const height = Number.parseFloat(sourceWidget.style.height) || 0;
        const borderRadius = Number.parseFloat(sourceWidget.style.borderRadius) || 0;

        const currentDraft = {
            ...sourceWidget.props,
            width,
            height,
            x,
            y,
            rotation,
            borderRadius,
            [key]: nextValue,
        };

        const { props, style } = splitSettingsValues(currentDraft, sourceWidget);

        dispatch({
            type: 'update-widget',
            widgetId: settingsProps.sourceWidgetId,
            patch: { props, style },
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
                    style: event.style,
                });
                return;
            }

            case 'open-widget-settings': {
                dispatch({
                    type: 'open-settings',
                    widgetId: event.widgetId,
                    bounds: state.bounds,
                });
                return;
            }

            case 'commit-settings-field': {
                commitSettingsField(event.widgetId, event.key, event.value);
                return;
            }

            case 'close-settings': {
                dispatch({
                    type: 'remove-widget',
                    widgetId: event.widgetId,
                });
                return;
            }

            default:
                return;
        }
    };

    return (
        <div
            ref={overlayRef}
            className='absolute inset-0 select-none'
            style={{ zIndex: DEFAULT_OVERLAY_Z_INDEX }}
            onMouseDown={(event) => {
                if (event.target !== event.currentTarget) {
                    return;
                }
                dispatch({ type: 'set-active', widgetId: null });
            }}
        >
            {state.widgets.map((widget) => {
                // Settings widget: render with SettingWidget component
                if (widget.kind === 'settings') {
                }


                // Normal widget: render with registered renderer
                const WidgetRenderer = resolveWidgetRenderer(renderers, widget.kind);
                if (!WidgetRenderer) {
                    return null;
                }

                const settingsProps = widget.props as unknown as SettingsWidgetProps;
                const sourceWidget = state.widgets.find((w) => w.id === settingsProps.sourceWidgetId) || null;
                return (
                    <Widget
                        key={widget.id}
                        widget={widget}
                        active={widget.id === state.activeWidgetId}
                        rootRef={(element) => {
                            widgetElementRef.current[widget.id] = element;
                        }}
                        onClick={() => activateWidget(widget.id)}
                        onDoubleClick={() => handleWidgetableAction({ type: 'open-widget-settings', widgetId: widget.id })}
                        onContextMenu={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            activateWidget(widget.id);
                            onWidgetContextMenu?.();
                        }}
                    >
                        {(widget.kind === 'settings') ? (
                            <SettingWidget
                                widget={widget}
                                active={widget.id === state.activeWidgetId}
                                onWidgetableAction={handleWidgetableAction}
                                sourceWidget={sourceWidget}
                                overlayBounds={state.bounds}
                            />
                        ) : (
                            <WidgetRenderer
                                widget={widget}
                                active={widget.id === state.activeWidgetId}
                            />
                        )}
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
