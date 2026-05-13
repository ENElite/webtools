"use client";

import type { Application } from 'pixi.js';
import type { Live2DModel } from 'pixi-live2d-display';

export function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}


/**
 * 纯函数，传入 
 * @param app 
 * @param model 
 * @param width 
 * @param height 
 * @param userScale 
 * @param effectiveDPR 
 * @returns 
 */
export function resizeLive2DViewport(
    app: Application,
    model: Live2DModel,
    width: number,
    height: number,
    userScale: number,
    renderPrecision: number,
    dpr: number
) {
    if (width <= 0 || height <= 0) {
        return;
    }
    const scale = renderPrecision * dpr / 100;
    const backingWidth = Math.max(1, Math.round(width * scale));
    const backingHeight = Math.max(1, Math.round(height * scale));
    app.renderer.resize(backingWidth, backingHeight);

    const bounds = model.getLocalBounds();

    if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
        model.scale.set(userScale);
        model.position.set(backingWidth / 2, backingHeight / 2);
        return;
    }

    const fitScale = height * userScale * scale / bounds.height;
    const finalScale = Math.max(0.01, fitScale);

    model.pivot.set(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    model.scale.set(finalScale);
    model.position.set(backingWidth / 2, backingHeight / 2);
    app.renderer.render(app.stage);
}