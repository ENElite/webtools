"use client";

import { useRef, useState, useCallback, useEffect } from 'react';
import type { L2D } from 'l2d';
import { useAsyncEffect, useDevicePixelRatio, useBoolean } from '@reactuses/core';

export type UseLive2DOptions = {
    modelPath: string;
    scale?: number;
    renderPrecision?: number;
};

type ModelLoadingState = 'unloaded' | 'loading' | 'loaded';

export function useLive2D(
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    options: UseLive2DOptions
) {
    const { modelPath, scale = 100 } = options;
    const [l2d, setL2d] = useState<L2D | null>(null);
    const l2dRef = useRef<L2D | null>(null);
    const [loading, setLoading] = useState<ModelLoadingState>('unloaded');
    const [loadInfo, setLoadInfo] = useState<{ loaded: number; total: number; file?: string } | null>(null);


    // 初始化 live2d
    useAsyncEffect(async () => {
        if (!canvasRef.current) return;
        const { init } = await import('l2d');
        const l2dInstance = init(canvasRef.current);
        l2dRef.current = l2dInstance;
        setL2d(l2dInstance);

        const handleLoadStart = (total: number) => {
            setLoading('unloaded');
            setLoadInfo({ loaded: 0, total });
        }
        const handleLoadProgress = (loaded: number, total: number, file: string) => {
            setLoading('loading');
            setLoadInfo({ loaded, total, file });
        }
        const handleLoaded = () => {
            setLoading('loaded');
            setLoadInfo(null);
        }
        l2dInstance.on('loadstart', handleLoadStart);
        l2dInstance.on('loadprogress', handleLoadProgress);
        l2dInstance.on('loaded', handleLoaded);
        return l2dInstance.load({ path: modelPath, scale: scale / 100 });
    }, () => {
        l2dRef.current = null;
    }, [canvasRef.current]);

    // 加载 model, 返回 loading 事件信息
    useAsyncEffect(async () => {
        return l2d?.load({ path: modelPath });
    }, () => {
        l2d?.destroy();
        setLoading('unloaded');
    }, [l2d, modelPath]);

    // 调整缩放
    useEffect(() => {
        l2d?.setScale(scale / 100);
    }, [scale]);

    // 调整 canvas 大小以适应容器尺寸和渲染精度
    const applyCanvasSize = useCallback((
        targetWidth: number, targetHeight: number,
        renderPrecision: number = 1, dpr: number = 1
    ) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const actualWidth = Math.max(1, Math.round(targetWidth * dpr * renderPrecision / 100));
        const actualHeight = Math.max(1, Math.round(targetHeight * dpr * renderPrecision / 100));
        if (canvas.width !== actualWidth || canvas.height !== actualHeight) {
            canvas.width = actualWidth;
            canvas.height = actualHeight;
            l2d?.resize();
        }
    }, [canvasRef.current]);

    return {
        l2d,
        loading,
        loadInfo,
        resize: applyCanvasSize,
    };
}
