import { create } from 'zustand';

import type {
    WidgetId,
    WidgetModel,
} from '../overlay/types';
import {
    CommandHistoryManager,
    type Command,
    type CommandSnapshot,
} from '../overlay/commands';
import { createWidget } from '../overlay/registry';

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

export function createDefaultWidgets(): WidgetModel[] {
    return [
        createWidget('text'),
        createWidget('live2d', {
            layout: {
                anchorX: 'right',
                anchorY: 'bottom',
                x: 0,
                y: 0,
                w: 16,
                h: 40,
                rotation: 0,
                adapt: 'stretch',
            },
        }),
        createWidget('clock', {
            layout: {
                anchorX: 'left',
                anchorY: 'bottom',
                x: 0,
                y: -10,
                w: 40,
                h: 16,
                rotation: 0,
                adapt: 'stretch',
            },
        }),
    ];
}

// Create the history manager as a persistent external object
const historyManager = new CommandHistoryManager(100);

export const useOverlayStore = create<OverlayState>((set) => ({
    // Initial State
    widgets: createDefaultWidgets(),
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
