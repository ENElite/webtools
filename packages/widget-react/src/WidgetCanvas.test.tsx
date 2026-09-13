import { StrictMode, useLayoutEffect } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import {
    createSignalHub,
    createWidgetCatalog,
    createWidgetEngine,
    widgetComponentId,
} from '@webtools/widget-core';
import type { ComponentLoadSource, ComponentRuntimeSignalMap } from '@webtools/widget-core';
import Moveable from 'react-moveable';
import type { OnDrag, OnDragEnd, OnDragStart } from 'react-moveable';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createWidgetViewCatalog, defineWidgetView } from './catalog';
import { useWidgetRuntime, WidgetRuntimeProvider } from './context';
import type { WidgetRuntimeContextValue } from './context';
import { WidgetCanvas } from './WidgetCanvas';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const definitions = createWidgetCatalog([{
    kind: 'clock',
    label: 'Clock',
    propsSchema: z.object({}),
    defaultProps: {},
}]);
const views = createWidgetViewCatalog([defineWidgetView({
    kind: 'clock',
    View: () => <time>12:00</time>,
})]);

let mountedRoot: ReturnType<typeof createRoot> | null = null;
let mountedHost: HTMLElement | null = null;

function createRect(left: number, top: number, width: number, height: number): DOMRect {
    return {
        x: left,
        y: top,
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        toJSON: () => ({}),
    };
}

function installCanvasGeometry(width = 1_000, height = 800): void {
    const original = HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
        if (this.classList.contains('wt-widget-canvas')) return createRect(0, 0, width, height);
        if (!this.classList.contains('wt-widget-frame')) return original.call(this);

        const toPixels = (value: string, total: number) => value.endsWith('%')
            ? (Number.parseFloat(value) / 100) * total
            : Number.parseFloat(value) || 0;
        const translate = this.style.transform.match(
            /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/,
        );
        const translateX = translate ? Number.parseFloat(translate[1] ?? '0') : 0;
        const translateY = translate ? Number.parseFloat(translate[2] ?? '0') : 0;

        return createRect(
            toPixels(this.style.left, width) + translateX,
            toPixels(this.style.top, height) + translateY,
            toPixels(this.style.width, width),
            toPixels(this.style.height, height),
        );
    });
}

afterEach(() => {
    vi.useRealTimers();
    if (mountedRoot) {
        act(() => mountedRoot?.unmount());
        mountedRoot = null;
    }
    mountedHost?.remove();
    mountedHost = null;
});

