import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import {
    createTransaction,
    createWidgetCatalog,
    createWidgetEngine,
    defineWidgetPlugin,
    parseWidgetDocument,
    type IdGenerator,
    type WidgetDocument,
    type WidgetEngine,
} from './index';

const textPlugin = defineWidgetPlugin({
    kind: 'text',
    label: 'Text',
    propsSchema: z.object({
        text: z.string(),
        fontSize: z.number().positive(),
    }).strict(),
    defaultProps: {
        text: 'Default',
        fontSize: 14,
    },
});

const catalog = createWidgetCatalog([textPlugin]);

function createTestEngine(): WidgetEngine {
    let widgetSequence = 0;
    const idGenerator: IdGenerator = (scope) =>
        scope === 'document' ? 'document-1' : `widget-${++widgetSequence}`;
    let timestamp = 1_000;
    return createWidgetEngine({
        catalog,
        idGenerator,
        clock: () => timestamp++,
    });
}

function addText(engine: WidgetEngine, id: string, text = id): void {
    engine.dispatch({
        type: 'widget.add',
        widget: { id, kind: 'text', props: { text } },
    });
}

describe('widget engine operations', () => {
    it('adds a catalog-backed widget with injected identity and defaults', () => {
        const engine = createTestEngine();
        const listener = vi.fn();
        engine.subscribe(listener);

        const result = engine.dispatch({
            type: 'widget.add',
            widget: { kind: 'text', props: { text: 'Hello' } },
        });

        expect(result.document.widgets).toEqual([
            expect.objectContaining({
                id: 'widget-1',
                kind: 'text',
                label: 'Text',
                props: { text: 'Hello', fontSize: 14 },
                animation: {
                    easing: 'ease-out',
                    duration: 0.3,
                    delay: 0,
                    animatedProperties: [],
                },
                locked: false,
                autoHide: false,
                layout: expect.objectContaining({ order: 1 }),
            }),
        ]);
        expect(result.events).toEqual([
            expect.objectContaining({
                type: 'widget.added',
                widgetId: 'widget-1',
                index: 0,
                revision: 1,
            }),
        ]);
        expect(result.transaction.operations[0]).toEqual(
            expect.objectContaining({ type: 'widget.restore', at: 0 }),
        );
        expect(result.inverse.operations).toEqual([
            { type: 'widget.remove', widgetId: 'widget-1' },
        ]);
        expect(engine.getSnapshot().canUndo).toBe(true);
        expect(listener).toHaveBeenCalledOnce();
    });

    it('merges plugin layout defaults before draft overrides', () => {
        const positionedCatalog = createWidgetCatalog([
            defineWidgetPlugin({
                ...textPlugin,
                kind: 'positioned-text',
                defaultLayout: {
                    anchorX: 'right',
                    anchorY: 'bottom',
                    x: -5,
                    y: -5,
                    w: 12,
                    h: 24,
                    adapt: 'fixed',
                },
            }),
        ]);
        const engine = createWidgetEngine({
            catalog: positionedCatalog,
            idGenerator: (scope) => scope === 'document' ? 'document-layout' : 'widget-layout',
            clock: () => 1_000,
        });

        engine.dispatch({
            type: 'widget.add',
            widget: { kind: 'positioned-text', layout: { w: 18 } },
        });

        expect(engine.getSnapshot().document.widgets[0]?.layout).toMatchObject({
            anchorX: 'right',
            anchorY: 'bottom',
            x: -5,
            y: -5,
            w: 18,
            h: 24,
            rotation: 0,
            adapt: 'fixed',
            order: 1,
        });
    });

    it('removes and restores a widget at its original position', () => {
        const engine = createTestEngine();
        addText(engine, 'a');
        addText(engine, 'b');
        addText(engine, 'c');
        engine.clearHistory();

        engine.dispatch({ type: 'widget.remove', widgetId: 'b' });
        expect(engine.getSnapshot().document.widgets.map((widget) => [widget.id, widget.layout.order]))
            .toEqual([['a', 1], ['c', 2]]);

        engine.undo();
        expect(engine.getSnapshot().document.widgets.map((widget) => [widget.id, widget.layout.order]))
            .toEqual([['a', 1], ['b', 2], ['c', 3]]);
    });

    it('updates entity fields and merges props through the plugin schema', () => {
        const engine = createTestEngine();
        addText(engine, 'a');

        const result = engine.dispatch({
            type: 'widget.update',
            widgetId: 'a',
            changes: {
                label: 'Greeting',
                props: { fontSize: 20 },
                style: { opacity: 0.5 },
                locked: true,
            },
        });

        expect(result.document.widgets[0]).toEqual(expect.objectContaining({
            label: 'Greeting',
            props: { text: 'a', fontSize: 20 },
            style: { opacity: 0.5 },
            locked: true,
        }));
        expect(result.events[0]).toEqual(expect.objectContaining({
            type: 'widget.updated',
            fields: ['label', 'props', 'style', 'locked'],
        }));
    });

    it('updates normalized animation settings and preserves them through undo and redo', () => {
        const engine = createTestEngine();
        addText(engine, 'animated');

        const result = engine.dispatch({
            type: 'widget.update',
            widgetId: 'animated',
            changes: {
                animation: {
                    easing: 'ease-in-out',
                    duration: 0.75,
                    delay: 0.1,
                    animatedProperties: ['opacity', 'backgroundColor'],
                },
            },
        });

        expect(result.document.widgets[0]?.animation).toEqual({
            easing: 'ease-in-out',
            duration: 0.75,
            delay: 0.1,
            animatedProperties: ['opacity', 'backgroundColor'],
        });
        expect(result.events[0]).toEqual(expect.objectContaining({
            type: 'widget.updated',
            fields: ['animation'],
        }));
        expect(engine.undo()?.document.widgets[0]?.animation).toEqual({
            easing: 'ease-out',
            duration: 0.3,
            delay: 0,
            animatedProperties: [],
        });
        expect(engine.redo()?.document.widgets[0]?.animation).toEqual(
            result.document.widgets[0]?.animation,
        );
    });

    it('changes layout without allowing order to bypass reorder', () => {
        const engine = createTestEngine();
        addText(engine, 'a');

        const result = engine.dispatch({
            type: 'widget.layout',
            widgetId: 'a',
            changes: { x: 22, y: -4, w: 55, rotation: 15 },
        });

        expect(result.document.widgets[0]?.layout).toEqual(expect.objectContaining({
            x: 22,
            y: -4,
            w: 55,
            rotation: 15,
            order: 1,
        }));
        expect(result.events[0]?.type).toBe('widget.layout-changed');

        const beforeInvalidChange = engine.getSnapshot();
        expect(() => engine.dispatch({
            type: 'widget.layout',
            widgetId: 'a',
            changes: { w: 0 },
        })).toThrow();
        expect(engine.getSnapshot()).toBe(beforeInvalidChange);
    });

    it('reorders widgets and maintains canonical contiguous order', () => {
        const engine = createTestEngine();
        addText(engine, 'a');
        addText(engine, 'b');
        addText(engine, 'c');

        const result = engine.dispatch({
            type: 'widget.reorder',
            widgetId: 'c',
            toIndex: 0,
        });

        expect(result.document.widgets.map((widget) => [widget.id, widget.layout.order]))
            .toEqual([['c', 1], ['a', 2], ['b', 3]]);
        expect(result.events[0]).toEqual(expect.objectContaining({
            type: 'widget.reordered',
            fromIndex: 2,
            toIndex: 0,
        }));
    });

    it('commits a batch once and rolls the whole transaction back atomically', () => {
        const engine = createTestEngine();
        const listener = vi.fn();
        engine.subscribe(listener);

        const result = engine.dispatch(createTransaction([
            { type: 'widget.add', widget: { id: 'a', kind: 'text' } },
            { type: 'widget.add', widget: { id: 'b', kind: 'text' } },
            { type: 'widget.update', widgetId: 'a', changes: { props: { text: 'Changed' } } },
        ], 'Create pair'));

        expect(result.document.revision).toBe(1);
        expect(result.events).toHaveLength(3);
        expect(listener).toHaveBeenCalledOnce();
        expect(result.document.widgets.map((widget) => widget.id)).toEqual(['a', 'b']);

        const undo = engine.undo();
        expect(undo?.document.widgets).toEqual([]);
        expect(undo?.document.revision).toBe(2);
        expect(engine.getSnapshot()).toMatchObject({ canUndo: false, canRedo: true });

        engine.redo();
        expect(engine.getSnapshot().document.widgets.map((widget) => widget.id)).toEqual(['a', 'b']);
        expect(engine.getSnapshot().document.widgets[0]?.props['text']).toBe('Changed');
    });

    it('does not partially commit an invalid batch', () => {
        const engine = createTestEngine();
        const before = engine.getSnapshot();

        expect(() => engine.dispatch(createTransaction([
            { type: 'widget.add', widget: { id: 'a', kind: 'text' } },
            { type: 'widget.remove', widgetId: 'missing' },
        ]))).toThrow('Widget not found: missing');

        expect(engine.getSnapshot()).toBe(before);
        expect(engine.getSnapshot().document.widgets).toEqual([]);
    });

    it('supports deterministic undo/redo and clears redo after a new dispatch', () => {
        const engine = createTestEngine();
        addText(engine, 'a');
        engine.dispatch({
            type: 'widget.layout',
            widgetId: 'a',
            changes: { x: 99 },
        });

        expect(engine.undo()?.document.widgets[0]?.layout.x).toBe(5);
        expect(engine.redo()?.document.widgets[0]?.layout.x).toBe(99);
        engine.undo();
        engine.dispatch({
            type: 'widget.update',
            widgetId: 'a',
            changes: { label: 'New label' },
        });
        expect(engine.getSnapshot().canRedo).toBe(false);
        expect(engine.redo()).toBeNull();
    });

    it('keeps documents, history, and subscriptions isolated per engine instance', () => {
        const first = createTestEngine();
        const second = createTestEngine();
        const firstListener = vi.fn();
        const secondListener = vi.fn();
        first.subscribe(firstListener);
        second.subscribe(secondListener);

        addText(first, 'only-first');

        expect(first.getSnapshot().document.widgets).toHaveLength(1);
        expect(second.getSnapshot().document.widgets).toHaveLength(0);
        expect(first.getSnapshot().canUndo).toBe(true);
        expect(second.getSnapshot().canUndo).toBe(false);
        expect(firstListener).toHaveBeenCalledOnce();
        expect(secondListener).not.toHaveBeenCalled();
    });
});

