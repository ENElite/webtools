import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import {
    componentId,
    createComponentLoadBarrier,
    createComponentLoadPort,
    createSignalHub,
    widgetComponentId,
} from './signals';
import type { ComponentLoadSignalMap, ComponentRuntimeSignalMap } from './signals';

afterEach(() => vi.useRealTimers());

describe('SignalHub', () => {
    it('delivers synchronously in order and safely snapshots subscription mutations', () => {
        type Signals = { tick: { readonly value: number } };
        const failures: unknown[] = [];
        const hub = createSignalHub<Signals>({ onSlotError: ({ error }) => failures.push(error) });
        const calls: string[] = [];
        let disconnectThird = () => {};

        hub.connect('tick', ({ value }) => {
            calls.push(`first:${value}`);
            disconnectThird();
            hub.connect('tick', ({ value: next }) => calls.push(`late:${next}`));
        });
        hub.connect('tick', ({ value }) => {
            calls.push(`throwing:${value}`);
            throw new Error('slot failed');
        });
        disconnectThird = hub.connect('tick', ({ value }) => calls.push(`third:${value}`));

        hub.emit('tick', { value: 1 });
        expect(calls).toEqual(['first:1', 'throwing:1']);
        expect(failures).toHaveLength(1);
        hub.emit('tick', { value: 2 });
        expect(calls).toEqual(['first:1', 'throwing:1', 'first:2', 'throwing:2', 'late:2']);
    });

    it('supports nested emission, idempotent disconnect, and the runtime superset', () => {
        const hub = createSignalHub<ComponentRuntimeSignalMap>();
        const calls: number[] = [];
        const disconnect = hub.connect('component.time.tick', ({ now }) => {
            calls.push(now);
            if (now === 1) hub.emit('component.time.tick', {
                source: componentId('clock', 'shared'),
                now: 2,
            });
        });
        hub.emit('component.time.tick', { source: componentId('clock', 'shared'), now: 1 });
        disconnect();
        disconnect();
        hub.emit('component.message', {
            source: componentId('widget', 'sender'),
            target: componentId('widget', 'receiver'),
            topic: 'greeting',
            payload: { text: 'hello' },
        });
        createComponentLoadPort({
            hub,
            componentId: widgetComponentId('runtime-compatible'),
        }).start('asset').dispose();
        expect(calls).toEqual([1, 2]);
        expectTypeOf(hub.emit).toBeFunction();
    });
});

