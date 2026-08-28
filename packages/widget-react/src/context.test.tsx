import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { createWidgetCatalog, createWidgetEngine } from '@webtools/widget-core';
import { z } from 'zod';

import { createWidgetViewCatalog, defineWidgetView } from './catalog';
import { useWidgetRuntime, WidgetRuntimeProvider } from './context';
import type { WidgetRuntimeContextValue } from './context';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const coreCatalog = createWidgetCatalog([{
    kind: 'label',
    label: 'Label',
    propsSchema: z.object({ text: z.string() }),
    defaultProps: { text: 'default' },
}]);
const views = createWidgetViewCatalog([defineWidgetView({
    kind: 'label',
    View: ({ widget }) => <span>{String(widget.props['text'])}</span>,
})]);

function createEngine(prefix: string) {
    let sequence = 0;
    const engine = createWidgetEngine({
        catalog: coreCatalog,
        clock: () => sequence,
        idGenerator: (scope) => `${prefix}-${scope}-${sequence++}`,
    });
    engine.dispatch({ type: 'widget.add', widget: { kind: 'label' } });
    return engine;
}

function Probe({ capture, name }: {
    readonly capture: (runtime: WidgetRuntimeContextValue) => void;
    readonly name: string;
}) {
    const runtime = useWidgetRuntime();
    capture(runtime);
    return <output data-probe={name}>{runtime.selectedWidgetId ?? 'none'}</output>;
}

let mountedRoot: ReturnType<typeof createRoot> | null = null;

afterEach(() => {
    if (mountedRoot) {
        act(() => mountedRoot?.unmount());
        mountedRoot = null;
    }
});

describe('WidgetRuntimeProvider', () => {
    it('isolates selection/settings and reconciles a removed widget', () => {
        const firstEngine = createEngine('first');
        const secondEngine = createEngine('second');
        const firstId = firstEngine.getSnapshot().document.widgets[0]?.id;
        const secondId = secondEngine.getSnapshot().document.widgets[0]?.id;
        expect(firstId).toBeDefined();
        expect(secondId).toBeDefined();
        if (!firstId || !secondId) return;

        const firstRuntime: { current: WidgetRuntimeContextValue | null } = { current: null };
        const secondRuntime: { current: WidgetRuntimeContextValue | null } = { current: null };
        const host = document.createElement('div');
        mountedRoot = createRoot(host);
        act(() => {
            mountedRoot?.render(
                <>
                    <WidgetRuntimeProvider engine={firstEngine} views={views}>
                        <Probe name='first' capture={(runtime) => { firstRuntime.current = runtime; }} />
                    </WidgetRuntimeProvider>
                    <WidgetRuntimeProvider engine={secondEngine} views={views}>
                        <Probe name='second' capture={(runtime) => { secondRuntime.current = runtime; }} />
                    </WidgetRuntimeProvider>
                </>,
            );
        });

        expect(firstRuntime.current).not.toBeNull();
        expect(secondRuntime.current).not.toBeNull();
        act(() => firstRuntime.current?.requestSettings(firstId));
        expect(host.querySelector('[data-probe="first"]')?.textContent).toBe(firstId);
        expect(host.querySelector('[data-probe="second"]')?.textContent).toBe('none');
        expect(firstRuntime.current?.settingsWidgetId).toBe(firstId);
        expect(secondRuntime.current?.settingsWidgetId).toBeNull();

        act(() => {
            firstEngine.dispatch({ type: 'widget.remove', widgetId: firstId });
        });
        expect(host.querySelector('[data-probe="first"]')?.textContent).toBe('none');
        expect(firstRuntime.current?.settingsWidgetId).toBeNull();
        expect(secondEngine.getSnapshot().document.widgets[0]?.id).toBe(secondId);
    });
});
