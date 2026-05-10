import type { WidgetSettingsSchema } from '../schema';

export type TextWidgetProps = {
    text: string;
    color: string;
    textShadowColor: string;
    textShadowRadius: number;
    align: 'left' | 'center' | 'right';
    font: string;
};

export const DEFAULT_TEXT_WIDGET_PROPS: TextWidgetProps = {
    text: 'Webpaper Overlay Text Widget',
    color: '#f8fafc',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowRadius: 0,
    align: 'center',
    font: 'normal 600 48px/1.25 Arial, sans-serif',
};

export const TEXT_WIDGET_SETTINGS_SCHEMA = [
    {
        key: 'text',
        label: '文本',
        type: 'string',
        placeholder: '输入展示文本',
    },
    {
        key: 'font',
        label: '字体',
        type: 'font',
    },
    {
        key: 'color',
        label: '颜色',
        type: 'color',
    },
    {
        key: 'textShadowColor',
        label: '阴影颜色',
        type: 'color',
        alpha: true,
    },
    {
        key: 'textShadowRadius',
        label: '阴影半径',
        type: 'number',
        min: 0,
        max: 100,
        step: 1,
    },
    {
        key: 'align',
        label: '对齐',
        type: 'enum',
        options: [
            { label: '左对齐', value: 'left' },
            { label: '居中', value: 'center' },
            { label: '右对齐', value: 'right' },
        ],
    },
] satisfies WidgetSettingsSchema<TextWidgetProps>;