import { describe, expect, it } from 'vitest';

import { splitSettingsValues } from '@/features/overlay/settings/settings_utils';
import { pxFromLayout } from '@/features/overlay/transform_utils';
import type { WidgetModel } from '@/features/overlay/types';

function createWidget(): WidgetModel {
    return {
        id: 'widget-1',
        kind: 'text',
        label: '文本组件',
        props: {
            text: 'hello',
        },
        style: {
            borderRadius: '8px',
            opacity: 1,
        },
        layout: {
            anchorX: 'left',
            anchorY: 'top',
            adapt: 'fixed',
            x: 10,
            y: 20,
            w: 30,
            h: 40,
            rotation: 0,
        },
    };
}

describe('splitSettingsValues', () => {
    it('keeps opacity in style and preserves the rendered position when anchor changes', () => {
        const widget = createWidget();
        const overlayBounds = { width: 1000, height: 600 };
        const beforePx = pxFromLayout(widget.layout, overlayBounds.width, overlayBounds.height);
        const next = splitSettingsValues(
            {
                ...widget.props,
                anchorX: 'center',
                anchorY: 'center',
                adapt: 'stretch',
                borderRadius: 8,
                opacity: 0.42,
            },
            widget,
            overlayBounds,
        );

        expect(next.style.opacity).toBe(0.42);
        expect(next.layout.anchorX).toBe('center');
        expect(next.layout.anchorY).toBe('center');
        expect(next.layout.adapt).toBe('stretch');
        expect(next.layout.w).toBe(30);
        expect(next.layout.h).toBe(40);
        expect(next.layout.rotation).toBe(0);
        expect(next.layout).toBeDefined();

        const afterPx = pxFromLayout(next.layout, overlayBounds.width, overlayBounds.height);
        expect(afterPx).toEqual(beforePx);
        expect(next.props.opacity).toBeUndefined();
        expect(next.props.color).toBeUndefined();
    });

    it.each([
        {
            name: 'left-top keeps zero offsets',
            anchorX: 'left',
            anchorY: 'top',
        },
        {
            name: 'left-bottom shifts y to negative full height',
            anchorX: 'left',
            anchorY: 'bottom',
        },
        {
            name: 'center-center shifts both axes by half container',
            anchorX: 'center',
            anchorY: 'center',
        },
        {
            name: 'right-center shifts x full width and y half height',
            anchorX: 'right',
            anchorY: 'center',
        },
        {
            name: 'right-bottom shifts both axes by full container',
            anchorX: 'right',
            anchorY: 'bottom',
        },
    ] as const)('preserves position when anchor changes: $name', ({ anchorX, anchorY }) => {
        const widget = createWidget();
        const overlayBounds = { width: 1000, height: 600 };
        const beforePx = pxFromLayout(widget.layout, overlayBounds.width, overlayBounds.height);
        const next = splitSettingsValues(
            {
                ...widget.props,
                anchorX,
                anchorY,
                adapt: 'fixed',
            },
            widget,
            overlayBounds
        );

        expect(next.layout?.anchorX).toBe(anchorX);
        expect(next.layout?.anchorY).toBe(anchorY);
        expect(next.layout?.w).toBe(widget.layout.w);
        expect(next.layout?.h).toBe(widget.layout.h);
        expect(next.layout?.rotation).toBe(widget.layout.rotation);
        expect(next.layout).toBeDefined();
        const afterPx = pxFromLayout(next.layout, overlayBounds.width, overlayBounds.height);
        expect(afterPx).toEqual(beforePx);
    });
});
