import { describe, expect, it } from 'vitest';
import type { JsonObject, WidgetEntity } from '@webtools/widget-core';

import { createWidgetViewCatalog, defineWidgetView } from './catalog';

type LabelProps = JsonObject & { readonly label: string };

const labelView = defineWidgetView<LabelProps>({
    kind: 'label',
    View: ({ widget }) => <span>{widget.props.label}</span>,
});

const clockView = defineWidgetView({
    kind: 'clock',
    View: () => <time>12:00</time>,
});

describe('WidgetViewCatalog', () => {
    it('rejects duplicate kinds immediately', () => {
        expect(() => createWidgetViewCatalog([labelView, labelView]))
            .toThrow('Duplicate widget view: label');
    });

    it('keeps catalogs isolated and exposes immutable kind snapshots', () => {
        const labels = createWidgetViewCatalog([labelView]);
        const clocks = createWidgetViewCatalog([clockView]);

        expect(labels.kinds).toEqual(['label']);
        expect(clocks.kinds).toEqual(['clock']);
        expect(labels.has('clock')).toBe(false);
        expect(clocks.has('label')).toBe(false);
        expect(Object.isFrozen(labels.kinds)).toBe(true);
        expect(() => labels.get('clock')).toThrow('No widget view registered for "clock"');
    });

    it('preserves readiness metadata across the typed plugin boundary', () => {
        const resource = defineWidgetView<LabelProps>({
            kind: 'label',
            readinessKey: (widget) => `label:${widget.props.label}`,
            View: () => <span />,
        });
        const widget = {
            kind: 'label',
            props: { label: 'hello' },
        } as WidgetEntity<LabelProps>;

        expect(resource.readinessKey?.(widget)).toBe('label:hello');
    });
});
