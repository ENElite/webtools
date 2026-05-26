
import { CLOCK_WIDGET_SETTINGS_SCHEMA } from '../components/clock';
import { IMAGE_WIDGET_SETTINGS_SCHEMA } from '../components/image';
import { VIDEO_WIDGET_SETTINGS_SCHEMA } from '../components/video';
import { TEXT_WIDGET_SETTINGS_SCHEMA } from '../components/text';
import { HTML_WIDGET_SETTINGS_SCHEMA } from '../components/html';
import { IFRAME_WIDGET_SETTINGS_SCHEMA } from '../components/iframe';
import { LIVE2D_WIDGET_SETTINGS_SCHEMA } from '../components/live2d';
import type {
    WidgetKind,
} from '../engine/model';

import type { InspectorSchema } from '../engine/editor';

export type WidgetSettingsSchema = InspectorSchema;

const WIDGET_BASE_SETTINGS_SCHEMA: InspectorSchema = [
    {
        key: 'label',
        label: '组件名称',
        type: 'string',
        page: 'basic',
        order: 100,
        bind: 'label',
    },
    {
        key: 'locked',
        label: '锁定变换',
        type: 'switch',
        page: 'basic',
        order: 200,
        bind: 'locked',
    },
    {
        key: 'autoHide',
        label: '自动隐藏',
        type: 'switch',
        page: 'basic',
        order: 300,
        bind: 'autoHide',
    },
    {
        key: 'anchorX',
        label: '水平锚点',
        type: 'enum',
        page: 'basic',
        order: 400,
        bind: 'layout.anchorX',
        meta: {
            options: [
                { label: '左', value: 'left' },
                { label: '中', value: 'center' },
                { label: '右', value: 'right' },
            ],
        },
    },
    {
        key: 'anchorY',
        label: '垂直锚点',
        type: 'enum',
        page: 'basic',
        order: 500,
        bind: 'layout.anchorY',
        meta: {
            options: [
                { label: '上', value: 'top' },
                { label: '中', value: 'center' },
                { label: '下', value: 'bottom' },
            ],
        },
    },
    {
        key: 'adapt',
        label: '适配策略',
        type: 'enum',
        page: 'basic',
        order: 600,
        bind: 'layout.adapt',
        meta: {
            options: [
                { label: '固定', value: 'fixed' },
                { label: '拉伸', value: 'stretch' },
            ],
        },
    },
];

export const WIDGET_ANIMATION_SETTINGS_SCHEMA: InspectorSchema = [
    {
        key: 'animation',
        label: '动画',
        type: 'animationSlots',
        page: 'animation',
        order: 100,
        bind: 'animation',
    },
];

export const WIDGET_STYLE_SETTINGS_SCHEMA: InspectorSchema = [
    {
        key: 'opacity',
        label: '透明度',
        type: 'number',
        page: 'style',
        order: 100,
        bind: 'style.opacity',
        meta: { min: 0, max: 1, step: 0.01 },
    },
    {
        key: 'backgroundColor',
        label: '背景颜色',
        type: 'color',
        page: 'style',
        order: 200,
        bind: 'style.backgroundColor',
        meta: { alpha: true },
    },
    {
        key: 'backgroundEffect',
        label: '背景效果',
        type: 'enum',
        page: 'style',
        order: 300,
        bind: 'style.backgroundEffect',
        meta: {
            options: [
                { label: '模糊', value: 'blur' },
                { label: '图片', value: 'image' },
                { label: '无效果', value: 'none' },
            ],
        },
    },
    {
        key: 'backgroundImageUrl',
        label: '背景图片',
        type: 'image',
        page: 'style',
        order: 400,
        bind: 'style.backgroundImageUrl',
        visibleWhen: {
            field: 'style.backgroundEffect',
            equals: 'image',
        },
        meta: { placeholder: '输入图片 URL，或拖拽/选择本地图片' },
    },
    {
        key: 'border',
        label: '边框',
        type: 'border',
        page: 'style',
        order: 500,
        bind: ['style.outline', 'style.borderRadius', 'style.outlineOffset'],
    },
    {
        key: 'shadowRadius',
        label: '阴影半径',
        type: 'number',
        page: 'style',
        order: 600,
        bind: 'style.shadowRadius',
        meta: { min: 0, max: 100, step: 1 },
    },
    {
        key: 'shadowColor',
        label: '阴影颜色',
        type: 'color',
        page: 'style',
        order: 700,
        bind: 'style.shadowColor',
        meta: { alpha: true },
    },
];

const WIDGET_SETTINGS_SCHEMAS: Partial<Record<WidgetKind, InspectorSchema>> = {
    clock: CLOCK_WIDGET_SETTINGS_SCHEMA,
    image: IMAGE_WIDGET_SETTINGS_SCHEMA,
    video: VIDEO_WIDGET_SETTINGS_SCHEMA,
    text: TEXT_WIDGET_SETTINGS_SCHEMA,
    html: HTML_WIDGET_SETTINGS_SCHEMA,
    iframe: IFRAME_WIDGET_SETTINGS_SCHEMA,
    live2d: LIVE2D_WIDGET_SETTINGS_SCHEMA,
};

export function resolveWidgetSettingsSchema(kind: WidgetKind): InspectorSchema | null {
    const schema = WIDGET_SETTINGS_SCHEMAS[kind];
    if (!schema) {
        return null;
    }
    return [
        ...WIDGET_BASE_SETTINGS_SCHEMA,
        ...WIDGET_STYLE_SETTINGS_SCHEMA,
        ...WIDGET_ANIMATION_SETTINGS_SCHEMA,
        ...schema,
    ];
}
