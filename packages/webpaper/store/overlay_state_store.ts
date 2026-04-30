import { create } from 'zustand';


import {
    buildTransformString,
    normalizeSizeToPx,
    parseTransformString,
    createWidget,
} from '@/features/overlay';

import type {
    OverlayState,
    WidgetId,
    WidgetModel,
    WidgetStyle,
} from '@/features/overlay/types';

type OverlayStore = {
    overlay: OverlayState;
    pendingSettingsWidgetId: WidgetId | null;
    setOverlayWidgets: (widgets: WidgetModel[]) => void;
    setOverlayActiveWidget: (widgetId: WidgetId | null) => void;
    requestOverlayWidgetSettings: (widgetId: WidgetId) => void;
    clearOverlayWidgetSettingsRequest: () => void;
    addOverlayWidget: (widget: WidgetModel) => void;
    removeOverlayWidget: (widgetId: WidgetId) => void;
    updateOverlayWidget: (widgetId: WidgetId, patch: Partial<Omit<WidgetModel, 'id'>>) => void;
    moveOverlayWidgetUp: (widgetId: WidgetId) => void;
    moveOverlayWidgetDown: (widgetId: WidgetId) => void;
    moveOverlayWidgetToTop: (widgetId: WidgetId) => void;
    moveOverlayWidgetToBottom: (widgetId: WidgetId) => void;
    copyOverlayWidget: (widgetId: WidgetId, style: WidgetStyle) => void;
};

function findWidgetIndex(widgets: WidgetModel[], widgetId: WidgetId): number {
    return widgets.findIndex((widget) => widget.id === widgetId);
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

function findWidget(state: OverlayState, widgetId: WidgetId): WidgetModel | null {
    return state.widgets.find((widget) => widget.id === widgetId) || null;
}

function replaceWidget(state: OverlayState, widgetId: WidgetId, patch: Partial<Omit<WidgetModel, 'id'>>): OverlayState {
    const index = findWidgetIndex(state.widgets, widgetId);
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
        ...patch,
    };

    return {
        ...state,
        widgets: nextWidgets,
    };
}

export function createDefaultOverlayState(): OverlayState {
    return {
        widgets: [
            createWidget('text'),
            createWidget('iframe', { transform: buildTransformString(200, 150, 0), width: '555px' }),
        ],
        activeWidgetId: null,
    };
}

export const useOverlayStore = create<OverlayStore>((set) => ({
    overlay: createDefaultOverlayState(),
    pendingSettingsWidgetId: null,

    setOverlayWidgets: (widgets) => {
        set((state) => {
            const activeWidgetId = state.overlay.activeWidgetId && findWidgetIndex(widgets, state.overlay.activeWidgetId) >= 0
                ? state.overlay.activeWidgetId
                : null;

            return {
                overlay: {
                    ...state.overlay,
                    widgets: widgets.slice(),
                    activeWidgetId,
                },
            };
        });
    },

    setOverlayActiveWidget: (widgetId) => {
        set((state) => {
            if (!widgetId) {
                return {
                    overlay: {
                        ...state.overlay,
                        activeWidgetId: null,
                    },
                };
            }

            const widget = findWidget(state.overlay, widgetId);
            if (!widget) {
                return state;
            }

            return {
                overlay: {
                    ...state.overlay,
                    activeWidgetId: widgetId,
                },
            };
        });
    },

    requestOverlayWidgetSettings: (widgetId) => {
        set(() => ({
            pendingSettingsWidgetId: widgetId,
        }));
    },

    clearOverlayWidgetSettingsRequest: () => {
        set(() => ({
            pendingSettingsWidgetId: null,
        }));
    },

    addOverlayWidget: (widget) => {
        set((state) => {
            const withoutSameId = state.overlay.widgets.filter((item) => item.id !== widget.id);

            return {
                overlay: {
                    ...state.overlay,
                    widgets: [...withoutSameId, widget],
                    activeWidgetId: state.overlay.activeWidgetId,
                },
            };
        });
    },

    removeOverlayWidget: (widgetId) => {
        set((state) => {
            const nextWidgets = state.overlay.widgets.filter((widget) => widget.id !== widgetId);

            return {
                overlay: {
                    ...state.overlay,
                    widgets: nextWidgets,
                    activeWidgetId: state.overlay.activeWidgetId === widgetId ? null : state.overlay.activeWidgetId,
                },
            };
        });
    },

    updateOverlayWidget: (widgetId, patch) => {
        set((state) => ({
            overlay: replaceWidget(state.overlay, widgetId, patch),
        }));
    },

    moveOverlayWidgetUp: (widgetId) => {
        set((state) => {
            const index = findWidgetIndex(state.overlay.widgets, widgetId);
            return {
                overlay: {
                    ...state.overlay,
                    widgets: moveWidgetByIndex(state.overlay.widgets, index, index + 1),
                },
            };
        });
    },

    moveOverlayWidgetDown: (widgetId) => {
        set((state) => {
            const index = findWidgetIndex(state.overlay.widgets, widgetId);
            return {
                overlay: {
                    ...state.overlay,
                    widgets: moveWidgetByIndex(state.overlay.widgets, index, index - 1),
                },
            };
        });
    },

    moveOverlayWidgetToTop: (widgetId) => {
        set((state) => {
            const index = findWidgetIndex(state.overlay.widgets, widgetId);
            return {
                overlay: {
                    ...state.overlay,
                    widgets: moveWidgetByIndex(state.overlay.widgets, index, state.overlay.widgets.length - 1),
                },
            };
        });
    },

    moveOverlayWidgetToBottom: (widgetId) => {
        set((state) => {
            const index = findWidgetIndex(state.overlay.widgets, widgetId);
            return {
                overlay: {
                    ...state.overlay,
                    widgets: moveWidgetByIndex(state.overlay.widgets, index, 0),
                },
            };
        });
    },

    copyOverlayWidget: (widgetId, style) => {
        set((state) => {
            const index = findWidgetIndex(state.overlay.widgets, widgetId);
            if (index < 0) {
                return state;
            }

            const sourceWidget = state.overlay.widgets[index];
            if (!sourceWidget) {
                return state;
            }

            const { x, y, rotation } = parseTransformString(style.transform);
            const newId = `${sourceWidget.id}-copy-${Date.now()}`;
            const newWidget: WidgetModel = {
                ...sourceWidget,
                id: newId,
                style: {
                    ...sourceWidget.style,
                    transform: buildTransformString(x + 50, y + 50, rotation),
                    width: normalizeSizeToPx(style.width),
                    height: normalizeSizeToPx(style.height),
                    borderRadius: style.borderRadius || sourceWidget.style.borderRadius || '0px',
                },
            };

            const nextWidgets = state.overlay.widgets.slice();
            nextWidgets.splice(index + 1, 0, newWidget);

            return {
                overlay: {
                    ...state.overlay,
                    widgets: nextWidgets,
                    activeWidgetId: newId,
                },
            };
        });
    },
}));

export function useAppSelector<T>(selector: (state: OverlayStore) => T): T {
    return useOverlayStore(selector);
}

export const useAppStore = useOverlayStore;

export function useOverlaySelector<T>(selector: (state: OverlayStore) => T): T {
    return useOverlayStore(selector);
}