describe('component loading lifecycle', () => {
    it('creates stable shared component identities', () => {
        expect(componentId('widget', 'alpha')).toBe('widget:alpha');
        expect(widgetComponentId('alpha')).toBe('widget:alpha');
        expect(() => componentId('bad:namespace', 'alpha')).toThrow(TypeError);
        expect(() => componentId('widget', '')).toThrow(TypeError);
    });

    it('publishes idempotent attempts and gives same-resource retries distinct identities', () => {
        const hub = createSignalHub<ComponentLoadSignalMap>();
        const starts = vi.fn();
        const progress = vi.fn();
        const complete = vi.fn();
        const error = vi.fn();
        hub.connect('component.load.start', starts);
        hub.connect('component.load.progress', progress);
        hub.connect('component.load.complete', complete);
        hub.connect('component.load.error', error);
        const port = createComponentLoadPort({ hub, componentId: widgetComponentId('photo') });

        const stale = port.start('same-url');
        const current = port.start('same-url');
        expect(stale.source.attemptId).not.toBe(current.source.attemptId);
        stale.progress(1, 2);
        stale.complete();
        current.progress(1, 2);
        current.complete();
        current.complete();
        current.error(new Error('late'));

        expect(starts).toHaveBeenCalledTimes(2);
        expect(progress).toHaveBeenCalledTimes(1);
        expect(complete).toHaveBeenCalledTimes(1);
        expect(error).not.toHaveBeenCalled();
        port.dispose();
        port.dispose();
        expect(() => port.start('after-dispose')).toThrow('disposed');
    });

    it('is inert until started, tracks the latest attempt, and retains completion', async () => {
        const hub = createSignalHub<ComponentLoadSignalMap>();
        const barrierId = componentId('barrier', 'wallpaper');
        const firstId = widgetComponentId('first');
        const secondId = widgetComponentId('second');
        const starts: string[] = [];
        const aggregateProgress: Array<[number, number]> = [];
        const completions: Array<readonly string[]> = [];
        hub.connect('component.load.start', ({ source }) => starts.push(source.componentId));
        hub.connect('component.load.progress', ({ source, loaded, total }) => {
            if (source.componentId === barrierId) aggregateProgress.push([loaded, total]);
        });
        hub.connect('component.load.complete', ({ source, failedIds }) => {
            if (source.componentId === barrierId) completions.push(failedIds ?? []);
        });
        const barrier = createComponentLoadBarrier({
            hub,
            id: barrierId,
            resourceKey: 'initial-document',
            members: [firstId, secondId],
            timeoutMs: 1_000,
        });
        const listener = vi.fn();
        barrier.subscribe(listener);

        expect(starts).toEqual([]);
        expect(barrier.getSnapshot()).toMatchObject({ status: 'idle', pending: 2 });
        barrier.start();
        expect(starts).toEqual(['barrier:wallpaper']);
        expect(aggregateProgress).toEqual([[0, 2]]);

        // A same-key retry is distinguished by attemptId, not resourceKey alone.
        const oldFirst = createComponentLoadPort({ hub, componentId: firstId }).start('image-a');
        const retryFirst = createComponentLoadPort({ hub, componentId: firstId }).start('image-a');
        oldFirst.complete();
        expect(barrier.getSnapshot().pending).toBe(2);
        retryFirst.complete();
        expect(barrier.getSnapshot()).toMatchObject({ settled: 1, pending: 1 });

        createComponentLoadPort({ hub, componentId: secondId })
            .start('video-a').error(new Error('decode failed'));
        expect(barrier.getSnapshot().status).toBe('pending');
        await Promise.resolve();
        expect(barrier.getSnapshot()).toEqual({
            status: 'complete', total: 2, settled: 2, pending: 0, failedIds: ['widget:second'],
        });
        expect(aggregateProgress.at(-1)).toEqual([2, 2]);
        expect(completions).toEqual([['widget:second']]);
        expect(listener).toHaveBeenCalled();

        const lateSnapshot = barrier.getSnapshot();
        createComponentLoadPort({ hub, componentId: secondId }).start('later-retry');
        expect(barrier.getSnapshot()).toBe(lateSnapshot);
        expect(completions).toHaveLength(1);
    });

    it('invalidates a same-tick completion candidate when a member retries', async () => {
        const hub = createSignalHub<ComponentLoadSignalMap>();
        const memberId = widgetComponentId('strict');
        const barrier = createComponentLoadBarrier({
            hub, id: componentId('barrier', 'strict'), members: [memberId],
        });
        barrier.start();
        createComponentLoadPort({ hub, componentId: memberId }).start('asset').complete();
        const replay = createComponentLoadPort({ hub, componentId: memberId }).start('asset');

        await Promise.resolve();
        expect(barrier.getSnapshot()).toMatchObject({ status: 'pending', pending: 1 });
        replay.complete();
        expect(barrier.getSnapshot().status).toBe('pending');
        await Promise.resolve();
        expect(barrier.getSnapshot()).toMatchObject({ status: 'complete', pending: 0 });
    });

    it('uses a hard deadline and fails waiting and active members', async () => {
        vi.useFakeTimers();
        const hub = createSignalHub<ComponentLoadSignalMap>();
        const barrierId = componentId('barrier', 'timeout');
        const completion = vi.fn();
        hub.connect('component.load.complete', (signal) => {
            if (signal.source.componentId === barrierId) completion(signal);
        });
        const barrier = createComponentLoadBarrier({
            hub,
            id: barrierId,
            members: [widgetComponentId('active'), widgetComponentId('silent')],
            timeoutMs: 25,
        });
        barrier.start();
        vi.advanceTimersByTime(20);
        createComponentLoadPort({ hub, componentId: widgetComponentId('active') })
            .start('late-start-does-not-reset-deadline');
        vi.advanceTimersByTime(5);
        createComponentLoadPort({ hub, componentId: widgetComponentId('silent') })
            .start('post-deadline-retry-is-ignored');
        await Promise.resolve();

        expect(barrier.getSnapshot()).toEqual({
            status: 'complete', total: 2, settled: 2, pending: 0,
            failedIds: ['widget:active', 'widget:silent'],
        });
        expect(completion).toHaveBeenCalledWith(expect.objectContaining({
            failedIds: ['widget:active', 'widget:silent'],
        }));
    });

    it('disarms and restarts without transient StrictMode-style completion', async () => {
        const hub = createSignalHub<ComponentLoadSignalMap>();
        const barrierId = componentId('barrier', 'restartable');
        const memberId = widgetComponentId('pending');
        const completions = vi.fn();
        hub.connect('component.load.complete', (signal) => {
            if (signal.source.componentId === barrierId) completions(signal);
        });
        const barrier = createComponentLoadBarrier({ hub, id: barrierId, members: [memberId] });
        const cleanup = barrier.start();
        const port = createComponentLoadPort({ hub, componentId: memberId });
        const stale = port.start('asset');
        cleanup();
        cleanup();
        stale.complete();
        await Promise.resolve();
        expect(barrier.getSnapshot()).toMatchObject({ status: 'idle' });
        expect(completions).not.toHaveBeenCalled();

        barrier.start();
        port.start('asset').complete();
        await Promise.resolve();
        expect(barrier.getSnapshot()).toMatchObject({ status: 'complete' });
        expect(completions).toHaveBeenCalledTimes(1);
    });

    it('stably completes an empty cohort and disposes with subscriber notification', async () => {
        const hub = createSignalHub<ComponentLoadSignalMap>();
        const empty = createComponentLoadBarrier({
            hub, id: componentId('barrier', 'empty'), members: [],
        });
        empty.start();
        expect(empty.getSnapshot().status).toBe('pending');
        await Promise.resolve();
        expect(empty.getSnapshot()).toMatchObject({ status: 'complete', total: 0, pending: 0 });

        const disposed = createComponentLoadBarrier({
            hub,
            id: componentId('barrier', 'disposed'),
            members: [widgetComponentId('pending')],
        });
        const listener = vi.fn();
        disposed.subscribe(listener);
        disposed.start();
        disposed.dispose();
        expect(disposed.getSnapshot()).toMatchObject({ status: 'disposed', pending: 1 });
        expect(listener).toHaveBeenCalled();
    });

    it('rejects duplicate/self members and invalid timeouts', () => {
        const hub = createSignalHub<ComponentLoadSignalMap>();
        const source = widgetComponentId('same');
        expect(() => createComponentLoadBarrier({
            hub, id: componentId('barrier', 'duplicate'), members: [source, source],
        })).toThrow('Duplicate component load member');
        expect(() => createComponentLoadBarrier({
            hub, id: componentId('barrier', 'timeout'), members: [], timeoutMs: Number.NaN,
        })).toThrow(RangeError);
        expect(() => createComponentLoadBarrier({
            hub,
            id: componentId('barrier', 'self'),
            members: [componentId('barrier', 'self')],
        })).toThrow('cannot include itself');
    });
});
