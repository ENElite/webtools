import type { WidgetFlatProps } from '../types';
import type { WidgetSettingsSchema } from './schema';

export type WidgetBackgroundEffect = 'blur' | 'image' | 'none';
export type WidgetBorderStyle = 'solid' | 'dot' | 'dash' | 'dotdash';

export type WidgetCommonProps = {
    backgroundColor: string;
    backgroundEffect: WidgetBackgroundEffect;
    backgroundImageUrl: string;
    borderColor: string;
    borderWidth: number;
    borderStyle: WidgetBorderStyle;
    shadowRadius: number;
    shadowColor: string;
};

export const DEFAULT_WIDGET_COMMON_PROPS: WidgetCommonProps = {
    backgroundColor: 'rgba(255, 255, 255, 0)',
    backgroundEffect: 'none',
    backgroundImageUrl: '',
    borderColor: '#38bdf8',
    borderWidth: 0,
    borderStyle: 'solid',
    shadowRadius: 0,
    shadowColor: 'rgba(0, 0, 0, 0.5)',
};

export const COMMON_WIDGET_SETTINGS_SCHEMA = [
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
] satisfies WidgetSettingsSchema<WidgetFlatProps>;
