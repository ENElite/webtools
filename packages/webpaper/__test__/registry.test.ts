import { describe, expect, it } from 'vitest';

import { createWidgetRegistry, registerWidgetRenderer, resolveWidgetRenderer } from '@/features/overlay/registry';
import { resolveWidgetSettingsSchema } from '@/features/overlay/settings/registry';

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

    it('builds widget settings schema with section dividers', () => {
        const schema = resolveWidgetSettingsSchema('text');

        expect(schema).not.toBeNull();
        expect(schema?.[0]).toEqual({ type: 'divider', label: '基本属性' });
        const attrGroup = (schema || []).slice(1).filter((field) => field.type !== 'divider').slice(0, 8);
        expect(attrGroup.map((field) => field.key)).toEqual(['label', 'locked', 'autoHide', 'width', 'height', 'x', 'y', 'rotation']);

        const styleDividerIndex = (schema || []).findIndex((field) => field.type === 'divider' && field.label === '样式设置');
        const componentDividerIndex = (schema || []).findIndex((field) => field.type === 'divider' && field.label === '组件设置');

        expect(styleDividerIndex).toBeGreaterThan(0);
        expect(componentDividerIndex).toBeGreaterThan(styleDividerIndex);

        const styleGroup = (schema || []).slice((styleDividerIndex + 1), componentDividerIndex).filter((field) => field.type !== 'divider');
        expect(styleGroup.map((field) => field.key)).toEqual(['backgroundColor', 'backgroundEffect', 'backgroundImageUrl', 'borderColor', 'borderWidth', 'borderStyle', 'shadowRadius', 'shadowColor']);

        const textGroup = (schema || []).slice((componentDividerIndex + 1)).filter((field) => field.type !== 'divider');
        expect(textGroup.map((field) => field.key)).toEqual(['text', 'fontSize', 'fontWeight', 'color', 'align']);
    });

    it('builds html settings schema with editor field', () => {
        const schema = resolveWidgetSettingsSchema('html');

        expect(schema).not.toBeNull();
        const componentDividerIndex = (schema || []).findIndex((field) => field.type === 'divider' && field.label === '组件设置');
        expect(componentDividerIndex).toBeGreaterThan(0);

        const htmlGroup = (schema || []).slice((componentDividerIndex + 1)).filter((field) => field.type !== 'divider');
        expect(htmlGroup.map((field) => field.key)).toEqual(['html']);
        expect(htmlGroup.find((field) => field.key === 'html')?.type).toBe('editor');
    });

    it('builds iframe settings schema with url field', () => {
        const schema = resolveWidgetSettingsSchema('iframe');

        expect(schema).not.toBeNull();
        const componentDividerIndex = (schema || []).findIndex((field) => field.type === 'divider' && field.label === '组件设置');
        expect(componentDividerIndex).toBeGreaterThan(0);

        const iframeGroup = (schema || []).slice((componentDividerIndex + 1)).filter((field) => field.type !== 'divider');
        expect(iframeGroup.map((field) => field.key)).toEqual(['url', 'sandbox']);
        expect(iframeGroup.find((field) => field.key === 'url')?.type).toBe('string');
    });
});
