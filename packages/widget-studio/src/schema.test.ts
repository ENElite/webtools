import { describe, expect, it } from 'vitest';

import { createWidgetInspectorCatalog } from './schema';

describe('widget inspector catalog', () => {
    it('adds common basic, layout, style, and animation pages to every plugin schema', () => {
        const catalog = createWidgetInspectorCatalog([{
            kind: 'test-widget',
            schema: {
                fields: [{
                    key: 'content',
                    label: '内容',
                    path: 'props.content',
                    control: 'string',
                }],
            },
        }]);
        const schema = catalog.get('test-widget').schema;

        expect(schema.pages?.map((page) => page.key)).toEqual([
            'basic',
            'layout',
            'style',
            'animation',
            'main',
        ]);
        expect(schema.fields.map((field) => field.path)).toEqual(expect.arrayContaining([
            'label',
            'locked',
            'autoHide',
            'layout.anchorX',
            'layout.anchorY',
            'layout.adapt',
            'style.opacity',
            'style.backgroundColor',
            'style.backgroundEffect',
            'style.backgroundImageUrl',
            'style.outline',
            'style.borderRadius',
            'style.outlineOffset',
            'style.shadowRadius',
            'style.shadowColor',
            'style.overflow',
            'animation.easing',
            'animation.duration',
            'animation.delay',
            'animation.animatedProperties',
            'animation.entry.effect',
            'animation.entry.direction',
            'animation.entry.duration',
            'animation.entry.delay',
            'animation.entry.easing',
            'props.content',
        ]));
        expect(schema.fields
            .filter((field) => field.page === 'layout')
            .map(({ label, path, control }) => ({ label, path, control })))
            .toEqual([
                { label: '水平锚点', path: 'layout.anchorX', control: 'enum' },
                { label: '垂直锚点', path: 'layout.anchorY', control: 'enum' },
                { label: '适配方式', path: 'layout.adapt', control: 'enum' },
            ]);
    });

    it('lets a plugin override a common field without rendering it twice', () => {
        const catalog = createWidgetInspectorCatalog([{
            kind: 'test-widget',
            schema: {
                pages: [{ key: 'style', label: '插件样式' }],
                fields: [{
                    key: 'plugin-opacity',
                    label: '插件透明度',
                    path: 'style.opacity',
                    control: 'number',
                    page: 'style',
                }],
            },
        }]);
        const schema = catalog.get('test-widget').schema;

        expect(schema.fields.filter((field) => field.path === 'style.opacity')).toEqual([
            expect.objectContaining({ key: 'plugin-opacity' }),
        ]);
        expect(schema.pages?.find((page) => page.key === 'style')).toEqual({
            key: 'style',
            label: '插件样式',
            order: -200,
        });
    });
});
