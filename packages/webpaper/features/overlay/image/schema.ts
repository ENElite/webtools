import type { WidgetSettingsSchema } from '../settings/schema';

export type ImageWidgetProps = {
    imageUrl: string;
    previewUrl: string;
    mode: 'imageOnly' | 'imageAsync' | 'allAsync' | 'previewAsync' | 'allSync';
    objectFit: 'contain' | 'cover';
    trackScale: number;
    trackIntensity: number;
    enableMouseTracking: boolean;
};

const DEFAULT_IMAGE_PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="%230ea5e9"/><stop offset="1" stop-color="%231d4ed8"/></linearGradient></defs><rect width="1200" height="800" fill="url(%23g)"/><circle cx="390" cy="300" r="110" fill="rgba(255,255,255,0.18)"/><path d="M180 620 L430 360 L610 540 L760 410 L1020 620 Z" fill="rgba(255,255,255,0.28)"/><text x="80" y="130" font-family="ui-sans-serif, system-ui" font-size="72" font-weight="700" fill="white">Image Widget</text><text x="80" y="205" font-family="ui-sans-serif, system-ui" font-size="34" fill="rgba(255,255,255,0.8)">Replace this placeholder in the widget settings</text></svg>';

export const DEFAULT_IMAGE_WIDGET_PROPS: ImageWidgetProps = {
    imageUrl: DEFAULT_IMAGE_PLACEHOLDER,
    previewUrl: '',
    mode: 'imageOnly',
    objectFit: 'cover',
    trackScale: 1.04,
    trackIntensity: 20,
    enableMouseTracking: true,
};

export const IMAGE_WIDGET_SETTINGS_SCHEMA = [
    {
        key: 'imageUrl',
        label: '图片地址',
        type: 'string',
        placeholder: '输入图片 URL',
    },
    {
        key: 'previewUrl',
        label: '预览地址',
        type: 'string',
        placeholder: '可选：用于显示预览图',
    },
    {
        key: 'mode',
        label: '加载模式',
        type: 'enum',
        options: [
            { label: '仅图片', value: 'imageOnly' },
            { label: '图片异步', value: 'imageAsync' },
            { label: '背景和图片异步', value: 'allAsync' },
            { label: '预览异步', value: 'previewAsync' },
            { label: '全部同步', value: 'allSync' },
        ],
    },
    {
        key: 'objectFit',
        label: '裁切方式',
        type: 'enum',
        options: [
            { label: 'Cover', value: 'cover' },
            { label: 'Contain', value: 'contain' },
        ],
    },
    {
        key: 'trackScale',
        label: '鼠标缩放',
        type: 'number',
        min: 0.5,
        max: 2,
        step: 0.01,
    },
    {
        key: 'trackIntensity',
        label: '视差强度',
        type: 'number',
        min: 0,
        max: 120,
        step: 1,
    },
    {
        key: 'enableMouseTracking',
        label: '启用鼠标视差',
        type: 'boolean',
    },
] satisfies WidgetSettingsSchema<ImageWidgetProps>;