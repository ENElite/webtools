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
    // 动态创建一个离 DOM 的 canvas，每次 modelPath 切换时重建
    const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(() => (typeof document !== 'undefined' ? document.createElement('canvas') : null));
    useEffect(() => {
        if (typeof document === 'undefined') return;
        const el = document.createElement('canvas');
        el.style.display = 'block';
        setCanvasEl(el);
        console.log('[useLive2D] Created new canvas element for Live2D:', el);
        return () => {
            // 清理：如果被挂载到 DOM 上则移除
            try {
                if (el.parentElement) el.parentElement.removeChild(el);
            } catch (e) { }
        };
    }, [modelPath]);

    // 将 canvasEl 包装成 ref 传给 useScaledCanvas
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    useEffect(() => {
        console.log('[useLive2D] Updating canvasRef with new canvas element:', canvasEl);
        canvasRef.current = canvasEl;
    }, [canvasEl]);

    const scaledCanvas = useScaledCanvas(canvasRef, { renderPrecision, dpr: pixelRatio });
    // 初始化 live2d：当 scaledCanvas 或 modelPath 发生变化时重新 init 并 load
    useAsyncEffect(async () => {
        if (!scaledCanvas) return;
        const { init } = await import('l2d');
        console.log('[useLive2D] Initializing Live2D with canvas:', scaledCanvas);
        // 如果已有实例则销毁
        if (l2dRef.current) {
            try { l2dRef.current.destroy(); } catch (e) { }
            l2dRef.current = null;
            setL2d(null);
        }

        // 将缩放后的 canvas 传给 l2d，这样 l2d 修改 width/height 时实际上会被拦截
        const l2dInstance = init(scaledCanvas);
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

        l2dRef.current?.destroy();
        // cleanup outer
    }, [scaledCanvas, modelPath]);

    // // 加载 model, 返回 loading 事件信息
    // useAsyncEffect(async () => {
    //     return l2d?.load({ path: modelPath });
    // }, () => {
    //     l2d?.destroy();
    //     setLoading('unloaded');
    // }, [l2d]);

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

