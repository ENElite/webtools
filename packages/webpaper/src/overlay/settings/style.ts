import type { WidgetSettingsSchema } from './types';

export type WidgetStyleSettingsDraft = {
    width: number;
    height: number;
    x: number;
    y: number;
    rotation: number;
};

export const STYLE_WIDGET_SETTINGS_SCHEMA = [
    {
        key: 'width',
        label: '宽度',
        type: 'number',
        min: 0,
        max: 4096,
        step: 1,
    },
    {
        key: 'height',
        label: '高度',
        type: 'number',
        min: 0,
        max: 4096,
        step: 1,
    },
    {
        key: 'x',
        label: 'X',
        type: 'number',
        min: -4096,
        max: 4096,
        step: 1,
    },
    {
        key: 'y',
        label: 'Y',
        type: 'number',
        min: -4096,
        max: 4096,
        step: 1,
    },
    {
        key: 'rotation',
        label: '旋转',
        type: 'number',
        min: -360,
        max: 360,
        step: 1,
        suffix: '°',
        modulo: 360,
    },
] satisfies WidgetSettingsSchema<WidgetStyleSettingsDraft>;
