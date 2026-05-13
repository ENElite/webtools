"use client";

import { useEffect, useRef, useState } from 'react';
import type { Application } from 'pixi.js';
import type { Live2DModel } from 'pixi-live2d-display';
import { loadLive2dRuntimeModules, loadLive2dSettingsJsonCached } from '@/lib/live2d';

const LIVE2D_WIDGET_LOG_PREFIX = '[Live2D:useLive2D]';

export type UseLive2DModelOptions = {
    app: Application | null;
    modelPath: string;
    enableInteraction?: boolean;
    enablePointerTracking?: boolean;
    autoAnimation?: boolean;
    onHit?: (areas: string[]) => void;
};

export function useLive2DModel(options: UseLive2DModelOptions) {
    const {
        app,
        modelPath,
        enableInteraction = true,
        enablePointerTracking = false,
        autoAnimation = false,
        onHit,
    } = options;

    const [model, setModel] = useState<Live2DModel | null>(null);
    const autoTimerRef = useRef<number | null>(null);

    useEffect(() => {
        if (!app) {
            return;
        }

        let cancelled = false;
        let nextModel: Live2DModel | null = null;

        const cleanupTimer = () => {
            if (autoTimerRef.current !== null) {
                window.clearInterval(autoTimerRef.current);
                autoTimerRef.current = null;
            }
        };

        const cleanupModel = () => {
            if (!nextModel) {
                return;
            }

            try {
                if (app.stage.children.includes(nextModel)) {
                    app.stage.removeChild(nextModel);
                }
            } catch (error) {
                console.warn(`${LIVE2D_WIDGET_LOG_PREFIX} model removal failed`, {
                    modelPath,
                    error,
                });
            }

            nextModel.destroy();
            nextModel = null;
        };

        void (async () => {
            const { pixi, cubism } = await loadLive2dRuntimeModules();
            if (cancelled) {
                return;
            }

            const Live2DModelCtor = cubism.Live2DModel;
            Live2DModelCtor.registerTicker(pixi.Ticker);
            const settingsJson = await loadLive2dSettingsJsonCached(modelPath);
            if (cancelled) {
                return;
            }

            nextModel = await Live2DModelCtor.from(settingsJson);
            if (cancelled) {
                cleanupModel();
                return;
            }

            setModel(nextModel);
            app.stage.addChild(nextModel);

            if (enableInteraction) {
                nextModel.interactive = true;
                nextModel.cursor = 'pointer';
                if (onHit) {
                    nextModel.on('hit', onHit);
                }
            }

            if (autoAnimation) {
                autoTimerRef.current = window.setInterval(() => {
                    nextModel?.motion('idle');
                }, 3000);
            }

        })().catch((error) => {
            console.error(`${LIVE2D_WIDGET_LOG_PREFIX} model load failed`, {
                modelPath,
                error,
            });
        });

        return () => {
            cancelled = true;
            cleanupTimer();
            cleanupModel();
            setModel(null);
        };
    }, [app, autoAnimation, enableInteraction, enablePointerTracking, modelPath, onHit]);

    return model;
}