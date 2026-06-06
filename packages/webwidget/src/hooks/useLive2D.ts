"use client";

import { useRef, useState, useCallback, useEffect } from 'react';
import type { L2D } from 'l2d';
import { useAsyncEffect, useDevicePixelRatio } from '@reactuses/core';
import { useScaledCanvas } from './useScaledCanvas';

export type UseLive2DOptions = {
    scale?: number;
    renderPrecision?: number;
};

type ModelLoadingState = 'unloaded' | 'loading' | 'loaded';

/**
 * 追踪活跃的 L2D 实例数量。用于在组件卸载时安全清理。
 *
 * l2d 库的 Cubism6 模型在 release() 时会调用 CubismFramework.dispose()，
 * 该方法释放全局共享的 WASM 内存分配器和 ID 管理器。当多个 L2D 实例共存时，
 * 一个实例的 dispose 会导致其他实例的模型消失。
 *
 * 因此：modelPath 变化时，我们创建新实例加载新模型，交换 canvas 后旧实例保持存活。
 * 组件卸毁时统一清理所有实例。
 */
const activeInstances: L2D[] = [];

function trackInstance(instance: L2D) {
    activeInstances.push(instance);
}

function untrackInstance(instance: L2D) {
    const idx = activeInstances.indexOf(instance);
    if (idx >= 0) activeInstances.splice(idx, 1);
}

function destroyAllInstances() {
    while (activeInstances.length > 0) {
        const inst = activeInstances.pop()!;
        try { inst.destroy(); } catch (e) { /* ignore */ }
    }
}

