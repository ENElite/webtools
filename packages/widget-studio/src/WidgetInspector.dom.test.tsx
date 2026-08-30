/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import {
    createWidgetCatalog,
    createWidgetEngine,
    jsonObjectSchema,
} from '@webtools/widget-core';
import {
    createWidgetViewCatalog,
    defineWidgetView,
    WidgetRuntimeProvider,
} from '@webtools/widget-react';
import { afterEach, describe, expect, it } from 'vitest';

import { createDefaultInspectorControls } from './controls';
import { createWidgetInspectorCatalog } from './schema';
import { WidgetInspector } from './WidgetInspector';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const catalog = createWidgetCatalog([{
    kind: 'test-widget',
    label: 'Test widget',
    propsSchema: jsonObjectSchema,
    defaultProps: {},
}]);
const views = createWidgetViewCatalog([defineWidgetView({
    kind: 'test-widget',
    View: () => <span>Widget</span>,
})]);
const schemas = createWidgetInspectorCatalog([{
    kind: 'test-widget',
    schema: { fields: [] },
}]);
const controls = createDefaultInspectorControls();

let mountedRoot: ReturnType<typeof createRoot> | null = null;

afterEach(() => {
    if (!mountedRoot) return;
    act(() => mountedRoot?.unmount());
    mountedRoot = null;
});

describe('WidgetInspector layout page', () => {
    it('shows current geometry values and dispatches an edit after switching to layout', async () => {
        const engine = createWidgetEngine({ catalog });
        engine.dispatch({
            type: 'widget.add',
            widget: {
                kind: 'test-widget',
                layout: { x: 11, y: -7, w: 36, h: 24, rotation: 15 },
            },
        });
        const widget = engine.getSnapshot().document.widgets[0];
        expect(widget).toBeDefined();
        if (!widget) return;
        const host = document.createElement('div');
        mountedRoot = createRoot(host);
        act(() => {
            mountedRoot?.render(
                <WidgetRuntimeProvider engine={engine} views={views}>
                    <WidgetInspector
                        widgetId={widget.id}
                        schemas={schemas}
                        controls={controls}
                    />
                </WidgetRuntimeProvider>,
            );
        });

        const layoutTab = [...host.querySelectorAll<HTMLElement>('[role="tab"]')]
            .find((tab) => tab.textContent === '布局');
        expect(layoutTab).toBeDefined();
        await act(async () => {
            layoutTab?.click();
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
        expect(layoutTab?.getAttribute('aria-selected')).toBe('true');

        const expectedValues = [
            ['X', '11'],
            ['Y', '-7'],
            ['宽度', '36'],
            ['高度', '24'],
            ['旋转', '15'],
        ] as const;
        for (const [label, currentValue] of expectedValues) {
            const input = host.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
            expect(input, `${label} input`).not.toBeNull();
            expect(input?.value).toBe(currentValue);
        }

        const xInput = host.querySelector<HTMLInputElement>('input[aria-label="X"]');
        const increment = xInput?.closest('.wt-number-input')
            ?.querySelector<HTMLButtonElement>('button[aria-label="Increase value"]');
        expect(increment).not.toBeNull();
        await act(async () => {
            for (const type of ['pointerdown', 'pointerup']) {
                const event = new MouseEvent(type, {
                    bubbles: true,
                    cancelable: true,
                    button: 0,
                });
                Object.defineProperty(event, 'pointerType', { value: 'mouse' });
                increment?.dispatchEvent(event);
            }
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        expect(engine.getSnapshot().document.widgets[0]?.layout.x).toBe(11.1);
    });
});
