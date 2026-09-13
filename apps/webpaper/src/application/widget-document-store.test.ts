import { createWidgetCatalog, createWidgetEngine } from '@webtools/widget-core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { loadWidgetDocument, saveWidgetDocument, type KeyValueStorage } from './widget-document-store';

function memoryStorage(): KeyValueStorage {
    const values = new Map<string, string>();
    return {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
    };
}

const catalog = createWidgetCatalog([{
    kind: 'text',
    label: 'Text',
    propsSchema: z.object({ text: z.string() }),
    defaultProps: { text: 'hello' },
}]);

describe('widget document storage', () => {
    it('round-trips a versioned document through its owning catalog', () => {
        const storage = memoryStorage();
        const engine = createWidgetEngine({
            catalog,
            clock: () => 1,
            idGenerator: (scope) => scope,
        });
        engine.dispatch({ type: 'widget.add', widget: { kind: 'text' } });

        saveWidgetDocument(storage, engine.getSnapshot().document);
        expect(loadWidgetDocument(storage, catalog)).toEqual({
            kind: 'loaded',
            document: engine.getSnapshot().document,
        });
    });

    it('reports incompatible data instead of leaking it into runtime state', () => {
        const storage: KeyValueStorage = {
            getItem: () => '{"schemaVersion":0}',
            setItem: () => undefined,
        };
        expect(loadWidgetDocument(storage, catalog).kind).toBe('invalid');
    });
});
