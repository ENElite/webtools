import { StrictMode } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createWidgetCatalog, createWidgetEngine } from '@webtools/widget-core';
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
    if (mountedRoot) {
        act(() => mountedRoot?.unmount());
        mountedRoot = null;
    }
    mountedHost?.remove();
    mountedHost = null;
});

describe('WidgetCanvas', () => {
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
