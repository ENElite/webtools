import type { WidgetSettingsSchema } from '../schema';

export type IframeWidgetProps = {
    url: string;
    sandbox?: string;
};

export const DEFAULT_IFRAME_WIDGET_PROPS: IframeWidgetProps = {
    url: 'https://example.com',
    sandbox: 'allow-scripts allow-same-origin allow-popups allow-presentation',
};

export const IFRAME_WIDGET_SETTINGS_SCHEMA = [
    {
        key: 'url',
        label: 'URL',
        type: 'string',
        placeholder: '输入 iframe 地址',
    },
    {
        key: 'sandbox',
        label: 'Sandbox 策略',
        type: 'string',
        placeholder: '例如: allow-scripts allow-same-origin allow-popups allow-presentation',
    },
] satisfies WidgetSettingsSchema<IframeWidgetProps>;