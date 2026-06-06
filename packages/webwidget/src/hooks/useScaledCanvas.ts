import { useRef, useState, useLayoutEffect, useEffect } from 'react';

export type UseScaledCanvasOptions = {
    /** 设备像素比，默认为 window.devicePixelRatio */
    dpr?: number;
    /** 渲染精度，范围 0-100，默认为 100 */
    renderPrecision?: number;
};

export type ScaledCanvas = HTMLCanvasElement & {
    /** 获取实际的物理画布宽度 */
    getPhysicalWidth: () => number;
    /** 获取实际的物理画布高度 */
    getPhysicalHeight: () => number;
};

/**
 * 创建一个缩放的 Canvas，使用 defineProperty 拦截 width 和 height 属性设置
 * 
 * 使用场景：
 * - 第三方库（如 l2d）会内部修改 canvas 的 width/height
 * - 需要将其设置的物理尺寸与逻辑尺寸分离
 * - 支持通过 DPR 和渲染精度来控制画布精度
 * - 在 SSR 环境中也能正常工作（返回值为响应式）
 * 
 * @param canvasRef Canvas 元素的 ref
 * @param options 配置选项
 * @returns Canvas 对象，或在客户端初始化前为 null
 * 
 * @example
 * ```tsx
 * const canvasRef = useRef<HTMLCanvasElement>(null);
 * const scaledCanvas = useScaledCanvas(canvasRef, { dpr: 2, renderPrecision: 100 });
 * 
 * // 将 scaledCanvas 传给第三方库
 * if (scaledCanvas) {
 *   const l2d = init(scaledCanvas);
 * }
 * 
 * // 现在可以安全地设置 canvas 尺寸
 * scaledCanvas?.width = 800;  // 逻辑宽度，实际设置为 1600 (800 * 2)
 * scaledCanvas?.height = 600; // 逻辑高度，实际设置为 1200 (600 * 2)
 * ```
 */
