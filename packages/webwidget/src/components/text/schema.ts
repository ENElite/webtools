import type { InspectorSchema } from '../../engine/editor';

export type TextWidgetProps = {
    text: string;
    color: string;
    textShadowColor: string;
    textShadowRadius: number;
    align: 'left' | 'center' | 'right';
    font: string;
};

export const DEFAULT_TEXT_WIDGET_PROPS: TextWidgetProps = {
    text: '图片加载依赖网络环境\n需要确保当前可以访问 konachan.net',
    color: '#fdafd3',
    textShadowColor: 'rgba(255, 255, 255, 1)',
    textShadowRadius: 5,
    align: 'center',
    font: 'normal 300 24px/1.25 Arial, sans-serif',
};

export const TEXT_WIDGET_SETTINGS_SCHEMA: InspectorSchema = [
    {
        key: 'text',
        label: '文本',
        type: 'string',
        page: 'widget',
        order: 100,
        bind: 'props.text',
        meta: { placeholder: '输入展示文本' },
    },
    {
        key: 'font',
        label: '字体',
        type: 'font',
        page: 'widget',
        order: 200,
        bind: 'props.font',
    },
    {
        key: 'color',
        label: '颜色',
        type: 'color',
        page: 'widget',
        order: 300,
        bind: 'props.color',
    },
    {
        key: 'textShadowColor',
        label: '阴影颜色',
        type: 'color',
        page: 'widget',
        order: 400,
        bind: 'props.textShadowColor',
        meta: { alpha: true },
    },
    {
        key: 'textShadowRadius',
        label: '阴影半径',
        type: 'number',
        page: 'widget',
        order: 500,
        bind: 'props.textShadowRadius',
        meta: { min: 0, max: 100, step: 1 },
    },
    {
        key: 'align',
        label: '对齐',
        type: 'enum',
        page: 'widget',
        order: 600,
        bind: 'props.align',
        meta: {
            options: [
                { label: '左对齐', value: 'left' },
                { label: '居中', value: 'center' },
                { label: '右对齐', value: 'right' },
            ],
        },
    },
];