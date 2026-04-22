import type {
    OverlayAction,
    OverlayState,
    WidgetId,
    WidgetModel,
} from './types';
import { buildTransformString, normalizeSizeToPx, parseTransformString } from './transform_utils';
import { type SettingsWidgetProps, DEFAULT_SETTINGS_WIDGET_PROPS, DEFAULT_SETTINGS_WIDGET_STYLE } from './settings/schema';

function findWidgetIndex(widgets: WidgetModel[], widgetId: WidgetId): number {
    return widgets.findIndex((widget) => widget.id === widgetId);
}

function getTopWidgetId(widgets: WidgetModel[]): WidgetId | null {
    return widgets[widgets.length - 1]?.id || null;
}

function moveWidgetByIndex(widgets: WidgetModel[], fromIndex: number, toIndex: number): WidgetModel[] {
    if (fromIndex < 0 || fromIndex >= widgets.length) {
        return widgets;
    }

    const boundedTarget = Math.min(Math.max(toIndex, 0), widgets.length - 1);
    if (boundedTarget === fromIndex) {
        return widgets;
    }

    const next = widgets.slice();
    const [moved] = next.splice(fromIndex, 1);
    if (!moved) {
        return widgets;
    }

    next.splice(boundedTarget, 0, moved);
    return next;
}

export function getWidget(state: OverlayState, widgetId: WidgetId): WidgetModel | null {
    return state.widgets.find((widget) => widget.id === widgetId) || null;
}

export function getWidgetLayerIndex(state: OverlayState, widgetId: WidgetId): number {
    return findWidgetIndex(state.widgets, widgetId);
}

