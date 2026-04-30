import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Widget } from '@/features/overlay/widget';
import type { WidgetModel } from '@/features/overlay/types';

const idleState = { current: false };

vi.mock('@reactuses/core', async () => {
    const actual = await vi.importActual<typeof import('@reactuses/core')>('@reactuses/core');
    return {
        ...actual,
        useIdle: () => idleState.current,
    };
});

function createWidget(autoHide: boolean): WidgetModel {
    return {
        id: 'widget-1',
        label: 'widget-1',
        kind: 'text',
        props: { text: 'hello' },
        style: {
            transform: 'translate(0px, 0px) rotate(0deg)',
            width: '100px',
            height: '60px',
            borderRadius: '0px',
        },
        autoHide,
    };
}

function renderWidget(widget: WidgetModel): { container: HTMLElement; root: Root } {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
        root.render(
            <Widget widget={widget}>
                <span>content</span>
            </Widget>
        );
    });

    return { container, root };
}

describe('Widget auto hide', () => {
    let originalActEnv: boolean | undefined;

    beforeEach(() => {
        originalActEnv = (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
        (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        idleState.current = false;
    });

    afterEach(() => {
        (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = originalActEnv;
        document.body.innerHTML = '';
    });

    it('keeps rendering when not idle', () => {
        idleState.current = false;

        const { container, root } = renderWidget(createWidget(true));

        expect(container.textContent).toContain('content');

        act(() => {
            root.unmount();
        });
    });

    it('returns null when idle and autoHide is enabled', () => {
        idleState.current = true;

        const { container, root } = renderWidget(createWidget(true));

        expect(container.textContent).toBe('');

        act(() => {
            root.unmount();
        });
    });
});