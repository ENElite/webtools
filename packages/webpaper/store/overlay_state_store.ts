import { create } from 'zustand';

import { DEFAULT_TEXT_WIDGET_TRANSFORM } from '@/features/overlay/constants';
import { DEFAULT_IFRAME_WIDGET_PROPS } from '@/features/overlay/iframe';
import { DEFAULT_TEXT_WIDGET_PROPS } from '@/features/overlay/text';
import { buildTransformString, normalizeSizeToPx, parseTransformString } from '@/features/overlay/transform_utils';
import type {
    OverlayState,
    WidgetId,
    WidgetModel,
    WidgetStyle,
} from '@/features/overlay/types';

type OverlayStore = {
    overlay: OverlayState;
    setOverlayWidgets: (widgets: WidgetModel[]) => void;
    setOverlayActiveWidget: (widgetId: WidgetId | null) => void;
    addOverlayWidget: (widget: WidgetModel) => void;
    removeOverlayWidget: (widgetId: WidgetId) => void;
    updateOverlayWidget: (widgetId: WidgetId, patch: Partial<Omit<WidgetModel, 'id'>>) => void;
    moveOverlayWidgetUp: (widgetId: WidgetId) => void;
    moveOverlayWidgetDown: (widgetId: WidgetId) => void;
    moveOverlayWidgetToTop: (widgetId: WidgetId) => void;
    moveOverlayWidgetToBottom: (widgetId: WidgetId) => void;
    copyOverlayWidget: (widgetId: WidgetId, style: WidgetStyle) => void;
};

const DEFAULT_OVERLAY_STYLE = {
    backgroundColor: 'rgba(255, 255, 255, 0)',
    backgroundEffect: 'none' as const,
    backgroundImageUrl: '',
    borderColor: '#38bdf8',
    borderWidth: 0,
    borderStyle: 'solid' as const,
    shadowRadius: 0,
    shadowColor: 'rgba(0, 0, 0, 0.5)',
};

function createTextWidget(id: string, transform: Partial<WidgetStyle> = {}): WidgetModel {
    return {
        id,
        kind: 'text',
        props: DEFAULT_TEXT_WIDGET_PROPS,
        style: {
            ...DEFAULT_OVERLAY_STYLE,
            ...DEFAULT_TEXT_WIDGET_TRANSFORM,
            ...transform,
        },
        autoHide: false,
    };
}

function createIframeWidget(id: string, transform: Partial<WidgetStyle> = {}): WidgetModel {
    return {
        id,
        kind: 'iframe',
        props: DEFAULT_IFRAME_WIDGET_PROPS,
        style: {
            ...DEFAULT_OVERLAY_STYLE,
            ...DEFAULT_TEXT_WIDGET_TRANSFORM,
            ...transform,
        },
        autoHide: false,
    };
}

function createDefaultOverlayState(): OverlayState {
    return {
        widgets: [
            createTextWidget('text-widget-1'),
            createIframeWidget('iframe-widget-1', { transform: buildTransformString(200, 150, 0), width: '555px' }),
        ],
        activeWidgetId: null,
    };
}

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

export const useOverlayStore = create<OverlayStore>((set) => ({
    overlay: createDefaultOverlayState(),

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

    addOverlayWidget: (widget) => {
        set((state) => {
            const withoutSameId = state.overlay.widgets.filter((item) => item.id !== widget.id);

            return {
                overlay: {
                    ...state.overlay,
                    widgets: [...withoutSameId, widget],
                    activeWidgetId: widget.id,
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

export const useOverlayStore = useOverlayStore;

export function useOverlaySelector<T>(selector: (state: OverlayStore) => T): T {
    return useOverlayStore(selector);
}
