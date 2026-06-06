import { describe, expect, it } from 'vitest';

import { diffObjects, deepMerge } from '@webwidget';
import type { WidgetModel } from '@webwidget';

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

describe('diffObjects', () => {
    it('returns null when objects are equal', () => {
        const widget = createWidget();
        expect(diffObjects(widget, widget)).toBeNull();
    });

    it('detects nested style changes', () => {
        const old = createWidget();
        const next = createWidget();
        next.style.opacity = 0.42;
        const patch = diffObjects(old, next);
        expect(patch).toEqual({ style: { opacity: 0.42 } });
    });

    it('detects nested layout changes', () => {
        const old = createWidget();
        const next = createWidget();
        next.layout.anchorX = 'center';
        next.layout.anchorY = 'center';
        next.layout.adapt = 'stretch';
        const patch = diffObjects(old, next);
        expect(patch).toEqual({ layout: { anchorX: 'center', anchorY: 'center', adapt: 'stretch' } });
    });
});

describe('deepMerge', () => {
    it('merges nested objects without overwriting siblings', () => {
        const target = createWidget();
        const source = { style: { opacity: 0.5 } };
        const result = deepMerge(target as any, source);
        expect(result['style']['opacity']).toBe(0.5);
        expect(result['style']['borderRadius']).toBe('8px');
    });

    it('preserves layout when only style changes', () => {
        const target = createWidget();
        const source = { style: { opacity: 0.5 } };
        const result = deepMerge(target as any, source);
        expect(result['layout']['anchorX']).toBe('left');
        expect(result['layout']['w']).toBe(30);
    });
});
