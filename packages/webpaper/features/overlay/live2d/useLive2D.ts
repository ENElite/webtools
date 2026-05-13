"use client";

import { useCallback } from 'react';
import { useDevicePixelRatio } from '@reactuses/core';
import { resizeLive2DViewport } from './live2d_utils';
import { useLive2DPixiApp } from './useLive2DPixiApp';
import { useLive2DModel } from './useLive2DModel';

export type UseLive2DOptions = {
    modelPath: string;
    userScale?: number;
    enableInteraction?: boolean;
    enablePointerTracking?: boolean;
    autoAnimation?: boolean;
    width: number;
    height: number;
    renderPrecision?: number;
    onHit?: (areas: string[]) => void;
};

export function useLive2D(options: UseLive2DOptions) {
    const {
        modelPath,
        userScale = 1,
        enableInteraction = true,
        enablePointerTracking = false,
        autoAnimation = false,
        width,
        height,
        renderPrecision = 100,
        onHit,
    } = options;

    const { pixelRatio } = useDevicePixelRatio();
    const effectiveDPR = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;

    const { app, canvas } = useLive2DPixiApp({
        width,
        height,
        renderPrecision,
    });

    const model = useLive2DModel({
        app,
        modelPath,
        enableInteraction,
        enablePointerTracking,
        autoAnimation,
        onHit,
    });

    const resize = useCallback((nextWidth: number, nextHeight: number) => {
        if (!app || !model) {
            return;
        }
        resizeLive2DViewport(
            app, model,
            nextWidth, nextHeight,
            userScale, renderPrecision, effectiveDPR
        );
    }, [app, model, renderPrecision, effectiveDPR, userScale]);

    return { canvas, app, model, resize };
}
