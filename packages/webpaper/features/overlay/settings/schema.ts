import type { WidgetFlatProps, WidgetPropPrimitive, WidgetStyle } from '../types';

export const DEFAULT_SETTINGS_WIDGET_STYLE: WidgetStyle = {
    width: '700px',
    height: '450px',
    transform: 'translate(100px, 100px) rotate(0deg)',
    borderRadius: '16px',
};

export type WidgetStyleSettingsDraft = {
    color: string;
    opacity: number;
    width: number;
    height: number;
    x: number;
    y: number;
    rotation: number;
    backgroundColor: string;
    backgroundEffect: string;
    backgroundImageUrl: string;
    borderColor: string;
    borderWidth: number;
    borderStyle: string;
    shadowRadius: number;
    shadowColor: string;
};

export const WIDGET_STYLE_SETTINGS_SCHEMA = [
    {
        key: 'color',
        label: '颜色',
        type: 'color',
        alpha: true,
    },
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

export type WidgetSettingsSchema<T extends Record<string, WidgetPropPrimitive> = WidgetFlatProps> = ReadonlyArray<WidgetFieldSchema<T>>;