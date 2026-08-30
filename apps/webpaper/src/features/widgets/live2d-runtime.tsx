'use client';

import { Progress, Spinner } from '@webtools/ui';
import type { L2D } from 'l2d/dist/index.js';
import { useEffect, useRef, useState } from 'react';

import { live2dInstanceRegistry } from './live2d-instance-registry';
import { playConfiguredLive2dMotion } from './live2d-motion';

export type Live2dRuntimeProps = {
    readonly modelPath: string;
    readonly scale: number;
    readonly renderPrecision: number;
    readonly resizeDelay: number;
    readonly interaction: boolean;
    readonly clickMotion: boolean;
    readonly motionGroup: string;
    readonly motionIndex: number;
    readonly motionPriority: number;
};

type LoadingState = {
    readonly status: 'loading' | 'loaded' | 'error';
    readonly loaded: number;
    readonly total: number;
    readonly file?: string;
    readonly message?: string;
};

type PrecisionCanvas = {
    setPrecision(value: number): void;
    setLogicalSize(width: number, height: number): void;
    restore(): void;
};

function messageFrom(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/**
 * l2d owns canvas.width/height and resets them while resizing. Intercepting those
 * setters keeps its logical coordinate system intact while renderPrecision
 * controls the actual backing buffer. WebGL viewport calls are scaled with it.
 */
function installPrecisionCanvas(canvas: HTMLCanvasElement, initialPrecision: number): PrecisionCanvas {
    const widthDescriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width');
    const heightDescriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'height');
    const originalGetContext = canvas.getContext.bind(canvas);
    let precision = initialPrecision / 100;
    let logicalWidth = Math.max(1, canvas.width);
    let logicalHeight = Math.max(1, canvas.height);
    const patchedContexts = new WeakSet<object>();

    const applyBackingSize = () => {
        widthDescriptor?.set?.call(canvas, Math.max(1, Math.round(logicalWidth * precision)));
        heightDescriptor?.set?.call(canvas, Math.max(1, Math.round(logicalHeight * precision)));
    };

    Object.defineProperty(canvas, 'width', {
        configurable: true,
        get: () => logicalWidth,
        set: (value: number) => {
            logicalWidth = Math.max(1, Number(value) || 1);
            widthDescriptor?.set?.call(canvas, Math.max(1, Math.round(logicalWidth * precision)));
        },
    });
    Object.defineProperty(canvas, 'height', {
        configurable: true,
        get: () => logicalHeight,
        set: (value: number) => {
            logicalHeight = Math.max(1, Number(value) || 1);
            heightDescriptor?.set?.call(canvas, Math.max(1, Math.round(logicalHeight * precision)));
        },
    });

    canvas.getContext = ((contextId: string, options?: unknown) => {
        const context = originalGetContext(contextId as never, options as never) as unknown;
        if (
            context
            && (contextId === 'webgl' || contextId === 'webgl2')
            && !patchedContexts.has(context as object)
        ) {
            const gl = context as WebGLRenderingContext | WebGL2RenderingContext;
            const viewport = gl.viewport.bind(gl);
            gl.viewport = (x, y, width, height) => viewport(
                Math.round(x * precision),
                Math.round(y * precision),
                Math.round(width * precision),
                Math.round(height * precision),
            );
            patchedContexts.add(context as object);
        }
        return context;
    }) as typeof canvas.getContext;

    applyBackingSize();

    return {
        setPrecision(value) {
            precision = Math.max(0.5, Math.min(3, value / 100));
            applyBackingSize();
        },
        setLogicalSize(width, height) {
            canvas.width = width;
            canvas.height = height;
        },
        restore() {
            const physicalWidth = widthDescriptor?.get?.call(canvas) ?? 1;
            const physicalHeight = heightDescriptor?.get?.call(canvas) ?? 1;
            delete (canvas as { width?: number }).width;
            delete (canvas as { height?: number }).height;
            canvas.getContext = originalGetContext as typeof canvas.getContext;
            widthDescriptor?.set?.call(canvas, physicalWidth);
            heightDescriptor?.set?.call(canvas, physicalHeight);
        },
    };
}

