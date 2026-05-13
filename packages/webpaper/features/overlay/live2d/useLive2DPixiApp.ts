"use client";

import { useAsyncEffect, useDevicePixelRatio } from '@reactuses/core';
import { useState } from 'react';
import type { Application } from 'pixi.js';
import { loadPixiModule } from '@/lib/live2d';

export type UseLive2DPixiAppOptions = {
    width: number;
    height: number;
    renderPrecision?: number;
};

export function useLive2DPixiApp(options: UseLive2DPixiAppOptions) {
    const { width, height, renderPrecision = 180 } = options;
    const { pixelRatio } = useDevicePixelRatio();
    const renderScale = (Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1);
    const [app, setApp] = useState<Application | null>(null);

    useAsyncEffect(
        async () => {
            const pixi = await loadPixiModule();
            const backingWidth = Math.max(1, Math.round(width * renderScale * (renderPrecision / 100)));
            const backingHeight = Math.max(1, Math.round(height * renderScale * (renderPrecision / 100)));
            const nextApp = new pixi.Application({
                width: backingWidth,
                height: backingHeight,
                resolution: 1,
                autoDensity: false,
                transparent: true,
                antialias: true,
            });
            setApp(nextApp);
        },
        () => {
            setApp((currentApp) => {
                currentApp?.destroy(true);
                return null;
            });
        },
        [renderScale]
    );

    return {
        app,
        canvas: app?.view ?? null,
    };
}