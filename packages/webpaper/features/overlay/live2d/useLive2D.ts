"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import type { L2D } from 'l2d';

export type UseLive2DOptions = {
    renderPrecision?: number;
};

export function useLive2D(options: UseLive2DOptions) {
    const { renderPrecision = 100 } = options;
    const [l2d, setL2d] = useState<L2D | null>(null);
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const l2dRef = useRef<L2D | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const precisionFactor = Math.max(0.1, renderPrecision / 100);

    const applyCanvasSize = useCallback((targetWidth: number, targetHeight: number) => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        const precisionFactor = Math.max(0.1, renderPrecision / 100);
        const actualWidth = Math.max(1, Math.round(targetWidth * dpr * precisionFactor));
        const actualHeight = Math.max(1, Math.round(targetHeight * dpr * precisionFactor));

        if (canvas.width !== actualWidth || canvas.height !== actualHeight) {
            canvas.width = actualWidth;
            canvas.height = actualHeight;
            l2dRef.current?.resize();
        }
    }, [precisionFactor]);

    useAsyncEffect(async () => {
        const { init } = await import('l2d');
        const newCanvas = document.createElement('canvas');
        newCanvas.style.display = 'block';
        const l2dInstance = init(newCanvas);
        l2dRef.current = l2dInstance;
        canvasRef.current = newCanvas;
        setL2d(l2dInstance);
        setCanvas(newCanvas);
    }, () => {
        l2dRef.current = null;
        canvasRef.current = null;
    }, []);

    return {
        l2d,
        canvas,
        resize: applyCanvasSize,
    };
}
