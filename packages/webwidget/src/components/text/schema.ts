import type { InspectorSchema } from '../../engine/editor';

export type TextWidgetProps = {
    text: string;
    color: string;
    textShadowColor: string;
    textShadowRadius: number;
    align: 'left' | 'center' | 'right';
    font: string;
    strokeColor: string;
    strokeWidth: number;
    marquee: boolean;
    marqueeSpeed: number;
    marqueeDirection: 'left' | 'right';
};

export const DEFAULT_TEXT_WIDGET_PROPS: TextWidgetProps = {
    text: '图片加载依赖网络环境\n需要确保当前可以访问 konachan.net',
    color: '#fdafd3',
    textShadowColor: 'rgba(255, 255, 255, 1)',
    textShadowRadius: 0,
    align: 'center',
    font: 'normal 300 36px/1.25 Arial, sans-serif',
    strokeColor: '#ffffff',
    strokeWidth: 10,
    marquee: false,
    marqueeSpeed: 30,
    marqueeDirection: 'left',
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
        key: 'strokeColor',
        label: '描边颜色',
        type: 'color',
        page: 'widget',
        order: 320,
        bind: 'props.strokeColor',
        meta: { alpha: true },
    },
    {
        key: 'strokeWidth',
        label: '描边宽度',
        type: 'number',
        page: 'widget',
        order: 340,
        bind: 'props.strokeWidth',
        meta: { min: 0, max: 20, step: 0.5 },
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
    {
        key: 'marquee',
        label: '跑马灯',
        type: 'switch',
        page: 'widget',
        order: 700,
        bind: 'props.marquee',
    },
    {
        key: 'marqueeSpeed',
        label: '跑马灯速度',
        type: 'slider',
        page: 'widget',
        order: 800,
        bind: 'props.marqueeSpeed',
        meta: { min: 5, max: 100, step: 1, unit: 's' },
    },
    {
        key: 'marqueeDirection',
        label: '跑马灯方向',
        type: 'enum',
        page: 'widget',
        order: 900,
        bind: 'props.marqueeDirection',
        meta: {
            options: [
                { label: '向左', value: 'left' },
                { label: '向右', value: 'right' },
            ],
        },
    },
];