export function overlayReducer(state: OverlayState, action: OverlayAction): OverlayState {
    switch (action.type) {
        case 'set-active': {
            if (!action.widgetId) {
                return {
                    ...state,
                    activeWidgetId: null,
                };
            }

            const widget = getWidget(state, action.widgetId);
            if (!widget) {
                return state;
            }
            if (widget.kind === 'settings') {
                const index = findWidgetIndex(state.widgets, action.widgetId);
                return {
                    ...state,
                    activeWidgetId: action.widgetId,
                    widgets: moveWidgetByIndex(state.widgets, index, state.widgets.length - 1),
                };
            }
            return {
                ...state,
                activeWidgetId: action.widgetId,
            }
        }

        case 'set-bounds': {
            return {
                ...state,
                bounds: action.bounds,
            };
        }

        case 'set-widgets': {
            const widgets = action.widgets.slice();
            const activeWidgetId = state.activeWidgetId
                && findWidgetIndex(widgets, state.activeWidgetId) >= 0
                ? state.activeWidgetId
                : null;

            return {
                ...state,
                widgets,
                activeWidgetId,
            };
        }

        case 'add-widget': {
            const withoutSameId = state.widgets.filter((widget) => widget.id !== action.widget.id);
            return {
                ...state,
                widgets: [...withoutSameId, action.widget],
                activeWidgetId: action.widget.id,
            };
        }

        case 'remove-widget': {
            const nextWidgets = state.widgets.filter((widget) => widget.id !== action.widgetId);
            const activeWidgetId = state.activeWidgetId === action.widgetId
                ? getTopWidgetId(nextWidgets)
                : state.activeWidgetId;

            return {
                ...state,
                widgets: nextWidgets,
                activeWidgetId,
            };
        }

        case 'update-widget': {
            const index = findWidgetIndex(state.widgets, action.widgetId);
            if (index < 0) {
                return state;
            }

            const nextWidgets = state.widgets.slice();
            const current = nextWidgets[index];
            if (!current) {
                return state;
            }

            nextWidgets[index] = {
                ...current,
                ...action.patch,
            };

            return {
                ...state,
                widgets: nextWidgets,
            };
        }

        case 'move-widget-up': {
            const index = findWidgetIndex(state.widgets, action.widgetId);
            return {
                ...state,
                widgets: moveWidgetByIndex(state.widgets, index, index + 1),
            };
        }

        case 'move-widget-down': {
            const index = findWidgetIndex(state.widgets, action.widgetId);
            return {
                ...state,
                widgets: moveWidgetByIndex(state.widgets, index, index - 1),
            };
        }

        case 'move-widget-to-top': {
            const index = findWidgetIndex(state.widgets, action.widgetId);
            return {
                ...state,
                widgets: moveWidgetByIndex(state.widgets, index, state.widgets.length - 1),
            };
        }

        case 'move-widget-to-bottom': {
            const index = findWidgetIndex(state.widgets, action.widgetId);
            return {
                ...state,
                widgets: moveWidgetByIndex(state.widgets, index, 0),
            };
        }

        case 'copy-widget': {
            const index = findWidgetIndex(state.widgets, action.widgetId);
            if (index < 0) {
                return state;
            }

            const sourceWidget = state.widgets[index];
            if (!sourceWidget) {
                return state;
            }

            const sourceStyle = action.style;
            const { x, y, rotation } = parseTransformString(sourceStyle.transform);
            const newId = `${sourceWidget.id}-copy-${Date.now()}`;
            const newWidget: WidgetModel = {
                ...sourceWidget,
                id: newId,
                style: {
                    transform: buildTransformString(x + 50, y + 50, rotation),
                    width: normalizeSizeToPx(sourceStyle.width),
                    height: normalizeSizeToPx(sourceStyle.height),
                    borderRadius: sourceStyle.borderRadius || sourceWidget.style.borderRadius || '0px',
                },
            };

            const newWidgets = [...state.widgets];
            newWidgets.splice(index + 1, 0, newWidget);

            return {
                ...state,
                widgets: newWidgets,
                activeWidgetId: newId,
            };
        }

        case 'open-settings': {
            const sourceWidget = state.widgets.find((w) => w.id === action.widgetId);
            if (!sourceWidget || sourceWidget.kind === 'settings') {
                return state;
            }
            const settingsWidgetId = `settings-${sourceWidget.id}`;

            // If settings widget already exists, just activate it
            const existing = state.widgets.find((w) => w.id === settingsWidgetId);
            if (existing) {
                return {
                    ...state,
                    activeWidgetId: settingsWidgetId,
                };
            }

            const { x: srcX, y: srcY, rotation: srcRotation } = parseTransformString(sourceWidget.style.transform);
            const srcWidth = Number.parseFloat(sourceWidget.style.width) || 0;
            const srcHeight = Number.parseFloat(sourceWidget.style.height) || 0;

            const { width, height } = DEFAULT_SETTINGS_WIDGET_STYLE;
            const settingsWidth = Number.parseFloat(width.slice(0, -1)) || 300;
            const settingsHeight = Number.parseFloat(height.slice(0, -1)) || 200;
            const overlayWidth = action.bounds?.width ?? settingsWidth;
            const overlayHeight = action.bounds?.height ?? settingsHeight;

            // Position at screen center
            const centerX = Math.max(0, (overlayWidth - settingsWidth) / 2);
            const centerY = Math.max(0, (overlayHeight - settingsHeight) / 2);

            const settingsWidget: WidgetModel<SettingsWidgetProps> = {
                id: settingsWidgetId,
                kind: 'settings',
                style: {
                    ...DEFAULT_SETTINGS_WIDGET_STYLE,
                    transform: buildTransformString(centerX, centerY, 0),
                    width: `${Math.min(settingsWidth, overlayWidth)}px`,
                    height: `${Math.min(settingsHeight, overlayHeight)}px`,
                },
                props: {
                    ...DEFAULT_SETTINGS_WIDGET_PROPS,
                    sourceWidgetId: sourceWidget.id,
                    draftValues: JSON.stringify({
                        ...sourceWidget.props,
                        width: srcWidth,
                        height: srcHeight,
                        x: srcX,
                        y: srcY,
                        rotation: srcRotation,
                        borderRadius: Number.parseFloat(sourceWidget.style.borderRadius) || 0,
                    }),
                },
            };

            return {
                ...state,
                widgets: [...state.widgets, settingsWidget],
                activeWidgetId: settingsWidgetId,
            };
        }

        default:
            return state;
    }
}
