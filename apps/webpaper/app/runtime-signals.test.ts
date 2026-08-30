import {
    createComponentLoadPort,
    widgetComponentId,
} from '@webtools/widget-core';
import { describe, expect, it, vi } from 'vitest';

import {
    BACKGROUND_COMPONENT_ID,
    createWebpaperRuntimeSignals,
    signalRuntimeTime,
    STARTUP_BARRIER_COMPONENT_ID,
    TIME_SOURCE_COMPONENT_ID,
} from './runtime-signals';

describe('WebPaper runtime signals', () => {
    it('freezes background and initial widgets into one retained startup barrier', async () => {
        vi.useFakeTimers();
        const runtime = createWebpaperRuntimeSignals(['clock-1'], 1_000);
        const background = createComponentLoadPort({
            hub: runtime.hub,
            componentId: BACKGROUND_COMPONENT_ID,
        });
        const clock = createComponentLoadPort({
            hub: runtime.hub,
            componentId: widgetComponentId('clock-1'),
        });

        const stop = runtime.startupBarrier.start();
        background.start('konachan:first').complete();
        clock.start('sync').complete();
        await Promise.resolve();

        expect(runtime.startupBarrier.id).toBe(STARTUP_BARRIER_COMPONENT_ID);
        expect(runtime.startupBarrier.getSnapshot()).toEqual({
            status: 'complete',
            total: 2,
            settled: 2,
            pending: 0,
            failedIds: [],
        });

        stop();
        vi.useRealTimers();
    });

    it('publishes one shared timebase through a typed slot', () => {
        const runtime = createWebpaperRuntimeSignals([]);
        const slot = vi.fn();
        runtime.hub.connect('component.time.tick', slot);

        signalRuntimeTime(runtime.hub, 123_456);

        expect(slot).toHaveBeenCalledWith({ source: TIME_SOURCE_COMPONENT_ID, now: 123_456 });
    });
});
