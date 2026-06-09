import { create } from 'zustand';

import type { WidgetId, WidgetModel } from '../engine/model';
import {
    CommandHistoryManager,
    type Command,
    type CommandSnapshot,
} from '../engine/commands';
import { createWidget, WidgetKinds } from '../engine/model';
import { signalBus, createWidgetSignal } from '../engine/signal';

export type OverlayState = {
    // Core State
    widgets: WidgetModel[];
    activeWidgetId: WidgetId | null;
    pendingSettingsWidgetId: WidgetId | null;

    // Undo/Redo State
    canUndo: boolean;
    canRedo: boolean;

    // State Setters (Non-command operations)
    setWidgets: (widgets: WidgetModel[]) => void;
    initWidgets: (widgets: WidgetModel[]) => void;
    setActiveWidget: (widgetId: WidgetId | null) => void;
    requestWidgetSettings: (widgetId: WidgetId) => void;
    clearWidgetSettingsRequest: () => void;

    // Command System
    executeCommand: (command: Command) => void;
    undo: () => void;
    redo: () => void;
    clearHistory: () => void;
};

// Helper functions (kept from original)
function findWidgetIndex(widgets: WidgetModel[], widgetId: WidgetId): number {
    return widgets.findIndex((widget) => widget.id === widgetId);
}

function findWidget(widgets: WidgetModel[], widgetId: WidgetId): WidgetModel | null {
    return widgets.find((widget) => widget.id === widgetId) || null;
}

/**
 * 从 command patch 中提取变化的属性，发射 model.* 前缀信号。
 * patch.set 的 key 是 dot-path（如 'style.opacity'），信号 type 使用 'model.' 前缀。
 */
function emitPatchSignals(widgetId: string, patch: { set?: Record<string, unknown>; unset?: string[] }, widgets: WidgetModel[]) {
    const widget = widgets.find((w) => w.id === widgetId);
    function resolvePrev(dotPath: string): unknown {
        if (!widget) return undefined;
        const parts = dotPath.split('.');
        let cur: unknown = widget;
        for (const p of parts) {
            if (cur == null || typeof cur !== 'object') return undefined;
            cur = (cur as Record<string, unknown>)[p];
        }
        return cur;
    }
    if (patch.set) {
        for (const [path, value] of Object.entries(patch.set)) {
            signalBus.emit(createWidgetSignal(widgetId, `model.${path}` as any, resolvePrev(path), value));
        }
    }
    if (patch.unset) {
        for (const path of patch.unset) {
            signalBus.emit(createWidgetSignal(widgetId, `model.${path}` as any, resolvePrev(path), undefined));
        }
    }
}

/**
 * 递归 diff 两个 widget，为每个变化的叶子属性发射 model.* 前缀信号。
 * 用于非 UpdateWidgetCommand 的场景（如 undo/redo 直接替换 widget）。
 */
function emitChangedWidgetSignals(prevWidget: WidgetModel, nextWidget: WidgetModel) {
    function walkChanges(prev: any, next: any, prefix: string) {
        const keys = new Set([...Object.keys(prev ?? {}), ...Object.keys(next ?? {})]);
        for (const key of keys) {
            const path = prefix ? `${prefix}.${key}` : key;
            const prevVal = prev?.[key];
            const nextVal = next?.[key];
            if (prevVal === nextVal) continue;

            // If both are objects, recurse to emit granular signals
            if (
                prevVal !== null && typeof prevVal === 'object' && !Array.isArray(prevVal) &&
                nextVal !== null && typeof nextVal === 'object' && !Array.isArray(nextVal)
            ) {
                walkChanges(prevVal, nextVal, path);
                continue;
            }

            const type = `model.${path}` as any;
            signalBus.emit(createWidgetSignal(nextWidget.id, type, prevVal, nextVal));
        }
    }
    walkChanges(prevWidget, nextWidget, '');
}

export function createDefaultWidgets(): WidgetModel[] {
    return [
        createWidget(WidgetKinds.TEXT, { layout: { order: 1 } }),
        createWidget(WidgetKinds.LIVE2D, {
            layout: {
                anchorX: 'right',
                anchorY: 'bottom',
                x: 0,
                y: 0,
                w: 16,
                h: 40,
                rotation: 0,
                adapt: 'stretch',
                order: 2,
            },
        }),
        createWidget(WidgetKinds.CLOCK, {
            layout: {
                anchorX: 'left',
                anchorY: 'bottom',
                x: 0,
                y: -10,
                w: 40,
                h: 16,
                rotation: 0,
                adapt: 'stretch',
                order: 3,
            },
        }),
    ];
}

