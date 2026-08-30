import { StrictMode } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createWidgetCatalog, createWidgetEngine } from '@webtools/widget-core';
import Moveable from 'react-moveable';
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

afterEach(() => {
    if (!mountedRoot) return;
    act(() => mountedRoot?.unmount());
    mountedRoot = null;
});

describe('WidgetCanvas', () => {
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
