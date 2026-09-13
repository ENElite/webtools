import { describe, expect, it } from 'vitest';

import {
    animationToTransitionStyle,
    entryAnimationToStyle,
    layoutToPixels,
    layoutToStyle,
    pixelsToLayout,
} from './layout';

const base = {
    anchorX: 'left' as const,
    anchorY: 'top' as const,
    x: 10,
    y: 20,
    w: 30,
    h: 40,
    rotation: 15,
    adapt: 'stretch' as const,
    order: 2,
};

describe('layoutToStyle', () => {
    it('maps left/top percentage layout', () => {
        expect(layoutToStyle(base, {})).toMatchObject({
            left: '7%',
            top: '12%',
            width: '30%',
            height: '40%',
            zIndex: 2,
            transform: 'rotate(15deg)',
        });
    });

    it('maps centered and trailing anchors against the available space', () => {
        expect(layoutToStyle({ ...base, anchorX: 'center', anchorY: 'bottom' }, {})).toMatchObject({
            left: '42%',
            top: '72%',
            transform: 'rotate(15deg)',
        });
    });

    it('keeps the legacy allow-overflow setting semantics', () => {
        expect(layoutToStyle(base, { overflow: true }).overflow).toBe('visible');
        expect(layoutToStyle(base, { overflow: false }).overflow).toBe('hidden');
        expect(layoutToStyle(base, {}).overflow).toBe('hidden');
    });

    it('builds CSS transitions only for selected style outputs', () => {
        expect(animationToTransitionStyle({
            easing: 'ease-in-out',
            duration: 0.6,
            delay: 0.15,
            animatedProperties: ['backgroundColor', 'boxShadow'],
        })).toEqual({
            transition: [
                'visibility 0s linear 180ms',
                'opacity 180ms ease',
                'background-color 0.6s ease-in-out 0.15s',
                'box-shadow 0.6s ease-in-out 0.15s',
            ].join(', '),
        });
    });

    it('disables frame transitions when reduced motion is preferred', () => {
        expect(animationToTransitionStyle({
            easing: 'linear',
            duration: 1,
            delay: 0,
            animatedProperties: ['opacity'],
        }, true)).toEqual({ transition: 'none' });
    });

    it('builds a one-shot directional entry animation without replacing layout rotation', () => {
        expect(entryAnimationToStyle({
            effect: 'slide',
            direction: 'left',
            duration: 0.7,
            delay: 0.15,
            easing: 'ease-out',
        })).toEqual({
            animationName: 'wt-widget-entry-slide-left',
            animationDuration: '0.7s',
            animationDelay: '0.15s',
            animationTimingFunction: 'ease-out',
            animationFillMode: 'backwards',
            animationIterationCount: 1,
        });
        expect(entryAnimationToStyle({
            effect: 'none',
            direction: 'up',
            duration: 0.45,
            delay: 0,
            easing: 'ease-out',
        })).toEqual({});
        expect(entryAnimationToStyle({
            effect: 'fade',
            direction: 'up',
            duration: 0.45,
            delay: 0,
            easing: 'ease-out',
        }, true)).toEqual({ animation: 'none' });
    });

    it.each([
        ['left', 'top'],
        ['center', 'center'],
        ['right', 'bottom'],
    ] as const)('round-trips %s/%s anchors through pixels', (anchorX, anchorY) => {
        const source = { ...base, anchorX, anchorY };
        const pixels = layoutToPixels(source, 1_200, 800);
        expect(pixelsToLayout(pixels, 1_200, 800, source)).toEqual({
            anchorX,
            anchorY,
            x: source.x,
            y: source.y,
            w: source.w,
            h: source.h,
            rotation: source.rotation,
            adapt: source.adapt,
        });
    });

    it('preserves the chosen anchor while converting a moved and resized box', () => {
        const source = { ...base, anchorX: 'right' as const, anchorY: 'bottom' as const };
        const next = pixelsToLayout({
            left: 600,
            top: 300,
            width: 240,
            height: 160,
            rotation: 30,
        }, 1_200, 800, source);

        expect(next).toMatchObject({
            anchorX: 'right',
            anchorY: 'bottom',
            w: 20,
            h: 20,
            rotation: 30,
        });
        expect(layoutToPixels({ ...next, order: 1 }, 1_200, 800)).toEqual({
            left: 600,
            top: 300,
            width: 240,
            height: 160,
            rotation: 30,
        });
    });
});
