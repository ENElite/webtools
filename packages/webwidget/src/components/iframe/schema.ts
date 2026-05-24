import type { InspectorSchema } from '../../engine/editor';

export type IframeWidgetProps = {
    url: string;
    sandbox?: string;
};

export const DEFAULT_IFRAME_WIDGET_PROPS: IframeWidgetProps = {
    url: 'https://example.com',
    sandbox: 'allow-scripts allow-same-origin allow-popups allow-presentation',
};

export const IFRAME_WIDGET_SETTINGS_SCHEMA: InspectorSchema = [
    {
        key: 'url',
        label: 'URL',
        type: 'string',
        page: 'widget',
        order: 100,
        bind: 'props.url',
        meta: { placeholder: '输入 iframe 地址' },
    },
    {
        key: 'sandbox',
        label: 'Sandbox 策略',
        type: 'string',
        page: 'widget',
        order: 200,
        bind: 'props.sandbox',
        meta: { placeholder: '例如: allow-scripts allow-same-origin allow-popups allow-presentation' },
    },
];