"use client";

import { useEffect } from 'react';
import type { L2D } from 'l2d';

export type UseLive2DModelOptions = {
    l2d: L2D | null;
    modelPath: string;
    scale?: number;
    onHit?: (areas: string[]) => void;
};

export function useLive2DModel(options: UseLive2DModelOptions) {
    const { l2d, modelPath, scale = 1, onHit } = options;

    useEffect(() => {
        if (!l2d) {
            return;
        }

        let cancelled = false;
        void (async () => {
            try {
                await l2d.load({
                    path: modelPath,
                });

                if (cancelled) {
                    return;
                }

                if (onHit && (l2d as any).on) {
                    (l2d as any).on('hit', (hitAreas: string[]) => {
                        onHit(hitAreas);
                    });
                }
            } catch (error) {
                // ignore
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [l2d, modelPath, onHit]);

    useEffect(() => {
        if (!l2d) {
            return;
        }

        l2d.setScale(scale);
    }, [l2d, scale]);
}
