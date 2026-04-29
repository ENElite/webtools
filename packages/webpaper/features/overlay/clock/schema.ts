import type { WidgetSettingsSchema } from '../settings/schema';

export type ClockWidgetProps = {
    locale: string;
    showDate: boolean;
    showSeconds: boolean;
    use24Hour: boolean;
    fontSize: number;
    color: string;
    fontWeight: 400 | 500 | 600 | 700;
};

export const DEFAULT_CLOCK_WIDGET_PROPS: ClockWidgetProps = {
    locale: 'zh-CN',
    showDate: true,
    showSeconds: true,
    use24Hour: true,
    fontSize: 36,
    color: '#f8fafc',
    fontWeight: 600,
};

export const CLOCK_WIDGET_SETTINGS_SCHEMA = [
    {
        key: 'locale',
        label: '语言地区',
        type: 'string',
        placeholder: '例如: zh-CN, en-US',
    },
    {
        key: 'showDate',
        label: '显示日期',
        type: 'boolean',
    },
    {
        key: 'showSeconds',
        label: '显示秒',
        type: 'boolean',
    },
    {
        key: 'use24Hour',
        label: '24 小时制',
        type: 'boolean',
    },
    {
        key: 'fontSize',
        label: '字号',
        type: 'number',
        min: 10,
        max: 240,
        step: 1,
    },
    {
        key: 'color',
        label: '文字颜色',
        type: 'color',
    },
    {
        key: 'fontWeight',
        label: '字重',
        type: 'enum',
        options: [
            { label: '400', value: 400 },
            { label: '500', value: 500 },
            { label: '600', value: 600 },
            { label: '700', value: 700 },
        ],
    },
] satisfies WidgetSettingsSchema<ClockWidgetProps>;
