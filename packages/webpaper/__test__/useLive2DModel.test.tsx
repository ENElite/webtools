import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Application } from 'pixi.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const live2dMocks = vi.hoisted(() => ({
    loadLive2dRuntimeModules: vi.fn(),
    loadLive2dSettingsJsonCached: vi.fn(),
}));

vi.mock('@/lib/live2d', () => live2dMocks);

import { useLive2DModel } from '@/features/overlay/live2d/useLive2DModel';

type Deferred<T> = {
    promise: Promise<T>;
    resolve: (value: T) => void;
};

function createDeferred<T>(): Deferred<T> {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((nextResolve) => {
        resolve = nextResolve;
    });

    return { promise, resolve };
}

function createMockApp(): Application {
    const children: any[] = [];
    const stage = {
        children,
        addChild: vi.fn((child: any) => {
            children.push(child);
            child.parent = stage;
            return child;
        }),
        removeChild: vi.fn((child: any) => {
            const index = children.indexOf(child);
            if (index >= 0) {
                children.splice(index, 1);
            }
            child.parent = null;
            return child;
        }),
    } as unknown as Application['stage'];

    return {
        view: document.createElement('canvas'),
        stage,
    } as unknown as Application;
}

type MockModel = {
    interactive: boolean;
    cursor: string;
    parent: unknown;
    destroy: ReturnType<typeof vi.fn>;
    motion: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
};

function createMockModel(): MockModel {
    return {
        interactive: false,
        cursor: '',
        parent: null,
        destroy: vi.fn(),
        motion: vi.fn(),
        on: vi.fn(),
    };
}

function renderHarness(props: React.ComponentProps<typeof Harness>): {
    root: Root;
    rerender: (next: Partial<React.ComponentProps<typeof Harness>>) => void;
} {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let currentProps = props;
    const render = () => {
        root.render(<Harness {...currentProps} />);
    };

    act(() => {
        render();
    });

    return {
        root,
        rerender: (next) => {
            currentProps = { ...currentProps, ...next };
            act(() => {
                render();
            });
        },
    };
}

function Harness({
    app,
    modelPath,
}: {
    app: Application | null;
    modelPath: string;
}) {
    useLive2DModel({
        app,
        modelPath,
        enableInteraction: false,
        enablePointerTracking: false,
        autoAnimation: false,
    });

    return null;
}

async function flushMicrotasks(times = 3): Promise<void> {
    await act(async () => {
        for (let index = 0; index < times; index += 1) {
            await Promise.resolve();
        }
    });
}

describe('useLive2DModel', () => {
    let app: Application;
    let pendingModels: Array<{ modelPath: string; deferred: Deferred<MockModel> }>;
    let fromMock: ReturnType<typeof vi.fn>;
    let originalActEnv: boolean | undefined;

    beforeEach(() => {
        originalActEnv = (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
        (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        app = createMockApp();
        pendingModels = [];

        const Ticker = class Ticker { };
        fromMock = vi.fn((settingsJson: Record<string, unknown>) => {
            const deferred = createDeferred<MockModel>();
            pendingModels.push({
                modelPath: String(settingsJson.url ?? ''),
                deferred,
            });
            return deferred.promise;
        });

        live2dMocks.loadLive2dRuntimeModules.mockResolvedValue({
            pixi: { Ticker } as never,
            cubism: {
                Live2DModel: {
                    registerTicker: vi.fn(),
                    from: fromMock,
                },
            } as never,
        });

        live2dMocks.loadLive2dSettingsJsonCached.mockImplementation(async (modelPath: string) => ({
            url: modelPath,
        }));
    });

    afterEach(() => {
        vi.clearAllMocks();
        (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = originalActEnv;
        document.body.innerHTML = '';
    });

    it('removes the previous model when modelPath changes', async () => {
        const { root, rerender } = renderHarness({
            app,
            modelPath: '/live2d/model-a.model3.json',
        });

        await flushMicrotasks();
        expect(fromMock).toHaveBeenCalledTimes(1);
        expect(pendingModels).toHaveLength(1);
        expect(pendingModels[0]?.modelPath).toBe('/live2d/model-a.model3.json');

        const modelA = createMockModel();
        pendingModels[0]?.deferred.resolve(modelA);
        await flushMicrotasks();

        expect(app.stage.addChild).toHaveBeenCalledTimes(1);
        expect(app.stage.children).toContain(modelA);

        rerender({
            modelPath: '/live2d/model-b.model3.json',
        });

        expect(app.stage.removeChild).toHaveBeenCalledTimes(1);
        expect(app.stage.removeChild).toHaveBeenCalledWith(modelA);
        expect(modelA.destroy).toHaveBeenCalledTimes(1);
        expect(app.stage.children).toHaveLength(0);

        await flushMicrotasks();
        expect(fromMock).toHaveBeenCalledTimes(2);
        expect(pendingModels).toHaveLength(2);
        expect(pendingModels[1]?.modelPath).toBe('/live2d/model-b.model3.json');

        const modelB = createMockModel();
        pendingModels[1]?.deferred.resolve(modelB);
        await flushMicrotasks();

        expect(app.stage.addChild).toHaveBeenCalledTimes(2);
        expect(app.stage.children).toContain(modelB);
        expect(modelB.destroy).not.toHaveBeenCalled();

        act(() => {
            root.unmount();
        });
    });
});