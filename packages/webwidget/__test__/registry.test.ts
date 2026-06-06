import { describe, expect, it } from 'vitest';

import { createWidgetRegistry, registerWidgetRenderer, resolveWidgetRenderer, WidgetKinds } from '../src/engine/model/widget';
import { resolveWidgetSettingsSchema } from '../src/runtime/schema';
import { DEFAULT_CLOCK_WIDGET_PROPS } from '../src/components/clock';

describe('overlay widget registry', () => {
    it('registers and resolves renderer by kind', () => {
        const renderer = () => null;
        const registry = createWidgetRegistry();
        const updated = registerWidgetRenderer(registry, WidgetKinds.TEXT, renderer);

        expect(resolveWidgetRenderer(updated, WidgetKinds.TEXT)).toBe(renderer);
    });

    it('returns renderer for registered widget', () => {
        const registry = createWidgetRegistry();

        expect(resolveWidgetRenderer(registry, WidgetKinds.IFRAME)).not.toBeNull();
    });

    it('builds widget settings schema with page-based structure', async () => {
        const schema = await resolveWidgetSettingsSchema(WidgetKinds.TEXT);

        expect(schema).not.toBeNull();
        expect(schema).toBeTruthy();

        const basicFields = (schema || []).filter((field) => field.page === 'basic');
        expect(basicFields.map((field) => field.key)).toEqual(['label', 'locked', 'autoHide', 'anchorX', 'anchorY', 'adapt']);

        const styleFields = (schema || []).filter((field) => field.page === 'style');
        expect(styleFields.map((field) => field.key)).toEqual(['opacity', 'backgroundColor', 'backgroundEffect', 'backgroundImageUrl', 'border', 'shadowRadius', 'shadowColor']);

        const widgetFields = (schema || []).filter((field) => field.page === 'widget');
        expect(widgetFields.map((field) => field.key)).toEqual(['text', 'font', 'color', 'strokeColor', 'strokeWidth', 'textShadowColor', 'textShadowRadius', 'align', 'marquee', 'marqueeSpeed', 'marqueeDirection']);
    });

    it('builds clock settings schema with time and date font fields', async () => {
        const schema = await resolveWidgetSettingsSchema(WidgetKinds.CLOCK);

        expect(schema).not.toBeNull();
        const clockFields = (schema || []).filter((field) => field.page === 'widget');
        expect(clockFields.map((field) => field.key)).toEqual([
            'layout',
            'displayOrder',
            'timeFormat',
            'amPmFormat',
            'showSeconds',
            'dateFormat',
            'showYear',
            'weekdayFormat',
            'weekdayPlacement',
            'digitFormat',
            'color',
            'textShadowColor',
            'textShadowRadius',
            'timeFont',
            'dateFont',
            'dateGap',
            'timeAnimation',
            'timeAnimationDuration',
        ]);

        expect(DEFAULT_CLOCK_WIDGET_PROPS.timeFont).toContain('Arial');
        expect(DEFAULT_CLOCK_WIDGET_PROPS.dateFont).toContain('Arial');
    });

    it('builds html settings schema with editor field', async () => {
        const schema = await resolveWidgetSettingsSchema(WidgetKinds.HTML);

        expect(schema).not.toBeNull();
        const htmlFields = (schema || []).filter((field) => field.page === 'widget');
        expect(htmlFields.map((field) => field.key)).toEqual(['html']);
        expect(htmlFields.find((field) => field.key === 'html')?.type).toBe('editor');
    });

    it('builds iframe settings schema with url field', async () => {
        const schema = await resolveWidgetSettingsSchema(WidgetKinds.IFRAME);

        expect(schema).not.toBeNull();
        const iframeFields = (schema || []).filter((field) => field.page === 'widget');
        expect(iframeFields.map((field) => field.key)).toEqual(['url', 'sandbox']);
        expect(iframeFields.find((field) => field.key === 'url')?.type).toBe('string');
    });

    it('builds live2d settings schema with model tree select', async () => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = (async () => new Response(JSON.stringify({
            ok: true,
            models: [
                {
                    relativePath: 'A/runtime/a.model3.json',
                    rawUrl: 'https://raw.githubusercontent.com/Eikanya/Live2d-model/master/A/runtime/a.model3.json',
                    fallbackUrl: '/api/live2d/assets/A/runtime/a.model3.json',
                },
            ],
        }), { status: 200 })) as typeof fetch;

        try {
            const schema = await resolveWidgetSettingsSchema(WidgetKinds.LIVE2D);
            expect(schema).not.toBeNull();

            const live2dFields = (schema || []).filter((field) => field.page === 'widget');
            const modelPathField = live2dFields.find((field) => field.key === 'modelPath');
            const scaleField = live2dFields.find((field) => field.key === 'scale');
            const renderPrecisionField = live2dFields.find((field) => field.key === 'renderPrecision');

            expect(modelPathField?.type).toBe('treeSelect');
            expect(scaleField?.type).toBe('slider');
            expect(renderPrecisionField?.type).toBe('slider');
            if (modelPathField?.type === 'treeSelect') {
                const treeData = modelPathField.meta?.['treeData'];
                expect(treeData.length).toBeGreaterThan(0);
                const first = treeData[0];
                expect(first?.title).toBeTruthy();
                if (first?.children?.length) {
                    expect(first.selectable).toBe(false);
                }
            }
        } finally {
            globalThis.fetch = originalFetch;
        }
    });
});