describe('WidgetCanvas', () => {
    it('publishes scoped load attempts for synchronous and later-added widgets', () => {
        const engine = createWidgetEngine({ catalog: definitions });
        engine.dispatch({ type: 'widget.add', widget: { id: 'clock-1', kind: 'clock' } });
        const signals = createSignalHub<ComponentRuntimeSignalMap>();
        const starts: ComponentLoadSource[] = [];
        const completes: ComponentLoadSource[] = [];
        signals.connect('component.load.start', ({ source }) => starts.push(source));
        signals.connect('component.load.complete', ({ source }) => completes.push(source));
        const host = document.createElement('div');
        mountedRoot = createRoot(host);

        act(() => {
            mountedRoot?.render(
                <StrictMode>
                    <WidgetRuntimeProvider engine={engine} views={views} signals={signals}>
                        <WidgetCanvas />
                    </WidgetRuntimeProvider>
                </StrictMode>,
            );
        });

        expect(host.querySelectorAll('.wt-widget-frame')).toHaveLength(1);
        expect(starts.at(-1)).toMatchObject({
            componentId: widgetComponentId('clock-1'),
            resourceKey: '@widget/sync:clock',
        });
        expect(completes.at(-1)?.attemptId).toBe(starts.at(-1)?.attemptId);

        act(() => engine.dispatch({
            type: 'widget.add',
            widget: { id: 'clock-2', kind: 'clock' },
        }));
        expect(starts.some(({ componentId }) => componentId === widgetComponentId('clock-2'))).toBe(true);
        expect(completes.some(({ componentId }) => componentId === widgetComponentId('clock-2'))).toBe(true);
    });

    it('buffers cached readiness and progress before the passive load attempt starts', () => {
        const resourceDefinitions = createWidgetCatalog([{
            kind: 'resource',
            label: 'Resource',
            propsSchema: z.object({ src: z.string() }),
            defaultProps: { src: 'cached.png' },
        }]);
        let receivedSignals: ReturnType<typeof createSignalHub<ComponentRuntimeSignalMap>> | null = null;
        const resourceViews = createWidgetViewCatalog([defineWidgetView<{ src: string }>({
            kind: 'resource',
            readinessKey: (widget) => widget.props.src,
            View: ({ widget, signals: viewSignals, onProgress, onReady }) => {
                receivedSignals = viewSignals;
                useLayoutEffect(() => {
                    onProgress(1, 1);
                    onReady();
                }, [onProgress, onReady]);
                return <span>{widget.props.src}</span>;
            },
        })]);
        const engine = createWidgetEngine({ catalog: resourceDefinitions });
        engine.dispatch({ type: 'widget.add', widget: { id: 'resource-1', kind: 'resource' } });
        const signals = createSignalHub<ComponentRuntimeSignalMap>();
        const sequence: string[] = [];
        signals.connect('component.load.start', ({ source }) => sequence.push(`start:${source.resourceKey}`));
        signals.connect('component.load.progress', ({ loaded, total }) => sequence.push(`progress:${loaded}/${total}`));
        signals.connect('component.load.complete', ({ source }) => sequence.push(`complete:${source.resourceKey}`));
        const host = document.createElement('div');
        mountedRoot = createRoot(host);

        act(() => {
            mountedRoot?.render(
                <StrictMode>
                    <WidgetRuntimeProvider engine={engine} views={resourceViews} signals={signals}>
                        <WidgetCanvas />
                    </WidgetRuntimeProvider>
                </StrictMode>,
            );
        });

        expect(sequence.filter((event) => event === 'start:cached.png').length).toBeGreaterThanOrEqual(2);
        expect(sequence.at(-2)).toBe('progress:1/1');
        expect(sequence.at(-1)).toBe('complete:cached.png');
        expect(receivedSignals).toBe(signals);
    });

    it('ignores old resource callbacks, including when a resource key returns later', () => {
        const resourceDefinitions = createWidgetCatalog([{
            kind: 'resource',
            label: 'Resource',
            propsSchema: z.object({ src: z.string() }),
            defaultProps: { src: 'first.png' },
        }]);
        const reports: Array<{
            readonly src: string;
            readonly ready: () => void;
            readonly error: (error?: unknown) => void;
        }> = [];
        const resourceViews = createWidgetViewCatalog([defineWidgetView<{ src: string }>({
            kind: 'resource',
            readinessKey: (widget) => widget.props.src,
            View: ({ widget, onReady, onError }) => {
                reports.push({ src: widget.props.src, ready: onReady, error: onError });
                return <span data-resource={widget.props.src}>{widget.props.src}</span>;
            },
        })]);
        const engine = createWidgetEngine({ catalog: resourceDefinitions });
        engine.dispatch({ type: 'widget.add', widget: { id: 'resource-1', kind: 'resource' } });
        const signals = createSignalHub<ComponentRuntimeSignalMap>();
        const completions: ComponentLoadSource[] = [];
        const errors: ComponentLoadSource[] = [];
        signals.connect('component.load.complete', ({ source }) => completions.push(source));
        signals.connect('component.load.error', ({ source }) => errors.push(source));
        const host = document.createElement('div');
        mountedRoot = createRoot(host);
        act(() => mountedRoot?.render(
            <WidgetRuntimeProvider engine={engine} views={resourceViews} signals={signals}>
                <WidgetCanvas />
            </WidgetRuntimeProvider>,
        ));
        const staleFirst = reports.at(-1)?.ready;

        act(() => engine.dispatch({
            type: 'widget.update',
            widgetId: 'resource-1',
            changes: { props: { src: 'second.png' } },
        }));
        const second = reports.at(-1);
        act(() => staleFirst?.());
        expect(completions).toHaveLength(0);

        act(() => engine.dispatch({
            type: 'widget.update',
            widgetId: 'resource-1',
            changes: { props: { src: 'first.png' } },
        }));
        const currentFirst = reports.at(-1)?.ready;
        act(() => staleFirst?.());
        expect(completions).toHaveLength(0);

        act(() => currentFirst?.());
        expect(completions).toHaveLength(1);
        expect(completions[0]?.resourceKey).toBe('first.png');
        act(() => second?.error(new Error('stale second')));
        expect(errors).toHaveLength(0);
    });

    it('suppresses StrictMode cleanup errors but reports a real pending unmount', async () => {
        const resourceDefinitions = createWidgetCatalog([{
            kind: 'resource',
            label: 'Resource',
            propsSchema: z.object({ src: z.string() }),
            defaultProps: { src: 'silent.html' },
        }]);
        const resourceViews = createWidgetViewCatalog([defineWidgetView<{ src: string }>({
            kind: 'resource',
            readinessKey: (widget) => widget.props.src,
            View: () => <iframe title='silent resource' />,
        })]);
        const engine = createWidgetEngine({ catalog: resourceDefinitions });
        engine.dispatch({ type: 'widget.add', widget: { id: 'resource-1', kind: 'resource' } });
        const signals = createSignalHub<ComponentRuntimeSignalMap>();
        const starts: ComponentLoadSource[] = [];
        const errors: ComponentLoadSource[] = [];
        signals.connect('component.load.start', ({ source }) => starts.push(source));
        signals.connect('component.load.error', ({ source }) => errors.push(source));
        const host = document.createElement('div');
        mountedRoot = createRoot(host);

        await act(async () => {
            mountedRoot?.render(
                <StrictMode>
                    <WidgetRuntimeProvider engine={engine} views={resourceViews} signals={signals}>
                        <WidgetCanvas />
                    </WidgetRuntimeProvider>
                </StrictMode>,
            );
            await Promise.resolve();
        });
        expect(starts.length).toBeGreaterThanOrEqual(2);
        expect(errors).toHaveLength(0);

        await act(async () => {
            engine.dispatch({ type: 'widget.remove', widgetId: 'resource-1' });
            await Promise.resolve();
        });
        expect(errors).toHaveLength(1);
        expect(errors[0]?.attemptId).toBe(starts.at(-1)?.attemptId);
    });

    it('plays the persisted entry animation when a widget frame first mounts', () => {
        const engine = createWidgetEngine({ catalog: definitions });
        engine.dispatch({
            type: 'widget.add',
            widget: {
                kind: 'clock',
                animation: {
                    entry: {
                        effect: 'scale',
                        direction: 'up',
                        duration: 0.55,
                        delay: 0.1,
                        easing: 'ease-in-out',
                    },
                },
            },
        });
        const host = document.createElement('div');
        mountedRoot = createRoot(host);
        act(() => {
            mountedRoot?.render(
                <WidgetRuntimeProvider engine={engine} views={views}>
                    <WidgetCanvas />
                </WidgetRuntimeProvider>,
            );
        });

        const frame = host.querySelector<HTMLElement>('.wt-widget-frame');
        expect(frame?.style.animationName).toBe('wt-widget-entry-scale');
        expect(frame?.style.animationDuration).toBe('0.55s');
        expect(frame?.style.animationDelay).toBe('0.1s');
        expect(frame?.style.animationTimingFunction).toBe('ease-in-out');
        expect(frame?.style.transform).toBe('rotate(0deg)');
    });

    it('applies selected style transitions to the widget frame', () => {
        const engine = createWidgetEngine({ catalog: definitions });
        engine.dispatch({
            type: 'widget.add',
            widget: {
                kind: 'clock',
                animation: {
                    easing: 'ease-in',
                    duration: 0.8,
                    delay: 0.2,
                    animatedProperties: ['opacity', 'borderRadius'],
                },
            },
        });
        const host = document.createElement('div');
        mountedRoot = createRoot(host);
        act(() => {
            mountedRoot?.render(
                <WidgetRuntimeProvider engine={engine} views={views}>
                    <WidgetCanvas />
                </WidgetRuntimeProvider>,
            );
        });

        expect(host.querySelector<HTMLElement>('.wt-widget-frame')?.style.transition).toBe([
            'visibility 0s linear 180ms',
            'opacity 0.8s ease-in 0.2s',
            'border-radius 0.8s ease-in 0.2s',
        ].join(', '));
    });

    it('keeps one Moveable control box after a selected widget layout changes', () => {
        const updateRect = vi.spyOn(Moveable.prototype, 'updateRect');
        const engine = createWidgetEngine({ catalog: definitions });
        engine.dispatch({ type: 'widget.add', widget: { kind: 'clock' } });
        const widget = engine.getSnapshot().document.widgets[0];
        expect(widget).toBeDefined();
        if (!widget) return;

        const runtimeRef: { current: WidgetRuntimeContextValue | null } = { current: null };
        const host = document.createElement('div');
        mountedRoot = createRoot(host);
        act(() => {
            mountedRoot?.render(
                <StrictMode>
                    <WidgetRuntimeProvider engine={engine} views={views}>
                        <WidgetCanvas />
                        <RuntimeProbe capture={(runtime) => { runtimeRef.current = runtime; }} />
                    </WidgetRuntimeProvider>
                </StrictMode>,
            );
        });

        act(() => runtimeRef.current?.selectWidget(widget.id));
        expect(host.querySelectorAll('.moveable-control-box')).toHaveLength(1);
        updateRect.mockClear();

        act(() => engine.dispatch({
            type: 'widget.layout',
            widgetId: widget.id,
            changes: { x: 25, y: 30 },
        }));
        expect(host.querySelectorAll('.moveable-control-box')).toHaveLength(1);
        expect(updateRect).toHaveBeenCalled();
    });

    it('resyncs the Moveable control box when the viewport changes', () => {
        const updateRect = vi.spyOn(Moveable.prototype, 'updateRect');
        const engine = createWidgetEngine({ catalog: definitions });
        engine.dispatch({ type: 'widget.add', widget: { kind: 'clock' } });
        const widget = engine.getSnapshot().document.widgets[0];
        expect(widget).toBeDefined();
        if (!widget) return;

        const runtimeRef: { current: WidgetRuntimeContextValue | null } = { current: null };
        const host = document.createElement('div');
        mountedRoot = createRoot(host);
        act(() => {
            mountedRoot?.render(
                <WidgetRuntimeProvider engine={engine} views={views}>
                    <WidgetCanvas />
                    <RuntimeProbe capture={(runtime) => { runtimeRef.current = runtime; }} />
                </WidgetRuntimeProvider>,
            );
        });
        act(() => runtimeRef.current?.selectWidget(widget.id));
        updateRect.mockClear();

        act(() => window.dispatchEvent(new Event('resize')));

        expect(updateRect).toHaveBeenCalled();
    });

    it('measures the moved frame in the same drag frame and keeps that position on drag end', () => {
        installCanvasGeometry();
        const engine = createWidgetEngine({ catalog: definitions });
        engine.dispatch({ type: 'widget.add', widget: { kind: 'clock' } });
        const widget = engine.getSnapshot().document.widgets[0];
        expect(widget).toBeDefined();
        if (!widget) return;

        const runtimeRef: { current: WidgetRuntimeContextValue | null } = { current: null };
        const host = document.createElement('div');
        let frame: HTMLElement | null = null;
        const capturedMoveable: { current: Moveable | null } = { current: null };
        const measuredPositions: Array<{ left: number; top: number; type: '' | 'End' }> = [];
        const originalUpdateRect = Moveable.prototype.updateRect;
        vi.spyOn(Moveable.prototype, 'updateRect').mockImplementation(function (this: Moveable,
            type?: 'Start' | '' | 'End',
            isTarget?: boolean,
            isSetState?: boolean,
        ) {
            capturedMoveable.current = this;
            return originalUpdateRect.call(this, type, isTarget, isSetState);
        });
        document.body.append(host);
        mountedHost = host;
        mountedRoot = createRoot(host);
        act(() => {
            mountedRoot?.render(
                <WidgetRuntimeProvider engine={engine} views={views}>
                    <WidgetCanvas />
                    <RuntimeProbe capture={(runtime) => { runtimeRef.current = runtime; }} />
                </WidgetRuntimeProvider>,
            );
        });
        act(() => runtimeRef.current?.selectWidget(widget.id));

        frame = host.querySelector<HTMLElement>('.wt-widget-frame');
        const controlBox = host.querySelector<HTMLElement>('.moveable-control-box');
        expect(frame).not.toBeNull();
        expect(controlBox).not.toBeNull();
        expect(capturedMoveable.current).not.toBeNull();
        if (!frame || !controlBox || !capturedMoveable.current) return;
        const moveableInstance = capturedMoveable.current;
        const moveableManager = moveableInstance.getManager();
        expect(moveableManager.props.target).toBe(frame);
        expect(moveableManager.props['draggable']).toBe(true);
        const sync = moveableManager.props.flushSync;
        expect(sync).toBeTypeOf('function');
        if (!sync) return;
        const syncControlRect = (type: '' | 'End') => sync(() => {
            const rect = frame?.getBoundingClientRect();
            if (rect) measuredPositions.push({ left: rect.left, top: rect.top, type });
            // jsdom cannot calculate Moveable's CSS matrix, but this is the real
            // control-box measurement/update path used in the browser.
            moveableManager.updateRect(type, true, false);
            moveableManager.forceUpdate();
        });

        const initialRect = frame.getBoundingClientRect();
        measuredPositions.length = 0;
        act(() => {
            moveableManager.props['onDragStart']?.({
                target: frame,
                set: vi.fn(),
            } as unknown as OnDragStart);
            moveableManager.props['onDrag']?.({
                target: frame,
                beforeTranslate: [100, 50],
            } as unknown as OnDrag);
            // This is the callback order used by Moveable after invoking onDrag.
            syncControlRect('');
        });

        const previewRect = frame.getBoundingClientRect();
        expect(previewRect.left).toBeCloseTo(initialRect.left + 100);
        expect(previewRect.top).toBeCloseTo(initialRect.top + 50);
        expect(measuredPositions.at(-1)).toMatchObject({
            left: previewRect.left,
            top: previewRect.top,
            type: '',
        });
        expect(engine.getSnapshot().document.widgets[0]?.layout.x).toBe(widget.layout.x);

        act(() => {
            moveableManager.props['onDragEnd']?.({ target: frame } as unknown as OnDragEnd);
            // Moveable measures once more after the consumer's end callback.
            syncControlRect('End');
        });

        const persisted = engine.getSnapshot().document.widgets[0];
        const finalRect = frame.getBoundingClientRect();
        expect(persisted?.layout.x).not.toBe(widget.layout.x);
        expect(finalRect.left).toBeCloseTo(previewRect.left);
        expect(finalRect.top).toBeCloseTo(previewRect.top);
        expect(measuredPositions.at(-1)).toMatchObject({
            left: previewRect.left,
            top: previewRect.top,
            type: 'End',
        });
        expect(frame.style.transform).toBe('rotate(0deg)');
    });

    it('restores custom able actions and opens settings from right click', () => {
        const engine = createWidgetEngine({ catalog: definitions });
        engine.dispatch({ type: 'widget.add', widget: { kind: 'clock', label: 'First' } });
        engine.dispatch({ type: 'widget.add', widget: { kind: 'clock', label: 'Second' } });
        const [first, second] = engine.getSnapshot().document.widgets;
        expect(first).toBeDefined();
        expect(second).toBeDefined();
        if (!first || !second) return;

        const runtimeRef: { current: WidgetRuntimeContextValue | null } = { current: null };
        const host = document.createElement('div');
        mountedRoot = createRoot(host);
        act(() => {
            mountedRoot?.render(
                <WidgetRuntimeProvider engine={engine} views={views}>
                    <WidgetCanvas />
                    <RuntimeProbe capture={(runtime) => { runtimeRef.current = runtime; }} />
                </WidgetRuntimeProvider>,
            );
        });
        act(() => runtimeRef.current?.selectWidget(first.id));

        expect(host.querySelector('.wt-widget-able--dimension')).not.toBeNull();
        expect(host.querySelector('.wt-widget-able--order')?.textContent).toContain('第 1 层');
        const moveUp = host.querySelector<HTMLButtonElement>('[data-action="move-up"]');
        expect(moveUp).not.toBeNull();
        if (!moveUp) return;
        const blur = vi.spyOn(moveUp, 'blur');
        act(() => moveUp.click());
        expect(blur).toHaveBeenCalledOnce();
        expect(engine.getSnapshot().document.widgets.find((widget) => widget.id === first.id)?.layout.order).toBe(2);

        const secondFrame = host.querySelector<HTMLElement>(`[data-widget-id="${second.id}"]`);
        act(() => secondFrame?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })));
        expect(runtimeRef.current?.settingsWidgetId).toBe(second.id);
    });
});

function RuntimeProbe({ capture }: {
    readonly capture: (runtime: WidgetRuntimeContextValue) => void;
}) {
    capture(useWidgetRuntime());
    return null;
}
