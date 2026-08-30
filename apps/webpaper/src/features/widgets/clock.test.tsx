// @vitest-environment jsdom

import {
    componentId,
    createSignalHub,
    type ComponentRuntimeSignalMap,
    type WidgetEntity,
} from '@webtools/widget-core';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ClockWidgetView, formatClock, type ClockWidgetProps } from './clock';

const CLOCK_PROPS = {
    locale: 'en-GB',
    timeZone: 'UTC',
    hour12: false,
    showSeconds: true,
    showDate: false,
    color: '#fff',
    fontFamily: 'sans-serif',
    timeSize: 48,
    dateSize: 18,
    align: 'center',
} satisfies ClockWidgetProps;

describe('ClockWidgetView', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-30T10:20:30.000Z'));
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    it('starts at the current time and follows the shared time tick without a private timer', () => {
        const signals = createSignalHub<ComponentRuntimeSignalMap>();
        const widget = { kind: 'clock', props: CLOCK_PROPS } as WidgetEntity<ClockWidgetProps>;
        const initial = new Date();

        act(() => {
            root.render(
                <ClockWidgetView
                    widget={widget}
                    selected={false}
                    signals={signals}
                    onReady={vi.fn()}
                    onError={vi.fn()}
                    onProgress={vi.fn()}
                />,
            );
        });

        expect(container.querySelector('time')?.textContent)
            .toContain(formatClock(initial, CLOCK_PROPS).time);

        const next = new Date('2026-08-30T21:45:12.000Z');
        act(() => signals.emit('component.time.tick', {
            source: componentId('runtime', 'clock'),
            now: next.getTime(),
        }));

        expect(container.querySelector('time')?.textContent)
            .toContain(formatClock(next, CLOCK_PROPS).time);
    });
});
