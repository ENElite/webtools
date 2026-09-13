import {
    componentId,
    createComponentLoadBarrier,
    createSignalHub,
    widgetComponentId,
    type ComponentLoadBarrier,
    type ComponentRuntimeSignalMap,
    type SignalHub,
} from '@webtools/widget-core';

export const BACKGROUND_COMPONENT_ID = componentId('surface', 'background');
export const STANDBY_COMPONENT_ID = componentId('surface', 'standby');
export const STARTUP_BARRIER_COMPONENT_ID = componentId('barrier', 'first-screen');
export const TIME_SOURCE_COMPONENT_ID = componentId('runtime', 'clock');

export interface WebpaperRuntimeSignals {
    readonly hub: SignalHub<ComponentRuntimeSignalMap>;
    readonly startupBarrier: ComponentLoadBarrier;
}

/**
 * Builds one isolated runtime session. The first-screen cohort is frozen here:
 * later widgets still publish signals, but never reopen the startup overlay.
 */
export function createWebpaperRuntimeSignals(
    initialWidgetIds: readonly string[],
    timeoutMs = 15_000,
): WebpaperRuntimeSignals {
    const hub = createSignalHub<ComponentRuntimeSignalMap>();
    const startupBarrier = createComponentLoadBarrier({
        hub,
        id: STARTUP_BARRIER_COMPONENT_ID,
        resourceKey: 'first-screen',
        members: [
            BACKGROUND_COMPONENT_ID,
            ...initialWidgetIds.map(widgetComponentId),
        ],
        timeoutMs,
    });
    return Object.freeze({ hub, startupBarrier });
}

export function signalRuntimeTime(
    hub: SignalHub<ComponentRuntimeSignalMap>,
    now = Date.now(),
): void {
    hub.emit('component.time.tick', { source: TIME_SOURCE_COMPONENT_ID, now });
}
