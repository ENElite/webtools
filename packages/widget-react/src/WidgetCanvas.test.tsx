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
});

function RuntimeProbe({ capture }: {
    readonly capture: (runtime: WidgetRuntimeContextValue) => void;
}) {
    capture(useWidgetRuntime());
    return null;
}
