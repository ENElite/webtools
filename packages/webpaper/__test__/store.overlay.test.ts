import { describe, expect, it } from 'vitest';

import { overlayReducer } from '@/features/overlay/reducer';
import type { OverlayState, WidgetModel } from '@/features/overlay/types';

function createWidget(id: string): WidgetModel {
    return {
        id,
        label: id,
        kind: 'text',
        props: { text: id },
        style: {
            borderRadius: '0px',
        },
        layout: {
            anchorX: 'left',
            anchorY: 'top',
            x: 0,
            y: 0,
            w: 10,
            h: 6,
            rotation: 0,
            adapt: 'fixed',
        },
    };
}

function createState(ids: string[]): OverlayState {
    const widgets = ids.map((id) => createWidget(id));
    return {
        widgets,
        activeWidgetId: widgets[widgets.length - 1]?.id || null,
    };
}

describe('overlayReducer', () => {
    it('adds widget to top layer and sets active widget', () => {
        const state = createState(['a', 'b']);
        const next = overlayReducer(state, {
            type: 'add-widget',
            widget: createWidget('c'),
        });

        expect(next.widgets.map((widget) => widget.id)).toEqual(['a', 'b', 'c']);
        expect(next.activeWidgetId).toBe('c');
    });

    it('removes widget by id', () => {
        const state = createState(['a', 'b', 'c']);
        const next = overlayReducer(state, {
            type: 'remove-widget',
            widgetId: 'b',
        });

        expect(next.widgets.map((widget) => widget.id)).toEqual(['a', 'c']);
    });

    it('updates widget with partial patch', () => {
        const state = createState(['a']);
        const next = overlayReducer(state, {
            type: 'update-widget',
            widgetId: 'a',
            patch: {
                locked: true,
            },
        });

        expect(next.widgets[0]?.locked).toBe(true);
        expect(next.widgets[0]?.id).toBe('a');
    });

    it('moves widget up by one layer', () => {
        const state = createState(['a', 'b', 'c']);
        const next = overlayReducer(state, {
            type: 'move-widget-up',
            widgetId: 'b',
        });

        expect(next.widgets.map((widget) => widget.id)).toEqual(['a', 'c', 'b']);
    });

    it('moves widget down by one layer', () => {
        const state = createState(['a', 'b', 'c']);
        const next = overlayReducer(state, {
            type: 'move-widget-down',
            widgetId: 'b',
        });

        expect(next.widgets.map((widget) => widget.id)).toEqual(['b', 'a', 'c']);
    });

    it('moves widget to top layer', () => {
        const state = createState(['a', 'b', 'c']);
        const next = overlayReducer(state, {
            type: 'move-widget-to-top',
            widgetId: 'a',
        });

        expect(next.widgets.map((widget) => widget.id)).toEqual(['b', 'c', 'a']);
    });

    it('moves widget to bottom layer', () => {
        const state = createState(['a', 'b', 'c']);
        const next = overlayReducer(state, {
            type: 'move-widget-to-bottom',
            widgetId: 'c',
        });

        expect(next.widgets.map((widget) => widget.id)).toEqual(['c', 'a', 'b']);
    });

    it('copies widget to lower-right with transform preserved', () => {
        const state: OverlayState = {
            widgets: [
                {
                    id: 'a',
                    label: 'a',
                    kind: 'text',
                    props: { text: 'a' },
                    style: {
                        borderRadius: '12px',
                    },
                    layout: {
                        anchorX: 'left',
                        anchorY: 'top',
                        x: 12,
                        y: 16,
                        w: 24,
                        h: 12,
                        rotation: 25,
                        adapt: 'fixed',
                    },
                },
            ],
            activeWidgetId: 'a',
        };

        const next = overlayReducer(state, {
            type: 'copy-widget',
            widgetId: 'a',
        });

        expect(next.widgets).toHaveLength(2);
        const copiedWidget = next.widgets[1];
        expect(copiedWidget).toBeDefined();
        expect(copiedWidget?.id).not.toBe('a');
        // Layout should be offset by +2% in x and y
        expect(copiedWidget?.layout?.x).toBe(14);
        expect(copiedWidget?.layout?.y).toBe(18);
        expect(copiedWidget?.layout?.w).toBe(24);
        expect(copiedWidget?.layout?.h).toBe(12);
        expect(copiedWidget?.layout?.rotation).toBe(25);
        expect(copiedWidget?.style.borderRadius).toBe('12px');
        expect(next.activeWidgetId).toBe(next.widgets[1]?.id || null);
    });

    it('copies widget from provided layout payload', () => {
        const state = createState(['a']);
        const originalWidget = state.widgets[0];
        if (!originalWidget) {
            throw new Error('Original widget not found');
        }

        const customLayout = {
            anchorX: 'left' as const,
            anchorY: 'top' as const,
            x: 35,
            y: 45,
            w: 22,
            h: 14,
            rotation: 37,
            adapt: 'fixed' as const,
        };

        const next = overlayReducer(state, {
            type: 'copy-widget',
            widgetId: 'a',
            layout: customLayout,
        });

        expect(next.widgets[1]).toBeDefined();
        const copiedWidget = next.widgets[1];
        expect(copiedWidget?.layout).toEqual(customLayout);
        expect(copiedWidget?.style.borderRadius).toBe('0px');
    });

    it('updates iframe widget html through patch props', () => {
        const state: OverlayState = {
            widgets: [
                {
                    id: 'frame-1',
                    label: 'frame-1',
                    kind: 'iframe',
                    props: {
                        html: '<p>old</p>',
                    },
                    style: {
                        borderRadius: '0px',
                    },
                    layout: {
                        anchorX: 'left',
                        anchorY: 'top',
                        x: 0,
                        y: 0,
                        w: 32,
                        h: 20,
                        rotation: 0,
                        adapt: 'fixed',
                    },
                },
            ],
            activeWidgetId: 'frame-1',
        };

        const next = overlayReducer(state, {
            type: 'update-widget',
            widgetId: 'frame-1',
            patch: {
                props: {
                    html: '<p>new</p>',
                },
            },
        });

        expect(next.widgets[0]?.props['html']).toBe('<p>new</p>');
    });

});