describe('persistent document validation', () => {
    const validDocument: WidgetDocument = {
        schemaVersion: 1,
        id: 'document',
        revision: 0,
        createdAt: 10,
        updatedAt: 10,
        widgets: [{
            id: 'a',
            kind: 'text',
            label: 'Text',
            props: { text: 'Hello', fontSize: 14 },
            style: {},
            animation: {
                easing: 'ease-out',
                duration: 0.3,
                delay: 0,
                animatedProperties: [],
            },
            layout: {
                anchorX: 'left',
                anchorY: 'top',
                x: 0,
                y: 0,
                w: 10,
                h: 10,
                rotation: 0,
                adapt: 'fixed',
                order: 1,
            },
            locked: false,
            autoHide: false,
        }],
    };

    it('normalizes legacy v1 documents that omit animation settings', () => {
        const widget = validDocument.widgets[0];
        expect(widget).toBeDefined();
        if (!widget) return;
        const { animation: _animation, ...legacyWidget } = widget;

        const parsed = parseWidgetDocument({
            ...validDocument,
            widgets: [legacyWidget],
        }, catalog);

        expect(parsed.widgets[0]?.animation).toEqual({
            easing: 'ease-out',
            duration: 0.3,
            delay: 0,
            animatedProperties: [],
        });
    });

    it('rejects malformed, non-canonical, and plugin-invalid documents', () => {
        expect(() => parseWidgetDocument({
            ...validDocument,
            schemaVersion: 2,
        }, catalog)).toThrow();

        expect(() => parseWidgetDocument({
            ...validDocument,
            widgets: [
                validDocument.widgets[0],
                { ...validDocument.widgets[0], layout: { ...validDocument.widgets[0]!.layout, order: 2 } },
            ],
        }, catalog)).toThrow('Duplicate widget id');

        expect(() => parseWidgetDocument({
            ...validDocument,
            widgets: [{
                ...validDocument.widgets[0],
                props: { text: 'Missing font size' },
            }],
        }, catalog)).toThrow();

        expect(() => createWidgetEngine({ catalog, document: { widgets: [] } })).toThrow();
    });
});
