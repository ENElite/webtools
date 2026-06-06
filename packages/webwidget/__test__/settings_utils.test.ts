import { describe, expect, it } from 'vitest';

import { diffObjects, deepMerge } from '../src/engine/editor/applyChange';
import type { WidgetModel } from '../src/engine/model';

function createWidget(): WidgetModel {
    return {
        id: 'widget-1',
        kind: 'text' as any,
        label: '文本组件',
        props: {
            text: 'hello',
        },
        style: {
            outline: '0px solid #ffffff',
            outlineOffset: '0px',
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
            order: 1,
        },
    };
}

describe('diffObjects', () => {
    it('returns null when objects are equal', () => {
        const widget = createWidget();
        expect(diffObjects(widget, widget)).toBeNull();
    });

    it('detects top-level changes', () => {
        const old = createWidget();
        const next = createWidget();
        next.label = '新名称';
        const patch = diffObjects(old, next);
        expect(patch).toEqual({ label: '新名称' });
    });

    it('detects nested style changes', () => {
        const old = createWidget();
        const next = createWidget();
        next.style.opacity = 0.5;
        next.style.backgroundColor = 'red';
        const patch = diffObjects(old, next);
        expect(patch).toEqual({ style: { opacity: 0.5, backgroundColor: 'red' } });
    });

    it('detects nested layout changes', () => {
        const old = createWidget();
        const next = createWidget();
        next.layout.anchorX = 'center';
        const patch = diffObjects(old, next);
        expect(patch).toEqual({ layout: { anchorX: 'center' } });
    });

    it('detects props changes', () => {
        const old = createWidget();
        const next = createWidget();
        next.props['text'] = 'world';
        const patch = diffObjects(old, next);
        expect(patch).toEqual({ props: { text: 'world' } });
    });
});

describe('deepMerge', () => {
    it('merges nested objects without overwriting siblings', () => {
        const target = createWidget();
        const source = { style: { opacity: 0.5 } };
        const result = deepMerge(target as any, source);
        expect(result['style']['opacity']).toBe(0.5);
        expect(result['style']['outline']).toBe('0px solid #ffffff');
        expect(result['style']['borderRadius']).toBe('8px');
    });

    it('replaces primitive values', () => {
        const target = { a: 1, b: 2 };
        const source = { a: 10 };
        const result = deepMerge(target, source);
        expect(result).toEqual({ a: 10, b: 2 });
    });

    it('replaces arrays entirely', () => {
        const target = { arr: [1, 2, 3] };
        const source = { arr: [4, 5] };
        const result = deepMerge(target, source);
        expect(result['arr']).toEqual([4, 5]);
    });
});
