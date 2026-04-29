import type { WidgetSettingsSchema } from '../settings/schema';

export type TextWidgetProps = {
    text: string;
    fontSize: number;
    color: string;
    align: 'left' | 'center' | 'right';
    fontWeight: number;
};

export const DEFAULT_TEXT_WIDGET_PROPS: TextWidgetProps = {
    text: 'Webpaper Overlay Text Widget',
    fontSize: 48,
    color: '#f8fafc',
    align: 'center',
    fontWeight: 600,
};

export const TEXT_WIDGET_SETTINGS_SCHEMA = [
    {
        key: 'text',
        label: '文本',
        type: 'string',
        placeholder: '输入展示文本',
    },
    {
        key: 'fontSize',
        label: '字号',
        type: 'number',
        min: 8,
        max: 240,
        step: 1,
    },
    {
        key: 'fontWeight',
        label: '字重',
        type: 'number',
        min: 100,
        max: 900,
        step: 100,
    },
    {
        key: 'color',
        label: '颜色',
        type: 'color',
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