export function useScaledCanvas(
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    options: UseScaledCanvasOptions = {}
): ScaledCanvas | null {
    const [isReady, setIsReady] = useState(false);

    const {
        dpr = 1, // 部分库会自行处理 DPR，所以默认值设为 1，用户可根据需要调整
        renderPrecision = 100,
    } = options;

    // 保存逻辑尺寸
    const logicalSizeRef = useRef({ width: 0, height: 0 });

    // 使用 useRef 存储 dpr 和 renderPrecision，避免 stale closure 问题
    const configRef = useRef({ dpr, renderPrecision });

    useEffect(() => {
        configRef.current = { dpr, renderPrecision };
    }, [dpr, renderPrecision]);

    // 在客户端挂载后定义属性
    useLayoutEffect(() => {
        if (!canvasRef.current) {
            setIsReady(false);
            return;
        }

        const canvas = canvasRef.current;
        const { dpr: currentDpr, renderPrecision: currentPrecision } = configRef.current;
        const originalGetContext = canvas.getContext.bind(canvas);
        let scaled2dContext: CanvasRenderingContext2D | null = null;
        let originalSetTransform: CanvasRenderingContext2D['setTransform'] | null = null;

        const getCurrentScale = () => {
            const { dpr: d, renderPrecision: p } = configRef.current;
            return d * p / 100;
        };

        const applyCurrentTransform = () => {
            if (!scaled2dContext || !originalSetTransform) return;
            const scale = getCurrentScale();
            (originalSetTransform as any).call(scaled2dContext, scale, 0, 0, scale, 0, 0);
        };

        Object.defineProperty(canvas, 'getContext', {
            configurable: true,
            enumerable: true,
            value(type: string, options?: any) {
                const context = originalGetContext(type, options);
                if (!context) return context;
                const ctxAny = context as any;
                scaled2dContext = context as CanvasRenderingContext2D;
                if (!originalSetTransform && typeof ctxAny.setTransform === 'function') {
                    originalSetTransform = ctxAny.setTransform.bind(context);
                }

                // only patch once
                if (ctxAny.__scaled_patched) {
                    applyCurrentTransform();
                    return context;
                }
                try {
                    const origSetTransform = ctxAny.setTransform?.bind(context);
                    const origResetTransform = ctxAny.resetTransform?.bind(context);
                    const origViewport = ctxAny.viewport?.bind(context);
                    if (origSetTransform) {
                        ctxAny.setTransform = function (a: number, b: number, c: number, d: number, e: number, f: number) {
                            const scale = getCurrentScale();
                            return origSetTransform(a * scale, b, c, d * scale, e * scale, f * scale);
                        };
                    }

                    if (origResetTransform) {
                        ctxAny.resetTransform = function () {
                            origResetTransform();
                            const scale = getCurrentScale();
                            return origSetTransform?.(scale, 0, 0, scale, 0, 0);
                        };
                    }

                    if (origViewport) {
                        ctxAny.viewport = function () {
                            const scale = getCurrentScale();
                            const { width, height } = logicalSizeRef.current;
                            return origViewport?.(0, 0, width * scale, height * scale);
                        };
                    }

                    ctxAny.__scaled_patched = true;
                } catch (e) {
                    // ignore patch errors
                }
                applyCurrentTransform();
                return context;
            },
            writable: true,
        });

        // 初始化逻辑尺寸：从真实 canvas 的物理尺寸反推逻辑尺寸
        if (logicalSizeRef.current.width === 0 && logicalSizeRef.current.height === 0) {
            const logicalWidth = Math.max(1, Math.round(canvas.width / (currentDpr * currentPrecision / 100)));
            const logicalHeight = Math.max(1, Math.round(canvas.height / (currentDpr * currentPrecision / 100)));
            logicalSizeRef.current = { width: logicalWidth, height: logicalHeight };
        }

        // 定义 width 属性描述符
        Object.defineProperty(canvas, 'width', {
            configurable: true,
            enumerable: true,
            get() {
                // 如果逻辑尺寸还没初始化，返回计算后的值
                if (logicalSizeRef.current.width === 0) {
                    const { dpr: d, renderPrecision: p } = configRef.current;
                    return Math.max(1, Math.round(this.clientWidth || 0 / (d * p / 100)));
                }
                return logicalSizeRef.current.width;
            },
            set(logicalWidth: number) {
                const numValue = Number(logicalWidth);
                if (isNaN(numValue) || numValue < 1) return;

                logicalSizeRef.current.width = numValue;
                const scale = getCurrentScale();
                const physicalWidth = Math.max(1, Math.round(numValue * scale));

                // 设置 css 尺寸为逻辑尺寸，确保第三方库读取 clientWidth/clientHeight 正确
                try {
                    if (this.style) this.style.width = `${numValue}px`;
                } catch (e) { }

                // 直接设置内部的物理尺寸（原生 setter）
                Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width')?.set?.call(this, physicalWidth);

                applyCurrentTransform();
            }
        });

        // 定义 height 属性描述符
        Object.defineProperty(canvas, 'height', {
            configurable: true,
            enumerable: true,
            get() {
                // 如果逻辑尺寸还没初始化，返回计算后的值
                if (logicalSizeRef.current.height === 0) {
                    const { dpr: d, renderPrecision: p } = configRef.current;
                    return Math.max(1, Math.round(this.clientHeight || 0 / (d * p / 100)));
                }
                return logicalSizeRef.current.height;
            },
            set(logicalHeight: number) {
                const numValue = Number(logicalHeight);
                if (isNaN(numValue) || numValue < 1) return;

                logicalSizeRef.current.height = numValue;
                const scale = getCurrentScale();
                const physicalHeight = Math.max(1, Math.round(numValue * scale));

                // 设置 css 尺寸为逻辑尺寸
                try {
                    if (this.style) this.style.height = `${numValue}px`;
                } catch (e) { }

                // 直接设置内部的物理尺寸（原生 setter）
                Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'height')?.set?.call(this, physicalHeight);

                applyCurrentTransform();
            }
        });

        // 定义 getPhysicalWidth 方法
        Object.defineProperty(canvas, 'getPhysicalWidth', {
            value: function () {
                const physicalDescriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width');
                return physicalDescriptor?.get?.call(this) || 0;
            },
            writable: true,
            configurable: true
        });

        // 定义 getPhysicalHeight 方法
        Object.defineProperty(canvas, 'getPhysicalHeight', {
            value: function () {
                const physicalDescriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'height');
                return physicalDescriptor?.get?.call(this) || 0;
            },
            writable: true,
            configurable: true
        });

        setIsReady(true);
    }, [canvasRef.current]);

    return isReady && canvasRef.current ? (canvasRef.current as ScaledCanvas) : null;
}