export function Live2dWidgetRuntime({
    modelPath,
    scale,
    renderPrecision,
    resizeDelay,
    interaction,
    clickMotion,
    motionGroup,
    motionIndex,
    motionPriority,
}: Live2dRuntimeProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const instanceRef = useRef<L2D | null>(null);
    const precisionCanvasRef = useRef<PrecisionCanvas | null>(null);
    const motionNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scaleRef = useRef(scale);
    scaleRef.current = scale;
    const [state, setState] = useState<LoadingState>({
        status: 'loading',
        loaded: 0,
        total: 0,
    });
    const [motionNotice, setMotionNotice] = useState<string | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        // The resize effect applies the current precision independently; using
        // a neutral initial value avoids reloading the model when precision changes.
        precisionCanvasRef.current ??= installPrecisionCanvas(canvas, 100);

        if (!modelPath.trim()) {
            setState({
                status: 'error',
                loaded: 0,
                total: 0,
                message: '请先在设置中选择或填写 Live2D 模型地址。',
            });
            return;
        }

        let cancelled = false;
        let instance: L2D | null = null;
        setState({ status: 'loading', loaded: 0, total: 0 });

        // l2d@2.1.1 publishes a stale root `main`; use its real ESM entry.
        void import('l2d/dist/index.js').then(async ({ init }) => {
            if (cancelled) return;
            instance = init(canvas);
            if (!instance) throw new Error('Live2D 无法初始化 Canvas。');
            live2dInstanceRegistry.acquire(instance);
            instanceRef.current = instance;

            let loaded = false;
            instance.on('loadstart', (total) => {
                if (!cancelled) setState({ status: 'loading', loaded: 0, total });
            });
            instance.on('loadprogress', (nextLoaded, total, file) => {
                if (!cancelled) setState({
                    status: 'loading',
                    loaded: nextLoaded,
                    total,
                    file,
                });
            });
            instance.on('loaded', () => {
                loaded = true;
                instance?.setScale(scaleRef.current);
                if (!cancelled) setState({ status: 'loaded', loaded: 1, total: 1 });
            });

            await instance.load({ path: modelPath, scale: scaleRef.current, logLevel: 'warn' });
            // l2d reports HTTP/fetch failures to its logger and resolves load().
            // Requiring the loaded event turns that silent failure into UI feedback.
            if (!loaded) throw new Error('模型资源未能完成加载，请检查地址、CORS 与模型文件。');
        }).catch((error: unknown) => {
            if (cancelled) return;
            live2dInstanceRegistry.release(instance);
            if (instanceRef.current === instance) instanceRef.current = null;
            setState({
                status: 'error',
                loaded: 0,
                total: 0,
                message: messageFrom(error),
            });
        });

        return () => {
            cancelled = true;
            live2dInstanceRegistry.release(instance);
            if (instanceRef.current === instance) instanceRef.current = null;
        };
    }, [modelPath]);

    useEffect(() => {
        instanceRef.current?.setScale(scale);
    }, [scale]);

    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        const precisionCanvas = precisionCanvasRef.current;
        if (!container || !canvas || !precisionCanvas) return;

        let timer: ReturnType<typeof setTimeout> | undefined;
        let frame = 0;
        const resize = () => {
            const width = Math.max(1, Math.round(container.clientWidth || container.getBoundingClientRect().width));
            const height = Math.max(1, Math.round(container.clientHeight || container.getBoundingClientRect().height));
            const pixelRatio = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
            precisionCanvas.setPrecision(renderPrecision);
            precisionCanvas.setLogicalSize(width * pixelRatio, height * pixelRatio);
            instanceRef.current?.resize();
        };
        const scheduleResize = () => {
            if (timer) clearTimeout(timer);
            if (frame) cancelAnimationFrame(frame);
            if (resizeDelay > 0) timer = setTimeout(resize, resizeDelay);
            else frame = requestAnimationFrame(resize);
        };

        const observer = typeof ResizeObserver === 'undefined'
            ? null
            : new ResizeObserver(scheduleResize);
        observer?.observe(container);
        scheduleResize();
        return () => {
            observer?.disconnect();
            if (timer) clearTimeout(timer);
            if (frame) cancelAnimationFrame(frame);
        };
    }, [renderPrecision, resizeDelay]);

    useEffect(() => () => {
        precisionCanvasRef.current?.restore();
        precisionCanvasRef.current = null;
        if (motionNoticeTimerRef.current) clearTimeout(motionNoticeTimerRef.current);
    }, []);

    const handleMotionClick = () => {
        if (!interaction || !clickMotion || state.status !== 'loaded') return;
        const instance = instanceRef.current;
        if (!instance) return;
        const result = playConfiguredLive2dMotion(instance, {
            group: motionGroup.trim(),
            index: motionIndex,
            priority: motionPriority,
        });
        setMotionNotice(result.message);
        if (motionNoticeTimerRef.current) clearTimeout(motionNoticeTimerRef.current);
        motionNoticeTimerRef.current = setTimeout(() => setMotionNotice(null), 2_400);
    };

    const percent = state.total > 0 ? Math.round((state.loaded / state.total) * 100) : 0;
    return (
        <div
            ref={containerRef}
            data-live2d-state={state.status}
            style={{
                height: '100%',
                minHeight: 0,
                overflow: 'hidden',
                position: 'relative',
                width: '100%',
            }}
        >
            <canvas
                ref={canvasRef}
                aria-label='Live2D 模型'
                onClick={handleMotionClick}
                style={{
                    display: 'block',
                    height: '100%',
                    opacity: state.status === 'loaded' ? 1 : 0,
                    pointerEvents: interaction ? 'auto' : 'none',
                    transition: 'opacity 180ms ease-out',
                    width: '100%',
                }}
            />
            {motionNotice ? (
                <span
                    role='status'
                    aria-live='polite'
                    data-live2d-motion-notice
                    style={{
                        background: 'color-mix(in srgb, var(--wt-color-surface, #2d2234) 90%, transparent)',
                        border: '1px solid var(--wt-color-border, rgba(255, 255, 255, 0.2))',
                        borderRadius: '999px',
                        bottom: 8,
                        fontSize: 11,
                        left: '50%',
                        maxWidth: 'calc(100% - 16px)',
                        overflow: 'hidden',
                        padding: '4px 9px',
                        position: 'absolute',
                        textOverflow: 'ellipsis',
                        transform: 'translateX(-50%)',
                        whiteSpace: 'nowrap',
                        zIndex: 2,
                    }}
                >
                    {motionNotice}
                </span>
            ) : null}
            {state.status === 'loading' ? (
                <div
                    role='status'
                    style={{
                        alignItems: 'center',
                        background: 'color-mix(in srgb, var(--wt-color-surface, #2d2234) 82%, transparent)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        inset: 0,
                        justifyContent: 'center',
                        padding: 16,
                        position: 'absolute',
                    }}
                >
                    <Spinner size='sm' label='正在加载 Live2D 模型' />
                    {state.total > 0 ? <Progress value={percent} max={100} showValue /> : null}
                    {state.file ? (
                        <span title={state.file} style={{ fontSize: 11, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {state.file}
                        </span>
                    ) : null}
                </div>
            ) : null}
            {state.status === 'error' ? (
                <div
                    role='alert'
                    style={{
                        alignItems: 'center',
                        background: 'color-mix(in srgb, var(--wt-color-danger-soft, #4a2535) 88%, transparent)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        inset: 0,
                        justifyContent: 'center',
                        overflow: 'auto',
                        padding: 16,
                        position: 'absolute',
                        textAlign: 'center',
                    }}
                >
                    <strong>Live2D 模型加载失败</strong>
                    <span style={{ fontSize: 12, lineHeight: 1.5 }}>{state.message}</span>
                </div>
            ) : null}
        </div>
    );
}
