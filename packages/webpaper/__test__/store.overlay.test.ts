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
            transform: 'translate(0px, 0px) rotate(0deg)',
            width: '100px',
            height: '60px',
            borderRadius: '0px',
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
                        transform: 'translate(120px, 160px) rotate(25deg)',
                        width: '240px',
                        height: '120px',
                        borderRadius: '12px',
                    },
                },
            ],
            activeWidgetId: 'a',
        };

        const next = overlayReducer(state, {
            type: 'copy-widget',
            widgetId: 'a',
            style: {
                transform: 'translate(120px, 160px) rotate(25deg)',
                width: '240px',
                height: '120px',
                borderRadius: '12px',
            },
        });

        expect(next.widgets).toHaveLength(2);
        expect(next.widgets[1]?.style).toEqual({
            transform: 'translate(170px, 210px) rotate(25deg)',
            width: '240px',
            height: '120px',
            borderRadius: '12px',
        });
        expect(next.widgets[1]?.id).not.toBe('a');
        expect(next.activeWidgetId).toBe(next.widgets[1]?.id || null);
    });

    it('copies widget from provided runtime transform payload', () => {
        const state = createState(['a']);
        const next = overlayReducer(state, {
            type: 'copy-widget',
            widgetId: 'a',
            style: {
                transform: 'translate(300px, 400px) rotate(37deg)',
                width: '220px',
                height: '140px',
                borderRadius: '6px',
            },
        });

        expect(next.widgets[1]?.style).toEqual({
            transform: 'translate(350px, 450px) rotate(37deg)',
            width: '220px',
            height: '140px',
            borderRadius: '6px',
        });
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
                        transform: 'translate(0px, 0px) rotate(0deg)',
                        width: '320px',
                        height: '200px',
                        borderRadius: '0px',
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
