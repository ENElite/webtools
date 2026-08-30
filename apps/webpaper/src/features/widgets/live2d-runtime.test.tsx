// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => ({
    init: vi.fn(),
}));

vi.mock('l2d/dist/index.js', () => ({ init: runtime.init }));

import { Live2dWidgetRuntime } from './live2d-runtime';

type Listener = (...args: never[]) => void;

function createInstance(load: (listeners: Map<string, Listener>) => Promise<void>) {
    const listeners = new Map<string, Listener>();
    return {
        destroy: vi.fn(),
        load: vi.fn(() => load(listeners)),
        on: vi.fn((event: string, listener: Listener) => {
            listeners.set(event, listener);
        }),
        resize: vi.fn(),
        setScale: vi.fn(),
    };
}

async function flush() {
    await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
    });
}

describe('Live2dWidgetRuntime', () => {
    let container: HTMLDivElement;
    let root: Root;
    let originalResizeObserver: typeof ResizeObserver | undefined;
    let originalRequestAnimationFrame: typeof requestAnimationFrame | undefined;
    let originalCancelAnimationFrame: typeof cancelAnimationFrame | undefined;

    beforeEach(() => {
        (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        originalResizeObserver = globalThis.ResizeObserver;
        originalRequestAnimationFrame = globalThis.requestAnimationFrame;
        originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
        globalThis.ResizeObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        };
        globalThis.requestAnimationFrame = (callback) => {
            callback(0);
            return 1;
        };
        globalThis.cancelAnimationFrame = () => {};
    });

    afterEach(() => {
        act(() => root.unmount());
        runtime.init.mockReset();
        document.body.innerHTML = '';
        if (originalResizeObserver) globalThis.ResizeObserver = originalResizeObserver;
        else delete (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
        if (originalRequestAnimationFrame) globalThis.requestAnimationFrame = originalRequestAnimationFrame;
        else delete (globalThis as { requestAnimationFrame?: typeof requestAnimationFrame }).requestAnimationFrame;
        if (originalCancelAnimationFrame) globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
        else delete (globalThis as { cancelAnimationFrame?: typeof cancelAnimationFrame }).cancelAnimationFrame;
    });

    it('loads a model, reports progress and destroys the runtime on unmount', async () => {
        const instance = createInstance(async (listeners) => {
            listeners.get('loadstart')?.(2 as never);
            listeners.get('loadprogress')?.(1 as never, 2 as never, 'texture.png' as never);
            listeners.get('loaded')?.();
        });
        runtime.init.mockReturnValue(instance);

        act(() => {
            root.render(
                <Live2dWidgetRuntime
                    modelPath='https://example.com/model.model3.json'
                    scale={1.25}
                    renderPrecision={150}
                    resizeDelay={0}
                    interaction={false}
                />,
            );
        });
        await flush();

        expect(instance.load).toHaveBeenCalledWith({
            path: 'https://example.com/model.model3.json',
            scale: 1.25,
            logLevel: 'warn',
        });
        expect(container.querySelector('[data-live2d-state="loaded"]')).not.toBeNull();
        expect(container.querySelector('canvas')?.style.pointerEvents).toBe('none');

        act(() => root.unmount());
        expect(instance.destroy).toHaveBeenCalledOnce();
        root = createRoot(container);
    });

    it('turns runtime failures into a visible error instead of a silent canvas', async () => {
        const instance = createInstance(async () => {
            throw new Error('network unavailable');
        });
        runtime.init.mockReturnValue(instance);

        act(() => {
            root.render(
                <Live2dWidgetRuntime
                    modelPath='https://example.com/broken.model3.json'
                    scale={1}
                    renderPrecision={100}
                    resizeDelay={0}
                    interaction
                />,
            );
        });
        await flush();

        expect(container.querySelector('[role="alert"]')?.textContent).toContain('network unavailable');
        expect(instance.destroy).toHaveBeenCalledOnce();
    });
});
