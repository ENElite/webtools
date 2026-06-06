import { describe, expect, it } from 'vitest';

import { createWidgetRegistry, registerWidgetRenderer, resolveWidgetRenderer } from '@webwidget/src/engine/model/widget';
import { resolveWidgetSettingsSchema } from '@webwidget/src/runtime/schema';
import { DEFAULT_CLOCK_WIDGET_PROPS } from '@webwidget/src/components/clock';

describe('overlay widget registry', () => {
    it('registers and resolves renderer by kind', () => {
        const renderer = () => null;
        const registry = createWidgetRegistry();
        const updated = registerWidgetRenderer(registry, 'text', renderer);

        expect(resolveWidgetRenderer(updated, 'text')).toBe(renderer);
    });

    it('returns null when renderer is missing', () => {
        const registry = createWidgetRegistry();

        expect(resolveWidgetRenderer(registry, 'iframe')).toBeNull();
    });

    it('builds widget settings schema with section dividers', async () => {
        const schema = await resolveWidgetSettingsSchema('text');

        expect(schema).not.toBeNull();
        expect(schema?.[0]).toEqual({ type: 'divider', label: '基本设置' });
        const attrGroup = (schema || []).slice(1).filter((field) => field.type !== 'divider').slice(0, 6);
        expect(attrGroup.map((field) => field.key)).toEqual(['label', 'locked', 'autoHide', 'anchorX', 'anchorY', 'adapt']);

        const styleDividerIndex = (schema || []).findIndex((field) => field.type === 'divider' && field.label === '样式设置');
        const componentDividerIndex = (schema || []).findIndex((field) => field.type === 'divider' && field.label === '组件设置');

        expect(styleDividerIndex).toBeGreaterThan(0);
        expect(componentDividerIndex).toBeGreaterThan(styleDividerIndex);

        const styleGroup = (schema || []).slice((styleDividerIndex + 1), componentDividerIndex).filter((field) => field.type !== 'divider');
        expect(styleGroup.map((field) => field.key)).toEqual(['opacity', 'backgroundColor', 'backgroundEffect', 'backgroundImageUrl', 'borderColor', 'borderWidth', 'borderStyle', 'shadowRadius', 'shadowColor']);

        const textGroup = (schema || []).slice((componentDividerIndex + 1)).filter((field) => field.type !== 'divider');
        expect(textGroup.map((field) => field.key)).toEqual(['text', 'font', 'color', 'textShadowColor', 'textShadowRadius', 'align']);
    });

    it('builds clock settings schema with time and date font fields', async () => {
        const schema = await resolveWidgetSettingsSchema('clock');

        expect(schema).not.toBeNull();
        const componentDividerIndex = (schema || []).findIndex((field) => field.type === 'divider' && field.label === '组件设置');
        expect(componentDividerIndex).toBeGreaterThan(0);

        const clockGroup = (schema || []).slice((componentDividerIndex + 1)).filter((field) => field.type !== 'divider');
        expect(clockGroup.map((field) => field.key)).toEqual([
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
        ]);

        expect(DEFAULT_CLOCK_WIDGET_PROPS.timeFont).toContain('Arial');
        expect(DEFAULT_CLOCK_WIDGET_PROPS.dateFont).toContain('Arial');
    });

    it('builds html settings schema with editor field', async () => {
        const schema = await resolveWidgetSettingsSchema('html');

        expect(schema).not.toBeNull();
        const componentDividerIndex = (schema || []).findIndex((field) => field.type === 'divider' && field.label === '组件设置');
        expect(componentDividerIndex).toBeGreaterThan(0);

        const htmlGroup = (schema || []).slice((componentDividerIndex + 1)).filter((field) => field.type !== 'divider');
        expect(htmlGroup.map((field) => field.key)).toEqual(['html']);
        expect(htmlGroup.find((field) => field.key === 'html')?.type).toBe('editor');
    });

    it('builds iframe settings schema with url field', async () => {
        const schema = await resolveWidgetSettingsSchema('iframe');

        expect(schema).not.toBeNull();
        const componentDividerIndex = (schema || []).findIndex((field) => field.type === 'divider' && field.label === '组件设置');
        expect(componentDividerIndex).toBeGreaterThan(0);

        const iframeGroup = (schema || []).slice((componentDividerIndex + 1)).filter((field) => field.type !== 'divider');
        expect(iframeGroup.map((field) => field.key)).toEqual(['url', 'sandbox']);
        expect(iframeGroup.find((field) => field.key === 'url')?.type).toBe('string');
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
            const schema = await resolveWidgetSettingsSchema('live2d');
            expect(schema).not.toBeNull();

            const componentDividerIndex = (schema || []).findIndex((field) => field.type === 'divider' && field.label === '组件设置');
            const live2dGroup = (schema || []).slice((componentDividerIndex + 1)).filter((field) => field.type !== 'divider');
            const modelPathField = live2dGroup.find((field) => field.key === 'modelPath');
            const scaleField = live2dGroup.find((field) => field.key === 'scale');
            const renderPrecisionField = live2dGroup.find((field) => field.key === 'renderPrecision');

            expect(modelPathField?.type).toBe('treeSelect');
            expect(scaleField?.type).toBe('slider');
            expect(renderPrecisionField?.type).toBe('slider');
            if (modelPathField?.type === 'treeSelect') {
                expect(modelPathField.treeData.length).toBeGreaterThan(0);
                const first = modelPathField.treeData[0];
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
