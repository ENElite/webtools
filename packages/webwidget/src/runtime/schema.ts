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
import { WidgetKinds } from '../engine/model';

import type { BindPath, InspectorSchema } from '../engine/editor';

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
                { label: '固定尺寸', value: 'stick' },
                { label: '拉伸', value: 'stretch' },
                { label: '等比拉伸', value: 'stretch-ratio' },
            ],
        },
    },
];

export const WIDGET_ANIMATION_SETTINGS_SCHEMA: InspectorSchema = [
    {
        key: 'easing',
        label: '缓动曲线',
        type: 'enum',
        page: 'animation',
        order: 100,
        bind: 'animation.easing' as BindPath,
        meta: {
            default: 'ease-out',
            options: [
                { label: '缓出', value: 'ease-out' },
                { label: '缓入', value: 'ease-in' },
                { label: '缓入缓出', value: 'ease-in-out' },
                { label: '线性', value: 'linear' },
            ],
        },
    },
    {
        key: 'duration',
        label: '过渡时长',
        type: 'slider',
        page: 'animation',
        order: 200,
        bind: 'animation.duration' as BindPath,
        meta: { min: 0.05, max: 3, step: 0.05, unit: 's' },
    },
    {
        key: 'delay',
        label: '过渡延迟',
        type: 'slider',
        page: 'animation',
        order: 300,
        bind: 'animation.delay' as BindPath,
        meta: { min: 0, max: 5, step: 0.1, unit: 's' },
    },
    {
        key: 'animatedProperties',
        label: '过渡属性',
        type: 'propertyTags',
        page: 'animation',
        order: 400,
        bind: 'animation.animatedProperties' as BindPath,
    },
];

export const WIDGET_BINDING_SETTINGS_SCHEMA: InspectorSchema = [
    {
        key: 'connections',
        label: '信号连接',
        type: 'connection',
        page: 'signal',
        order: 100,
        bind: 'connections',
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
    {
        key: 'overflow',
        label: '允许溢出',
        type: 'switch',
        page: 'style',
        order: 800,
        bind: 'style.overflow',
    },
];

const WIDGET_SETTINGS_SCHEMAS: Partial<Record<WidgetKind, InspectorSchema>> = {
    [WidgetKinds.CLOCK]: CLOCK_WIDGET_SETTINGS_SCHEMA,
    [WidgetKinds.IMAGE]: IMAGE_WIDGET_SETTINGS_SCHEMA,
    [WidgetKinds.VIDEO]: VIDEO_WIDGET_SETTINGS_SCHEMA,
    [WidgetKinds.TEXT]: TEXT_WIDGET_SETTINGS_SCHEMA,
    [WidgetKinds.HTML]: HTML_WIDGET_SETTINGS_SCHEMA,
    [WidgetKinds.IFRAME]: IFRAME_WIDGET_SETTINGS_SCHEMA,
    [WidgetKinds.LIVE2D]: LIVE2D_WIDGET_SETTINGS_SCHEMA,
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
        ...WIDGET_BINDING_SETTINGS_SCHEMA,
        ...schema,
    ];
}
