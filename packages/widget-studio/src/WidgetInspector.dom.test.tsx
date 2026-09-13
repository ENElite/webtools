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
    it('hides canvas geometry while keeping layout strategy controls', async () => {
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

        for (const label of ['X', 'Y', '宽度', '高度', '旋转']) {
            const input = host.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
            expect(input, `${label} input`).toBeNull();
        }
        expect(host.textContent).toContain('水平锚点');
        expect(host.textContent).toContain('垂直锚点');
        expect(host.textContent).toContain('适配方式');
        expect(engine.getSnapshot().document.widgets[0]?.layout).toMatchObject({
            x: 11,
            y: -7,
            w: 36,
            h: 24,
            rotation: 15,
        });
    });
});
