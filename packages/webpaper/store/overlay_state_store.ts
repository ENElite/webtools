import { create } from 'zustand';


import { createWidget, generateWidgetId } from '@/features/overlay/registry';
import { layoutFromPx, pxFromLayout } from '@/features/overlay/transform_utils';

import type {
    OverlayState,
    WidgetId,
    WidgetModel,
    WidgetLayout,
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
    copyOverlayWidget: (widgetId: WidgetId, layout?: WidgetLayout) => void;
    updateOverlayWidgetLayoutFromTarget: (widgetId: WidgetId, target: HTMLElement | null, container: HTMLElement | null) => void;
    updateOverlayWidgetStyleFromTarget: (widgetId: WidgetId, target: HTMLElement | null) => void;
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

    const rotateMatch = /rotate\(([-\d.]+)deg\)/.exec(target.style.transform);

    return {
        x: targetRect.left - containerLeft,
        y: targetRect.top - containerTop,
        w: targetRect.width,
        h: targetRect.height,
        rotation: rotateMatch?.[1] ? Number.parseFloat(rotateMatch[1]) : 0,
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

export function createDefaultOverlayState(): OverlayState {
    return {
        widgets: [
            createWidget('text'),
            createWidget('clock', { layout: { anchorX: 'left', anchorY: 'bottom', x: 0, y: -10, w: 40, h: 16, rotation: 0, adapt: 'fixed' } }),
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

    copyOverlayWidget: (widgetId, layout) => {
        set((state) => {
            const index = findWidgetIndex(state.overlay.widgets, widgetId);
            if (index < 0) {
                return state;
            }

            const sourceWidget = state.overlay.widgets[index];
            if (!sourceWidget) {
                return state;
            }
            const newId = generateWidgetId();
            const newLayout = layout ?? { ...sourceWidget.layout };
            newLayout.x += 2;
            newLayout.y += 2;

            const newWidget: WidgetModel = {
                ...sourceWidget,
                id: newId,
                layout: newLayout,
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

    updateOverlayWidgetLayoutFromTarget: (widgetId, target, container) => {
        if (!(target instanceof HTMLElement)) {
            return;
        }

        set((state) => {
            const widget = findWidget(state.overlay, widgetId);
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

            return {
                overlay: replaceWidget(state.overlay, widgetId, { layout }),
            };
        });
    },

    updateOverlayWidgetStyleFromTarget: (widgetId, target) => {
        if (!(target instanceof HTMLElement)) {
            return;
        }

        set((state) => {
            const widget = findWidget(state.overlay, widgetId);
            if (!widget) {
                return state;
            }

            return {
                overlay: replaceWidget(state.overlay, widgetId, {
                    style: {
                        ...widget.style,
                        borderRadius: target.style.borderRadius || widget.style.borderRadius,
                    },
                }),
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
