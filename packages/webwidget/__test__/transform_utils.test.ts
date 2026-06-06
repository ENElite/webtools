import { describe, expect, it } from 'vitest';

import { layoutFromPx, pxFromLayout } from '../src/runtime/transform_utils';
import type { WidgetLayout } from '../src/engine/model';

const CONTAINER_WIDTH = 1000;
const CONTAINER_HEIGHT = 600;

describe('pxFromLayout', () => {
    it('keeps left-top x=0/y=0 inside the container', () => {
        const layout: WidgetLayout = {
            anchorX: 'left',
            anchorY: 'top',
            x: 0,
            y: 0,
            w: 20,
            h: 15,
            rotation: 0,
            adapt: 'fixed',
            order: 1,
        };

        const px = pxFromLayout(layout, CONTAINER_WIDTH, CONTAINER_HEIGHT);

        expect(px.x).toBeCloseTo(0);
        expect(px.y).toBeCloseTo(0);
        expect(px.w).toBeCloseTo(200);
        expect(px.h).toBeCloseTo(90);
    });

    it('uses container minus widget size as the travel range for left-top', () => {
        const layout: WidgetLayout = {
            anchorX: 'left',
            anchorY: 'top',
            x: 100,
            y: 100,
            w: 20,
            h: 15,
            rotation: 0,
            adapt: 'fixed',
            order: 1,
        };

        const px = pxFromLayout(layout, CONTAINER_WIDTH, CONTAINER_HEIGHT);

        expect(px.x).toBeCloseTo(800);
        expect(px.y).toBeCloseTo(510);
    });

    it('keeps center anchor x=0/y=0 centered without overflowing', () => {
        const layout: WidgetLayout = {
            anchorX: 'center',
            anchorY: 'center',
            x: 0,
            y: 0,
            w: 20,
            h: 15,
            rotation: 0,
            adapt: 'fixed',
            order: 1,
        };

        const px = pxFromLayout(layout, CONTAINER_WIDTH, CONTAINER_HEIGHT);

        expect(px.x).toBeCloseTo(400);
        expect(px.y).toBeCloseTo(255);
    });

    it('uses right-bottom as the lower-right boundary origin', () => {
        const layout: WidgetLayout = {
            anchorX: 'right',
            anchorY: 'bottom',
            x: 0,
            y: 0,
            w: 20,
            h: 15,
            rotation: 0,
            adapt: 'fixed',
            order: 1,
        };

        const px = pxFromLayout(layout, CONTAINER_WIDTH, CONTAINER_HEIGHT);

        expect(px.x).toBeCloseTo(800);
        expect(px.y).toBeCloseTo(510);
    });
});

describe('layoutFromPx', () => {
    it('reconstructs left-top x/y from top-left coordinates', () => {
        const px = { x: 400, y: 255, w: 200, h: 90, rotation: 0 };
        const layout = layoutFromPx(px, CONTAINER_WIDTH, CONTAINER_HEIGHT, 'left', 'top');

        expect(layout.anchorX).toBe('left');
        expect(layout.anchorY).toBe('top');
        expect(layout.x).toBeCloseTo(50, 5);
        expect(layout.y).toBeCloseTo(50, 5);
        expect(layout.w).toBeCloseTo(20, 5);
        expect(layout.h).toBeCloseTo(15, 5);
    });

    it('reconstructs center anchor x=0/y=0 from centered top-left coordinates', () => {
        const px = { x: 400, y: 255, w: 200, h: 90, rotation: 0 };
        const layout = layoutFromPx(px, CONTAINER_WIDTH, CONTAINER_HEIGHT, 'center', 'center');

        expect(layout.anchorX).toBe('center');
        expect(layout.anchorY).toBe('center');
        expect(layout.x).toBeCloseTo(0, 5);
        expect(layout.y).toBeCloseTo(0, 5);
    });

    it('reconstructs right-bottom x=0/y=0 from bottom-right coordinates', () => {
        const px = { x: 800, y: 510, w: 200, h: 90, rotation: 0 };
        const layout = layoutFromPx(px, CONTAINER_WIDTH, CONTAINER_HEIGHT, 'right', 'bottom');

        expect(layout.anchorX).toBe('right');
        expect(layout.anchorY).toBe('bottom');
        expect(layout.x).toBeCloseTo(0, 5);
        expect(layout.y).toBeCloseTo(0, 5);
    });
});

describe('roundtrip', () => {
    const cases: Array<{ name: string; layout: WidgetLayout }> = [
        {
            name: 'left-top boundary',
            layout: {
                anchorX: 'left',
                anchorY: 'top',
                x: 100,
                y: 100,
                w: 20,
                h: 15,
                rotation: 0,
                adapt: 'fixed',
                order: 1,
            },
        },
        {
            name: 'center anchor',
            layout: {
                anchorX: 'center',
                anchorY: 'center',
                x: 0,
                y: 0,
                w: 20,
                h: 15,
                rotation: 0,
                adapt: 'fixed',
                order: 1,
            },
        },
        {
            name: 'right-bottom anchor',
            layout: {
                anchorX: 'right',
                anchorY: 'bottom',
                x: 0,
                y: 0,
                w: 20,
                h: 15,
                rotation: 0,
                adapt: 'fixed',
                order: 1,
            },
        },
    ];

    for (const testCase of cases) {
        it(testCase.name, () => {
            const px = pxFromLayout(testCase.layout, CONTAINER_WIDTH, CONTAINER_HEIGHT);
            const recovered = layoutFromPx(
                px,
                CONTAINER_WIDTH,
                CONTAINER_HEIGHT,
                testCase.layout.anchorX,
                testCase.layout.anchorY,
                testCase.layout.adapt,
            );

            expect(recovered.anchorX).toBe(testCase.layout.anchorX);
            expect(recovered.anchorY).toBe(testCase.layout.anchorY);
            expect(recovered.x).toBeCloseTo(testCase.layout.x, 5);
            expect(recovered.y).toBeCloseTo(testCase.layout.y, 5);
            expect(recovered.w).toBeCloseTo(testCase.layout.w, 5);
            expect(recovered.h).toBeCloseTo(testCase.layout.h, 5);
        });
    }
});

describe('boundary conditions', () => {
    it('clamps movement when widget is wider than the container', () => {
        const layout: WidgetLayout = {
            anchorX: 'left',
            anchorY: 'top',
            x: 100,
            y: 100,
            w: 150,
            h: 80,
            rotation: 0,
            adapt: 'fixed',
            order: 1,
        };

        const px = pxFromLayout(layout, CONTAINER_WIDTH, CONTAINER_HEIGHT);

        expect(px.x).toBeCloseTo(0);
        expect(px.y).toBeCloseTo(120);
    });

    it('keeps finite values for tiny containers', () => {
        const layout: WidgetLayout = {
            anchorX: 'left',
            anchorY: 'top',
            x: 50,
            y: 50,
            w: 50,
            h: 50,
            rotation: 0,
            adapt: 'fixed',
            order: 1,
        };

        const px = pxFromLayout(layout, 10, 10);

        expect(Number.isFinite(px.x)).toBe(true);
        expect(Number.isFinite(px.y)).toBe(true);
        expect(Number.isFinite(px.w)).toBe(true);
        expect(Number.isFinite(px.h)).toBe(true);
    });
});
