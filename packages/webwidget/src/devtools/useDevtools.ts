import { useEffect } from 'react';
import { create } from 'zustand';
import type { WidgetId } from '../engine/model';

export type DevtoolsTab = 'widgets' | 'signals' | 'state';

type DevtoolsState = {
    isOpen: boolean;
    activeTab: DevtoolsTab;
    selectedWidgetId: WidgetId | null;
    signalFilter: 'all' | 'widget' | 'system' | 'user' | 'lifecycle';
    signalPaused: boolean;

    toggle: () => void;
    open: () => void;
    close: () => void;
    setActiveTab: (tab: DevtoolsTab) => void;
    selectWidget: (id: WidgetId | null) => void;
    setSignalFilter: (filter: DevtoolsState['signalFilter']) => void;
    toggleSignalPause: () => void;
};

export const useDevtoolsStore = create<DevtoolsState>((set) => ({
    isOpen: false,
    activeTab: 'widgets',
    selectedWidgetId: null,
    signalFilter: 'all',
    signalPaused: false,

    toggle: () => set((s) => ({ isOpen: !s.isOpen })),
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
    setActiveTab: (tab) => set({ activeTab: tab }),
    selectWidget: (id) => set({ selectedWidgetId: id }),
    setSignalFilter: (filter) => set({ signalFilter: filter }),
    toggleSignalPause: () => set((s) => ({ signalPaused: !s.signalPaused })),
}));

/**
 * Hook that registers the global keyboard shortcut to toggle devtools.
 * Renders inside OverlayRoot so it has access to the keyboard events.
 */
export function useDevtoolsShortcut() {
    const toggle = useDevtoolsStore((s) => s.toggle);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                toggle();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggle]);
}