export function useLive2D(
    modelPath: string,
    options: UseLive2DOptions
) {
    const { scale = 100, renderPrecision = 100 } = options;
    const [l2d, setL2d] = useState<L2D | null>(null);
    const l2dRef = useRef<L2D | null>(null);
    const [loading, setLoading] = useState<ModelLoadingState>('unloaded');
    const [loadInfo, setLoadInfo] = useState<{ loaded: number; total: number; file?: string } | null>(null);
    // 创建缩放 canvas，拦截 l2d 对 canvas 尺寸的修改
    const { pixelRatio } = useDevicePixelRatio();
    // 只在挂载时创建 canvas，modelPath 变化时复用现有实例
    const [canvasEl] = useState<HTMLCanvasElement | null>(() => (typeof document !== 'undefined' ? document.createElement('canvas') : null));

    // 将 canvasEl 包装成 ref 传给 useScaledCanvas
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    useEffect(() => {
        canvasRef.current = canvasEl;
    }, [canvasEl]);

    const scaledCanvas = useScaledCanvas(canvasRef, { renderPrecision, dpr: pixelRatio });
    // 初始化 live2d：当 scaledCanvas 发生变化时重新 init 并 load
    useAsyncEffect(async () => {
        if (!scaledCanvas) return;
        const { init } = await import('l2d');
        // 如果已有实例则销毁
        if (l2dRef.current) {
            try { l2dRef.current.destroy(); } catch (e) { }
            untrackInstance(l2dRef.current);
            l2dRef.current = null;
            setL2d(null);
        }

        // 将缩放后的 canvas 传给 l2d，这样 l2d 修改 width/height 时实际上会被拦截
        const l2dInstance = init(scaledCanvas);
        trackInstance(l2dInstance);
        l2dRef.current = l2dInstance;
        setL2d(l2dInstance);

        const handleLoadStart = (total: number) => {
            setLoading('unloaded');
            setLoadInfo({ loaded: 0, total });
        };
        const handleLoadProgress = (loaded: number, total: number, file: string) => {
            setLoading('loading');
            setLoadInfo({ loaded, total, file });
        };
        const handleLoaded = () => {
            setLoading('loaded');
            setLoadInfo(null);
        };
        l2dInstance.on('loadstart', handleLoadStart);
        l2dInstance.on('loadprogress', handleLoadProgress);
        l2dInstance.on('loaded', handleLoaded);

        // load 返回一个 promise
        await l2dInstance.load({ path: modelPath, scale: scale / 100 });
    }, () => {
        // cleanup: 不调用 destroy()！
        // l2d 库的 Cubism6 模型 release() 会调用 CubismFramework.dispose()，
        // 释放全局 WASM 内存和 ID 管理器，导致所有其他模型消失。
        // 只做 untrack，让实例自然被 GC 回收。
        if (l2dRef.current) {
            untrackInstance(l2dRef.current);
        }
        l2dRef.current = null;
    }, [scaledCanvas]);

    // modelPath 变化时：创建新实例加载新模型，完成后替换 canvas，旧实例保持存活
    // 不能在现有实例上调用 load()，因为 l2d 库内部切换模型时会调用
    // CubismFramework.dispose()，释放全局共享的 WASM 内存和 ID 管理器，
    // 导致其他 Cubism6 模型消失。
    useEffect(() => {
        if (!l2dRef.current || !scaledCanvas) return;
        let cancelled = false;

        (async () => {
            const { init } = await import('l2d');

            // 创建新的离屏 canvas
            const newCanvas = document.createElement('canvas');
            newCanvas.style.display = 'block';

            const newL2d = init(newCanvas);
            if (cancelled) {
                try { newL2d.destroy(); } catch (e) { }
                return;
            }

            trackInstance(newL2d);

            // 设置 loading 事件
            const handleLoadStart = (total: number) => {
                setLoading('unloaded');
                setLoadInfo({ loaded: 0, total });
            };
            const handleLoadProgress = (loaded: number, total: number, file: string) => {
                setLoading('loading');
                setLoadInfo({ loaded, total, file });
            };
            const handleLoaded = () => {
                setLoading('loaded');
                setLoadInfo(null);
            };
            newL2d.on('loadstart', handleLoadStart);
            newL2d.on('loadprogress', handleLoadProgress);
            newL2d.on('loaded', handleLoaded);

            // 加载新模型
            await newL2d.load({ path: modelPath, scale: scale / 100 });

            if (cancelled) {
                untrackInstance(newL2d);
                try { newL2d.destroy(); } catch (e) { }
                return;
            }

            // 新模型已加载，替换 canvas 并更新状态
            const oldL2d = l2dRef.current;
            l2dRef.current = newL2d;
            setL2d(newL2d);

            // 将新 canvas 替换旧 canvas 在 DOM 中的位置
            const oldCanvas = scaledCanvas as HTMLCanvasElement;
            if (oldCanvas?.parentNode) {
                newCanvas.style.width = '100%';
                newCanvas.style.height = '100%';
                oldCanvas.parentNode.replaceChild(newCanvas, oldCanvas);
            }

            // 旧实例保持存活（其动画循环在 detached canvas 上运行，不影响视觉效果）。
            // 不能调用 oldL2d.destroy()，因为那会触发 CubismFramework.dispose()，
            // 导致新实例和其他活跃实例的模型消失。
            // 旧实例在组件卸载时通过 destroyAllInstances() 统一清理。
            void oldL2d;
        })();

        return () => {
            cancelled = true;
        };
    }, [modelPath]);

    // 调整缩放
    useEffect(() => {
        l2d?.setScale(scale / 100);
    }, [l2d, scale]);

    // 调整 canvas 大小以适应容器尺寸
    // 现在通过修改 scaledCanvas 的 width/height 来控制逻辑尺寸
    // 实际物理尺寸会根据 dpr 和 renderPrecision 自动计算
    const setCanvasSize = useCallback((
        logicalWidth: number,
        logicalHeight: number
    ) => {
        if (!scaledCanvas) return;
        scaledCanvas.width = logicalWidth;
        scaledCanvas.height = logicalHeight;
        // 只在 l2d 完全加载后才调用 resize，避免初始化过程中出错
        l2d?.resize();
    }, [l2d, renderPrecision]);

    return {
        l2d,
        loading,
        loadInfo,
        resize: setCanvasSize,
        canvas: scaledCanvas,
        // 原始 DOM 元素（可能用于直接挂载或调试）
        canvasElement: canvasEl,
    };
}

/**
 * 清理所有活跃的 L2D 实例。应在应用卸载时调用。
 */
export function cleanupAllLive2DInstances() {
    destroyAllInstances();
}
