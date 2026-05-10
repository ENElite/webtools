
import { CLOCK_WIDGET_SETTINGS_SCHEMA } from './clock';
import { IMAGE_WIDGET_SETTINGS_SCHEMA } from './image';
import { VIDEO_WIDGET_SETTINGS_SCHEMA } from './video';
import { TEXT_WIDGET_SETTINGS_SCHEMA } from './text';
import { HTML_WIDGET_SETTINGS_SCHEMA } from './html';
import { IFRAME_WIDGET_SETTINGS_SCHEMA } from './iframe';
import type {
    WidgetKind,
    WidgetFlatProps,
    WidgetPropPrimitive,
} from './types';

export const WidgetStyleSettingsKeys = [
    'opacity',
    'backgroundColor',
    'backgroundEffect',
    'backgroundImageUrl',
    'borderColor',
    'borderWidth',
    'borderStyle',
    'shadowRadius',
    'shadowColor',
] as const;

export type WidgetStyleSettingsKey = typeof WidgetStyleSettingsKeys[number];

export const WidgetLayoutSettingsKeys = [
    'anchorX',
    'anchorY',
    'adapt',
] as const;

export type WidgetLayoutSettingsKey = typeof WidgetLayoutSettingsKeys[number];

export type WidgetStyleSettingsDraft = {
    opacity: number;
    backgroundColor: string;
    backgroundEffect: string;
    backgroundImageUrl: string;
    borderColor: string;
    borderWidth: number;
    borderStyle: string;
    shadowRadius: number;
    shadowColor: string;
};


export type WidgetSettingsSchema<T extends Record<string, WidgetPropPrimitive> = WidgetFlatProps> = ReadonlyArray<WidgetFieldSchema<T>>;

const WIDGET_BASE_SETTINGS_SCHEMA = [
    {
        key: 'label',
        label: '组件名称',
        type: 'string',
    },
    {
        key: 'locked',
        label: '锁定变换',
        type: 'boolean',
    },
    {
        key: 'autoHide',
        label: '自动隐藏',
        type: 'boolean',
    },
    {
        key: 'anchorX',
        label: '水平锚点',
        type: 'enum',
        options: [
            { label: '左', value: 'left' },
            { label: '中', value: 'center' },
            { label: '右', value: 'right' },
        ],
    },
    {
        key: 'anchorY',
        label: '垂直锚点',
        type: 'enum',
        options: [
            { label: '上', value: 'top' },
            { label: '中', value: 'center' },
            { label: '下', value: 'bottom' },
        ],
    },
    {
        key: 'adapt',
        label: '适配策略',
        type: 'enum',
        options: [
            { label: '固定', value: 'fixed' },
            { label: '拉伸', value: 'stretch' },
        ],
    },
] satisfies WidgetSettingsSchema;

export const WIDGET_STYLE_SETTINGS_SCHEMA = [
    {
        key: 'opacity',
        label: '透明度',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.01,
    },
    {
        key: 'backgroundColor',
        label: '背景颜色',
        type: 'color',
        alpha: true,
    },
    {
        key: 'backgroundEffect',
        label: '背景效果',
        type: 'enum',
        options: [
            { label: '模糊', value: 'blur' },
            { label: '图片', value: 'image' },
            { label: '无效果', value: 'none' },
        ],
    },
    {
        key: 'backgroundImageUrl',
        label: '背景图片',
        type: 'image',
        placeholder: '输入图片 URL，或拖拽/选择本地图片',
        visibleWhen: {
            key: 'backgroundEffect',
            equals: 'image',
        },
    },
    {
        key: 'borderColor',
        label: '边框颜色',
        type: 'color',
    },
    {
        key: 'borderWidth',
        label: '边框粗细',
        type: 'number',
        min: 0,
        max: 24,
        step: 1,
    },
    {
        key: 'borderStyle',
        label: '边框样式',
        type: 'enum',
        options: [
            { label: '实线', value: 'solid' },
            { label: '点线 (dot)', value: 'dot' },
            { label: '虚线 (dash)', value: 'dash' },
            { label: '点划线 (dotdash)', value: 'dotdash' },
        ],
    },
    {
        key: 'shadowRadius',
        label: '阴影半径',
        type: 'number',
        min: 0,
        max: 100,
        step: 1,
    },
    {
        key: 'shadowColor',
        label: '阴影颜色',
        type: 'color',
        alpha: true,
    },
] satisfies WidgetSettingsSchema<WidgetStyleSettingsDraft>;