// Create the history manager as a persistent external object
const historyManager = new CommandHistoryManager(100);

/**
 * 检查 command 是否为 UpdateWidgetCommand（有 patch 属性）。
 */
function hasPatch(command: Command): command is Command & { patch: { set?: Record<string, unknown>; unset?: string[] }; widgetId: string } {
    return 'patch' in command && 'widgetId' in command;
}

export const useOverlayStore = create<OverlayState>((set) => ({
    // Initial State - empty, will be initialized by consumer
    widgets: [],
    activeWidgetId: null,
    pendingSettingsWidgetId: null,
    canUndo: false,
    canRedo: false,

    // Non-command State Setters
    setWidgets: (widgets) => {
        set((state) => {
            const activeWidgetId =
                state.activeWidgetId && findWidgetIndex(widgets, state.activeWidgetId) >= 0
                    ? state.activeWidgetId
                    : null;

            return {
                widgets: widgets.slice(),
                activeWidgetId,
            };
        });
    },

    initWidgets: (widgets) => {
        set({ widgets: widgets.slice() });
    },

    setActiveWidget: (widgetId) => {
        set((state) => {
            if (!widgetId) {
                return {
                    activeWidgetId: null,
                };
            }

            const widget = findWidget(state.widgets, widgetId);
            if (!widget) {
                return state;
            }

            return {
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

    // Command System
    executeCommand: (command) => {
        set((state) => {
            const snapshot: CommandSnapshot = {
                widgets: state.widgets,
                activeWidgetId: state.activeWidgetId,
            };

            if (!command.canExecute(snapshot)) {
                console.warn('Command cannot be executed:', command.getDescription());
                return state;
            }

            const nextWidgets = command.execute(snapshot);
            historyManager.execute(command);

            // Emit signals for changed widgets
            // Note: mount/unmount signals are handled by useLifecycleSignal in Widget.tsx
            for (const nextWidget of nextWidgets) {
                const prevWidget = state.widgets.find((w) => w.id === nextWidget.id);
                if (!prevWidget) continue; // New widget — mount signal handled by useLifecycleSignal
                if (prevWidget === nextWidget) continue;

                // 优先从 command patch 提取变化（精确、高效）
                if (hasPatch(command) && command.widgetId === nextWidget.id) {
                    emitPatchSignals(nextWidget.id, command.patch, state.widgets);
                } else {
                    // Fallback: 递归 diff
                    emitChangedWidgetSignals(prevWidget, nextWidget);
                }
            }

            const historyState = historyManager.getState();
            return {
                widgets: nextWidgets,
                canUndo: historyState.canUndo,
                canRedo: historyState.canRedo,
            };
        });
    },

    undo: () => {
        set((state) => {
            const command = historyManager.undo();
            if (!command) {
                return state;
            }

            const snapshot: CommandSnapshot = {
                widgets: state.widgets,
                activeWidgetId: state.activeWidgetId,
            };

            const nextWidgets = command.undo(snapshot);

            // Emit signals for changed widgets
            for (const nextWidget of nextWidgets) {
                const prevWidget = state.widgets.find((w) => w.id === nextWidget.id);
                if (prevWidget && prevWidget !== nextWidget) {
                    emitChangedWidgetSignals(prevWidget, nextWidget);
                }
            }

            const historyState = historyManager.getState();
            return {
                widgets: nextWidgets,
                canUndo: historyState.canUndo,
                canRedo: historyState.canRedo,
            };
        });
    },

    redo: () => {
        set((state) => {
            const command = historyManager.redo();
            if (!command) {
                return state;
            }

            const snapshot: CommandSnapshot = {
                widgets: state.widgets,
                activeWidgetId: state.activeWidgetId,
            };

            const nextWidgets = command.execute(snapshot);

            // Emit signals for changed widgets
            for (const nextWidget of nextWidgets) {
                const prevWidget = state.widgets.find((w) => w.id === nextWidget.id);
                if (prevWidget && prevWidget !== nextWidget) {
                    emitChangedWidgetSignals(prevWidget, nextWidget);
                }
            }

            const historyState = historyManager.getState();
            return {
                widgets: nextWidgets,
                canUndo: historyState.canUndo,
                canRedo: historyState.canRedo,
            };
        });
    },

    clearHistory: () => {
        historyManager.clear();
        set(() => ({
            canUndo: false,
            canRedo: false,
        }));
    },

}));
