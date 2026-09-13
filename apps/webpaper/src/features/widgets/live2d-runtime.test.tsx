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
        getMotions: vi.fn(() => ({ TapBody: ['tap-0.motion3.json', 'tap-1.motion3.json'] })),
        playMotion: vi.fn(),
    };
}

function createLifecycleCallbacks() {
    return {
        onError: vi.fn(),
        onProgress: vi.fn(),
        onReady: vi.fn(),
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
        const lifecycle = createLifecycleCallbacks();
        const instance = createInstance(async (listeners) => {
            listeners.get('loadstart')?.(2 as never);
            listeners.get('loadprogress')?.(1 as never, 2 as never, 'texture.png' as never);
            listeners.get('loaded')?.();
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
                    clickMotion
                    motionGroup='TapBody'
                    motionIndex={1}
                    motionPriority={3}
                    {...lifecycle}
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
        expect(lifecycle.onProgress).toHaveBeenCalledWith(0, 2);
        expect(lifecycle.onProgress).toHaveBeenCalledWith(1, 2);
        expect(lifecycle.onProgress).toHaveBeenLastCalledWith(2, 2);
        expect(lifecycle.onReady).toHaveBeenCalledOnce();
        expect(lifecycle.onError).not.toHaveBeenCalled();

        act(() => root.unmount());
        expect(instance.destroy).toHaveBeenCalledOnce();
        root = createRoot(container);
    });

    it('turns runtime failures into a visible error instead of a silent canvas', async () => {
        const lifecycle = createLifecycleCallbacks();
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
                    clickMotion
                    motionGroup=''
                    motionIndex={-1}
                    motionPriority={2}
                    {...lifecycle}
                />,
            );
        });
        await flush();

        expect(container.querySelector('[role="alert"]')?.textContent).toContain('network unavailable');
        expect(instance.destroy).toHaveBeenCalledOnce();
        expect(lifecycle.onReady).not.toHaveBeenCalled();
        expect(lifecycle.onError).toHaveBeenCalledOnce();
        expect(lifecycle.onError.mock.calls[0]?.[0]).toEqual(new Error('network unavailable'));
    });

    it('plays the configured model motion when the loaded canvas is clicked', async () => {
        const lifecycle = createLifecycleCallbacks();
        const instance = createInstance(async (listeners) => {
            listeners.get('loaded')?.();
        });
        runtime.init.mockReturnValue(instance);

        act(() => {
            root.render(
                <Live2dWidgetRuntime
                    modelPath='https://example.com/model.model3.json'
                    scale={1}
                    renderPrecision={100}
                    resizeDelay={0}
                    interaction
                    clickMotion
                    motionGroup='TapBody'
                    motionIndex={1}
                    motionPriority={3}
                    {...lifecycle}
                />,
            );
        });
        await flush();

        act(() => container.querySelector('canvas')?.click());

        expect(instance.getMotions).toHaveBeenCalledOnce();
        expect(instance.playMotion).toHaveBeenCalledWith('TapBody', 1, 3);
        expect(container.querySelector('[data-live2d-motion-notice]')?.textContent).toContain('TapBody #1');
    });
});