const WIDGET_SETTINGS_SCHEMAS: Partial<Record<WidgetKind, WidgetSettingsSchema>> = {
    clock: CLOCK_WIDGET_SETTINGS_SCHEMA,
    image: IMAGE_WIDGET_SETTINGS_SCHEMA,
    video: VIDEO_WIDGET_SETTINGS_SCHEMA,
    text: TEXT_WIDGET_SETTINGS_SCHEMA,
    html: HTML_WIDGET_SETTINGS_SCHEMA,
    iframe: IFRAME_WIDGET_SETTINGS_SCHEMA,
};

export function resolveWidgetSettingsSchema(kind: WidgetKind): WidgetSettingsSchema | null {
    const schema = WIDGET_SETTINGS_SCHEMAS[kind];
    if (!schema) {
        return null;
    }
    return [
        { type: 'divider', label: '基本设置' },
        ...WIDGET_BASE_SETTINGS_SCHEMA,
        { type: 'divider', label: '样式设置' },
        ...WIDGET_STYLE_SETTINGS_SCHEMA,
        { type: 'divider', label: '组件设置' },
        ...schema,
    ];
}

export type WidgetFieldKey<T extends Record<string, WidgetPropPrimitive>> = Extract<keyof T, string>;

export type WidgetFieldVisibility<T extends Record<string, WidgetPropPrimitive> = WidgetFlatProps> = {
    key: WidgetFieldKey<T>;
    equals: string | number | boolean | null;
};

export type WidgetFieldSchema<T extends Record<string, WidgetPropPrimitive> = WidgetFlatProps> =
    | {
        key: WidgetFieldKey<T>;
        label: string;
        type: 'string';
        placeholder?: string;
        readOnly?: boolean;
        visibleWhen?: WidgetFieldVisibility<T>;
    }
    | {
        key: WidgetFieldKey<T>;
        label: string;
        type: 'number';
        min?: number;
        max?: number;
        step?: number;
        suffix?: string;
        modulo?: number;
        visibleWhen?: WidgetFieldVisibility<T>;
    }
    | {
        key: WidgetFieldKey<T>;
        label: string;
        type: 'boolean';
        visibleWhen?: WidgetFieldVisibility<T>;
    }
    | {
        key: WidgetFieldKey<T>;
        label: string;
        type: 'enum';
        options: Array<{
            label: string;
            value: string | number;
        }>;
        visibleWhen?: WidgetFieldVisibility<T>;
    }
    | {
        key: WidgetFieldKey<T>;
        label: string;
        type: 'color';
        alpha?: boolean;
        visibleWhen?: WidgetFieldVisibility<T>;
    }
    | {
        key: WidgetFieldKey<T>;
        label: string;
        type: 'font';
        /** optional UI options for font picker */
        visibleWhen?: WidgetFieldVisibility<T>;
    }
    | {
        key: WidgetFieldKey<T>;
        label: string;
        type: 'image';
        placeholder?: string;
        visibleWhen?: WidgetFieldVisibility<T>;
    }
    | {
        key: WidgetFieldKey<T>;
        label: string;
        type: 'editor';
        language?: string;
        height?: string | number;
        saveButtonText?: string;
        visibleWhen?: WidgetFieldVisibility<T>;
    }
    | {
        type: 'divider';
        label?: string;
    };
