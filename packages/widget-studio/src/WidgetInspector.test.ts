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
        });
        expect(createWidgetInspectorOperation(
            updated,
            'animation.animatedProperties',
            ['unsupported-property'],
        )).toBeNull();
    });
});
