import {
    createWidgetCatalog,
    createWidgetEngine,
    jsonObjectSchema,
} from '@webtools/widget-core';
import { describe, expect, it } from 'vitest';

import { createWidgetInspectorOperation } from './WidgetInspector';

const catalog = createWidgetCatalog([{
    kind: 'test-widget',
    label: 'Test widget',
    propsSchema: jsonObjectSchema,
    defaultProps: {},
}]);

describe('WidgetInspector operations', () => {
    it('dispatches validated animation changes through the widget engine', () => {
        const engine = createWidgetEngine({ catalog });
        engine.dispatch({ type: 'widget.add', widget: { kind: 'test-widget' } });
        const widget = engine.getSnapshot().document.widgets[0];
        expect(widget).toBeDefined();
        if (!widget) return;

        const duration = createWidgetInspectorOperation(widget, 'animation.duration', 0.8);
        expect(duration).toEqual(expect.objectContaining({
            type: 'widget.update',
            changes: { animation: expect.objectContaining({ duration: 0.8 }) },
        }));
        if (duration) engine.dispatch(duration);

        const updated = engine.getSnapshot().document.widgets[0];
        expect(updated?.animation.duration).toBe(0.8);
        if (!updated) return;
        const properties = createWidgetInspectorOperation(
            updated,
            'animation.animatedProperties',
            ['opacity', 'backgroundColor'],
        );
        if (properties) engine.dispatch(properties);

        expect(engine.getSnapshot().document.widgets[0]?.animation).toEqual({
            easing: 'ease-out',
            duration: 0.8,
            delay: 0,
            animatedProperties: ['opacity', 'backgroundColor'],
            entry: {
                effect: 'none',
                direction: 'up',
                duration: 0.45,
                delay: 0,
                easing: 'ease-out',
            },
        });
        expect(createWidgetInspectorOperation(
            updated,
            'animation.animatedProperties',
            ['unsupported-property'],
        )).toBeNull();
    });

    it('keeps validated geometry operations available to the canvas runtime', () => {
        const engine = createWidgetEngine({ catalog });
        engine.dispatch({ type: 'widget.add', widget: { kind: 'test-widget' } });
        const changes = [
            ['layout.x', 'x', 12],
            ['layout.y', 'y', -8],
            ['layout.w', 'w', 36],
            ['layout.h', 'h', 24],
            ['layout.rotation', 'rotation', 17],
        ] as const;

        for (const [path, key, next] of changes) {
            const widget = engine.getSnapshot().document.widgets[0];
            expect(widget).toBeDefined();
            if (!widget) return;
            const operation = createWidgetInspectorOperation(widget, path, next);
            expect(operation?.type).toBe('widget.layout');
            if (operation) engine.dispatch(operation);
            expect(engine.getSnapshot().document.widgets[0]?.layout[key]).toBe(next);
        }
    });

    it('dispatches complete entry animation settings without resetting style transitions', () => {
        const engine = createWidgetEngine({ catalog });
        engine.dispatch({
            type: 'widget.add',
            widget: {
                kind: 'test-widget',
                animation: { animatedProperties: ['opacity'], duration: 0.9 },
            },
        });
        const changes = [
            ['animation.entry.effect', 'slide'],
            ['animation.entry.direction', 'right'],
            ['animation.entry.duration', 0.65],
            ['animation.entry.delay', 0.15],
            ['animation.entry.easing', 'ease-in-out'],
        ] as const;

        for (const [path, next] of changes) {
            const widget = engine.getSnapshot().document.widgets[0];
            expect(widget).toBeDefined();
            if (!widget) return;
            const operation = createWidgetInspectorOperation(widget, path, next);
            expect(operation?.type).toBe('widget.update');
            if (operation) engine.dispatch(operation);
        }

        expect(engine.getSnapshot().document.widgets[0]?.animation).toEqual({
            easing: 'ease-out',
            duration: 0.9,
            delay: 0,
            animatedProperties: ['opacity'],
            entry: {
                effect: 'slide',
                direction: 'right',
                duration: 0.65,
                delay: 0.15,
                easing: 'ease-in-out',
            },
        });
    });
});
