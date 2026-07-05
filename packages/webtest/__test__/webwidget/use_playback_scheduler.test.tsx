import React, { useEffect } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePlaybackScheduler } from '@webwidget/src/hooks';

type SchedulerSnapshot = ReturnType<typeof usePlaybackScheduler> | null;

function Harness({
    desiredIntervalSec,
    isRunning,
    onSnapshot,
}: {
    desiredIntervalSec: number;
    isRunning: boolean;
    onSnapshot: (snapshot: SchedulerSnapshot) => void;
}) {
    const snapshot = usePlaybackScheduler({ desiredIntervalSec, isRunning });

    useEffect(() => {
        onSnapshot(snapshot);
    }, [onSnapshot, snapshot]);

    return null;
}

function renderHarness(
    props: React.ComponentProps<typeof Harness>
): {
    container: HTMLElement;
    root: Root;
    rerender: (next: Partial<React.ComponentProps<typeof Harness>>) => void;
} {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let currentProps = props;
    const render = () => {
        root.render(<Harness {...currentProps} />);
    };

    act(() => {
        render();
    });

    return {
        container,
        root,
        rerender: (next) => {
            currentProps = { ...currentProps, ...next };
            act(() => {
                render();
            });
        },
    };
}

// TODO: Fix React hook initialization issues
describe.skip('usePlaybackScheduler - DISABLED', () => {
    let originalActEnv: boolean | undefined;
    let latestSnapshot: SchedulerSnapshot = null;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-04-29T00:00:00.000Z'));
        originalActEnv = (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
        (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        latestSnapshot = null;
    });

    afterEach(() => {
        vi.useRealTimers();
        (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = originalActEnv;
        document.body.innerHTML = '';
    });

    it('updates remaining time while running', async () => {
        const { root } = renderHarness({
            desiredIntervalSec: 10,
            isRunning: true,
            onSnapshot: (snapshot) => {
                latestSnapshot = snapshot;
            },
        });

        await act(async () => {
            await Promise.resolve();
        });

        expect(latestSnapshot?.effectiveIntervalSec).toBe(10);
        const initialRemaining = latestSnapshot?.remainingMs ?? 0;

        act(() => {
            vi.advanceTimersByTime(250);
        });

        expect(latestSnapshot?.remainingMs ?? 0).toBeLessThan(initialRemaining);

        act(() => {
            root.unmount();
        });
    });

    it('applies pending interval changes on cycle complete', async () => {
        const { root, rerender } = renderHarness({
            desiredIntervalSec: 10,
            isRunning: true,
            onSnapshot: (snapshot) => {
                latestSnapshot = snapshot;
            },
        });

        await act(async () => {
            await Promise.resolve();
        });

        rerender({ desiredIntervalSec: 18 });

        expect(latestSnapshot?.effectiveIntervalSec).toBe(10);

        act(() => {
            latestSnapshot?.markCycleComplete();
        });

        expect(latestSnapshot?.effectiveIntervalSec).toBe(18);

        act(() => {
            root.unmount();
        });
    });
});