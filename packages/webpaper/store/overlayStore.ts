import { create } from 'zustand';


import { createWidget, generateWidgetId } from '@/features/overlay/registry';
import { layoutFromPx, parseTransformString, pxFromLayout } from '@/features/overlay/transform_utils';

import type {
    WidgetId,
    WidgetModel,
    WidgetLayout,
} from '@/features/overlay/types';

type OverlayState = {
    widgets: WidgetModel[];
    activeWidgetId: WidgetId | null;
    pendingSettingsWidgetId: WidgetId | null;
    setWidgets: (widgets: WidgetModel[]) => void;
    setActiveWidget: (widgetId: WidgetId | null) => void;
    requestWidgetSettings: (widgetId: WidgetId) => void;
    clearWidgetSettingsRequest: () => void;
    addWidget: (widget: WidgetModel) => void;
    removeWidget: (widgetId: WidgetId) => void;
    updateWidget: (widgetId: WidgetId, patch: Partial<Omit<WidgetModel, 'id'>>) => void;
    updateWidgetLayout: (widgetId: WidgetId, patch: Partial<WidgetLayout>) => void;
    moveWidgetUp: (widgetId: WidgetId) => void;
    moveWidgetDown: (widgetId: WidgetId) => void;
    moveWidgetToTop: (widgetId: WidgetId) => void;
    moveWidgetToBottom: (widgetId: WidgetId) => void;
    copyWidget: (widgetId: WidgetId, layout?: WidgetLayout) => void;
    changeWidgetLayout: (widgetId: WidgetId, target: HTMLElement | null, container: HTMLElement | null) => void;
    changeWidgetStyle: (widgetId: WidgetId, target: HTMLElement | null) => void;
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

type PxRect = { x: number; y: number; w: number; h: number; rotation: number };

function getTargetPxRect(target: HTMLElement, container: HTMLElement | null): PxRect {
    const targetRect = target.getBoundingClientRect();
    const containerRect = container?.getBoundingClientRect();
    const containerLeft = containerRect?.left ?? 0;
    const containerTop = containerRect?.top ?? 0;
    const { rotation } = parseTransformString(target.style.transform);

    return {
        x: targetRect.left - containerLeft,
        y: targetRect.top - containerTop,
        w: targetRect.width,
        h: targetRect.height,
        rotation,
    };
}

function assertLayoutMatchesTarget(layout: WidgetLayout, target: HTMLElement, container: HTMLElement | null): void {
    if (process.env.NODE_ENV === 'production') {
        return;
    }

    const containerRect = container?.getBoundingClientRect();
    const containerWidth = containerRect?.width ?? window.innerWidth;
    const containerHeight = containerRect?.height ?? window.innerHeight;
    const expectedPx = pxFromLayout(layout, containerWidth || 1, containerHeight || 1);
    const actualPx = getTargetPxRect(target, container);

    const epsilon = 0.5;

    const mismatches: Array<[string, number, number]> = [];
    const candidates: Array<[string, number, number]> = [
        ['x', expectedPx.x, actualPx.x],
        ['y', expectedPx.y, actualPx.y],
        ['w', expectedPx.w, actualPx.w],
        ['h', expectedPx.h, actualPx.h],
        ['rotation', expectedPx.rotation, actualPx.rotation],
    ];

    for (const candidate of candidates) {
        const [, expected, actual] = candidate;
        if (Math.abs(expected - actual) > epsilon) {
            mismatches.push(candidate);
        }
    }

    if (mismatches.length > 0) {
        throw new Error(`Widget layout validation failed: ${mismatches.map(([key, expected, actual]) => `${String(key)} expected ${expected} but got ${actual}`).join(', ')}`);
    }
}

export function createDefaultWidgets(): WidgetModel[] {
    return [
        createWidget('text'),
        createWidget('live2d', { layout: { anchorX: 'right', anchorY: 'bottom', x: 0, y: 0, w: 16, h: 40, rotation: 0, adapt: 'stretch' } }),
        createWidget('clock', { layout: { anchorX: 'left', anchorY: 'bottom', x: 0, y: -10, w: 40, h: 16, rotation: 0, adapt: 'stretch' } }),
    ];
}

export const useOverlayStore = create<OverlayState>((set) => ({
    widgets: createDefaultWidgets(),
    activeWidgetId: null,
    pendingSettingsWidgetId: null,

    setWidgets: (widgets) => {
        set((state) => {
            const activeWidgetId = state.activeWidgetId && findWidgetIndex(widgets, state.activeWidgetId) >= 0
                ? state.activeWidgetId
                : null;

            return {
                ...state,
                widgets: widgets.slice(),
                activeWidgetId,
            };
        });
    },

    setActiveWidget: (widgetId) => {
        set((state) => {
            if (!widgetId) {
                return {
                    ...state,
                    activeWidgetId: null,
                };
            }

            const widget = findWidget(state, widgetId);
            if (!widget) {
                return state;
            }

            return {
                ...state,
                activeWidgetId: widgetId,
            };
        });
    },

    requestWidgetSettings: (widgetId) => {
        set(() => ({
            pendingSettingsWidgetId: widgetId,
        }));
    },

    clearWidgetSettingsRequest: () => {
        set(() => ({
            pendingSettingsWidgetId: null,
        }));
    },

    addWidget: (widget) => {
        set((state) => {
            const withoutSameId = state.widgets.filter((item) => item.id !== widget.id);

            return {
                ...state,
                widgets: [...withoutSameId, widget],
                activeWidgetId: state.activeWidgetId,
            };
        });
    },

    removeWidget: (widgetId) => {
        set((state) => {
            const nextWidgets = state.widgets.filter((widget) => widget.id !== widgetId);

            return {
                ...state,
                widgets: nextWidgets,
                activeWidgetId: state.activeWidgetId === widgetId ? null : state.activeWidgetId,
            };
        });
    },

    updateWidget: (widgetId, patch) => {
        set((state) => replaceWidget(state, widgetId, patch));
    },

    updateWidgetLayout: (widgetId, patch) => {
        set((state) => {
            const widget = findWidget(state, widgetId);
            if (!widget) {
                return state;
            }

            const layout = {
                ...widget.layout,
                ...patch,
            };

            return replaceWidget(state, widgetId, { layout });
        });
    },

    moveWidgetUp: (widgetId) => {
        set((state) => {
            const index = findWidgetIndex(state.widgets, widgetId);
            return {
                ...state,
                widgets: moveWidgetByIndex(state.widgets, index, index + 1),
            };
        });
    },

    moveWidgetDown: (widgetId) => {
        set((state) => {
            const index = findWidgetIndex(state.widgets, widgetId);
            return {
                ...state,
                widgets: moveWidgetByIndex(state.widgets, index, index - 1),
            };
        });
    },

    moveWidgetToTop: (widgetId) => {
        set((state) => {
            const index = findWidgetIndex(state.widgets, widgetId);
            return {
                ...state,
                widgets: moveWidgetByIndex(state.widgets, index, state.widgets.length - 1),
            };
        });
    },

    moveWidgetToBottom: (widgetId) => {
        set((state) => {
            const index = findWidgetIndex(state.widgets, widgetId);
            return {
                ...state,
                widgets: moveWidgetByIndex(state.widgets, index, 0),
            };
        });
    },

    copyWidget: (widgetId, layout) => {
        set((state) => {
            const index = findWidgetIndex(state.widgets, widgetId);
            if (index < 0) {
                return state;
            }

            const sourceWidget = state.widgets[index];
            if (!sourceWidget) {
                return state;
            }
            const newId = generateWidgetId();
            const newLayout = {
                ...sourceWidget.layout,
                ...layout,
            };
            newLayout.x += 2;
            newLayout.y += 2;

            const newWidget: WidgetModel = {
                ...sourceWidget,
                id: newId,
                layout: newLayout,
            };

            const nextWidgets = state.widgets.slice();
            nextWidgets.splice(index + 1, 0, newWidget);

            return {
                ...state,
                widgets: nextWidgets,
                activeWidgetId: newId,
            };
        });
    },

    changeWidgetLayout: (widgetId, target, container) => {
        if (!(target instanceof HTMLElement)) {
            return;
        }

        set((state) => {
            const widget = findWidget(state, widgetId);
            if (!widget) {
                return state;
            }

            const containerRect = container?.getBoundingClientRect();
            const containerWidth = containerRect?.width ?? window.innerWidth;
            const containerHeight = containerRect?.height ?? window.innerHeight;

            // compute layout from element rect relative to container

            const layout = layoutFromPx(
                getTargetPxRect(target, container),
                containerWidth,
                containerHeight,
                widget.layout.anchorX,
                widget.layout.anchorY,
                widget.layout.adapt,
            );

            assertLayoutMatchesTarget(layout, target, container);

            return replaceWidget(state, widgetId, { layout });
        });
    },

    changeWidgetStyle: (widgetId, target) => {
        if (!(target instanceof HTMLElement)) {
            return;
        }

        set((state) => {
            const widget = findWidget(state, widgetId);
            if (!widget) {
                return state;
            }

            return replaceWidget(state, widgetId, {
                style: {
                    ...widget.style,
                    borderRadius: target.style.borderRadius || widget.style.borderRadius,
                },
            });
        });
    },
}));
