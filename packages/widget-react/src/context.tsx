'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useSyncExternalStore,
} from 'react';
import type { ReactNode } from 'react';
import { createSignalHub } from '@webtools/widget-core';
import type {
    ComponentRuntimeSignalMap,
    SignalHub,
    WidgetEngine,
    WidgetEngineSnapshot,
    WidgetId,
} from '@webtools/widget-core';

import type { WidgetViewCatalog } from './catalog';

export interface WidgetRuntimeSnapshot {
    readonly selectedWidgetId: WidgetId | null;
    readonly settingsWidgetId: WidgetId | null;
}

export interface WidgetRuntimeController {
    readonly engine: WidgetEngine;
    readonly views: WidgetViewCatalog;
    getSnapshot(): WidgetRuntimeSnapshot;
    subscribe(listener: () => void): () => void;
    selectWidget(widgetId: WidgetId | null): void;
    requestSettings(widgetId: WidgetId): void;
    closeSettings(): void;
    reconcile(): void;
}

export interface WidgetRuntimeContextValue extends WidgetRuntimeSnapshot {
    readonly engine: WidgetEngine;
    readonly views: WidgetViewCatalog;
    readonly signals: SignalHub<ComponentRuntimeSignalMap>;
    readonly editable: boolean;
    selectWidget(widgetId: WidgetId | null): void;
    requestSettings(widgetId: WidgetId): void;
    closeSettings(): void;
}

const WidgetRuntimeContext = createContext<WidgetRuntimeContextValue | null>(null);

export interface WidgetRuntimeProviderProps {
    readonly engine: WidgetEngine;
    readonly views: WidgetViewCatalog;
    /** Supply one stable application hub to connect widgets with other components. */
    readonly signals?: SignalHub<ComponentRuntimeSignalMap>;
    readonly editable?: boolean;
    readonly children: ReactNode;
}

const EMPTY_RUNTIME_SNAPSHOT: WidgetRuntimeSnapshot = Object.freeze({
    selectedWidgetId: null,
    settingsWidgetId: null,
});

/** Creates one isolated, side-effect-free editing session. */
export function createWidgetRuntime(
    engine: WidgetEngine,
    views: WidgetViewCatalog,
): WidgetRuntimeController {
    let snapshot = EMPTY_RUNTIME_SNAPSHOT;
    const listeners = new Set<() => void>();

    const publish = (next: WidgetRuntimeSnapshot): void => {
        if (
            next.selectedWidgetId === snapshot.selectedWidgetId
            && next.settingsWidgetId === snapshot.settingsWidgetId
        ) return;

        snapshot = Object.freeze(next);
        for (const listener of listeners) listener();
    };

    const widgetExists = (widgetId: WidgetId): boolean =>
        engine.getSnapshot().document.widgets.some((widget) => widget.id === widgetId);

    return Object.freeze({
        engine,
        views,
        getSnapshot: () => snapshot,
        subscribe(listener: () => void) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        selectWidget(widgetId: WidgetId | null) {
            if (widgetId !== null && !widgetExists(widgetId)) {
                throw new Error(`Cannot select missing widget: ${widgetId}`);
            }
            publish({
                selectedWidgetId: widgetId,
                settingsWidgetId: widgetId === snapshot.selectedWidgetId
                    ? snapshot.settingsWidgetId
                    : null,
            });
        },
        requestSettings(widgetId: WidgetId) {
            if (!widgetExists(widgetId)) {
                throw new Error(`Cannot open settings for missing widget: ${widgetId}`);
            }
            publish({ selectedWidgetId: widgetId, settingsWidgetId: widgetId });
        },
        closeSettings() {
            publish({ ...snapshot, settingsWidgetId: null });
        },
        reconcile() {
            const selectedWidgetId = snapshot.selectedWidgetId !== null && widgetExists(snapshot.selectedWidgetId)
                ? snapshot.selectedWidgetId
                : null;
            const settingsWidgetId = snapshot.settingsWidgetId !== null && widgetExists(snapshot.settingsWidgetId)
                ? snapshot.settingsWidgetId
                : null;
            publish({ selectedWidgetId, settingsWidgetId });
        },
    });
}

export function WidgetRuntimeProvider({
    engine,
    views,
    signals,
    editable = true,
    children,
}: WidgetRuntimeProviderProps) {
    const runtime = useMemo(() => createWidgetRuntime(engine, views), [engine, views]);
    const runtimeSignals = useMemo(
        () => signals ?? createSignalHub<ComponentRuntimeSignalMap>(),
        [signals],
    );
    const runtimeSnapshot = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot, runtime.getSnapshot);
    const engineSnapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);

    useEffect(() => {
        runtime.reconcile();
    }, [engineSnapshot, runtime]);

    useEffect(() => {
        if (!editable) runtime.selectWidget(null);
    }, [editable, runtime]);

    const selectWidget = useCallback((widgetId: WidgetId | null) => {
        if (editable) runtime.selectWidget(widgetId);
    }, [editable, runtime]);
    const requestSettings = useCallback((widgetId: WidgetId) => {
        if (editable) runtime.requestSettings(widgetId);
    }, [editable, runtime]);
    const closeSettings = useCallback(() => runtime.closeSettings(), [runtime]);

    const selectedWidgetId = editable
        && runtimeSnapshot.selectedWidgetId !== null
        && engineSnapshot.document.widgets.some((widget) => widget.id === runtimeSnapshot.selectedWidgetId)
        ? runtimeSnapshot.selectedWidgetId
        : null;
    const settingsWidgetId = editable
        && runtimeSnapshot.settingsWidgetId !== null
        && engineSnapshot.document.widgets.some((widget) => widget.id === runtimeSnapshot.settingsWidgetId)
        ? runtimeSnapshot.settingsWidgetId
        : null;

    const value = useMemo<WidgetRuntimeContextValue>(() => ({
        engine,
        views,
        signals: runtimeSignals,
        editable,
        selectedWidgetId,
        settingsWidgetId,
        selectWidget,
        requestSettings,
        closeSettings,
    }), [
        closeSettings,
        editable,
        engine,
        requestSettings,
        runtimeSignals,
        selectedWidgetId,
        settingsWidgetId,
        views,
        selectWidget,
    ]);

    return <WidgetRuntimeContext.Provider value={value}>{children}</WidgetRuntimeContext.Provider>;
}

export function useWidgetRuntime(): WidgetRuntimeContextValue {
    const runtime = useContext(WidgetRuntimeContext);
    if (!runtime) throw new Error('useWidgetRuntime must be used inside WidgetRuntimeProvider');
    return runtime;
}

/** Returns the shared component signal hub for this widget session. */
export function useWidgetSignals(): SignalHub<ComponentRuntimeSignalMap> {
    return useWidgetRuntime().signals;
}

export function useWidgetSnapshot(): WidgetEngineSnapshot {
    const { engine } = useWidgetRuntime();
    return useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);
}
