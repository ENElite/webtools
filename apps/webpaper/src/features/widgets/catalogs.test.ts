import { describe, expect, it } from 'vitest';

import {
    createBuiltInWidgetCatalogs,
    definitions,
    inspectors,
    views,
} from './index';

const EXPECTED_KINDS = ['text', 'clock', 'image', 'video', 'iframe', 'html', 'live2d'];

describe('WebPaper built-in widgets', () => {
    it('keeps definition, view and inspector kinds aligned', () => {
        expect(definitions.map(({ kind }) => kind)).toEqual(EXPECTED_KINDS);
        expect(views.map(({ kind }) => kind)).toEqual(EXPECTED_KINDS);
        expect(inspectors.map(({ kind }) => kind)).toEqual(EXPECTED_KINDS);

        const catalogs = createBuiltInWidgetCatalogs();
        expect(catalogs.definitions.kinds).toEqual(EXPECTED_KINDS);
        expect(catalogs.views.kinds).toEqual(EXPECTED_KINDS);
        expect(catalogs.inspectors.kinds).toEqual(EXPECTED_KINDS);
    });

    it('parses every default props object with its owning Zod schema', () => {
        for (const definition of definitions) {
            const defaults = typeof definition.defaultProps === 'function'
                ? definition.defaultProps()
                : definition.defaultProps;

            expect(definition.propsSchema.safeParse(defaults).success, definition.kind).toBe(true);
        }
    });

    it('registers the real Live2D runtime with explicit model and layout defaults', () => {
        const catalogs = createBuiltInWidgetCatalogs();
        const definition = catalogs.definitions.get('live2d');
        const defaults = catalogs.definitions.createProps('live2d');

        expect(definition.label).toBe('Live2D');
        expect(defaults['source']).toBe('builtin');
        expect(defaults['modelPath']).toMatch(/\.model3\.json$/);
        expect(definition.defaultLayout).toBeTypeOf('function');
    });
});
