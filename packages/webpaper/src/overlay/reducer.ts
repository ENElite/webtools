import type {
    OverlayAction,
    OverlayState,
    WidgetId,
    WidgetModel,
} from './types';
import { buildTransformString, normalizeSizeToPx, parseTransformString } from './transform_utils';

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

            const exists = findWidgetIndex(state.widgets, action.widgetId) >= 0;
            return {
                ...state,
                activeWidgetId: exists ? action.widgetId : state.activeWidgetId,
            };
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

            const sourceTransform = action.transform;
            const { x, y, rotation } = parseTransformString(sourceTransform.transform);
            const newId = `${sourceWidget.id}-copy-${Date.now()}`;
            const newWidget: WidgetModel = {
                ...sourceWidget,
                id: newId,
                style: {
                    transform: buildTransformString(x + 50, y + 50, rotation),
                    width: normalizeSizeToPx(sourceTransform.width),
                    height: normalizeSizeToPx(sourceTransform.height),
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

        default:
            return state;
    }
}
