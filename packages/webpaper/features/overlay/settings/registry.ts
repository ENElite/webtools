import { WIDGET_STYLE_SETTINGS_SCHEMA } from './schema';
import { CLOCK_WIDGET_SETTINGS_SCHEMA } from '../clock';
import { IMAGE_WIDGET_SETTINGS_SCHEMA } from '../image';
import { VIDEO_WIDGET_SETTINGS_SCHEMA } from '../video';
import { TEXT_WIDGET_SETTINGS_SCHEMA } from '../text/schema';
import { HTML_WIDGET_SETTINGS_SCHEMA } from '../html/schema';
import { IFRAME_WIDGET_SETTINGS_SCHEMA } from '../iframe/schema';
import type { WidgetKind } from '../types';
import type { WidgetSettingsSchema } from './schema';

const WIDGET_BASE_SETTINGS_SCHEMA = [
    {
        key: 'label',
        label: '组件名称',
        type: 'string',
    },
    {
        key: 'locked',
        label: '锁定变换',
        type: 'boolean',
    },
    {
        key: 'autoHide',
        label: '自动隐藏',
        type: 'boolean',
    },
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
        min: 0,
        max: 4096,
        step: 1,
    },
    {
        key: 'y',
        label: 'Y',
        type: 'number',
        min: 0,
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
        suffix: 'degree',
        modulo: 360,
    },
] satisfies WidgetSettingsSchema;

const WIDGET_SETTINGS_SCHEMAS: Partial<Record<WidgetKind, WidgetSettingsSchema>> = {
    clock: CLOCK_WIDGET_SETTINGS_SCHEMA,
    image: IMAGE_WIDGET_SETTINGS_SCHEMA,
    video: VIDEO_WIDGET_SETTINGS_SCHEMA,
    text: TEXT_WIDGET_SETTINGS_SCHEMA,
    html: HTML_WIDGET_SETTINGS_SCHEMA,
    iframe: IFRAME_WIDGET_SETTINGS_SCHEMA,
};

export function resolveWidgetSettingsSchema(kind: WidgetKind): WidgetSettingsSchema | null {
    const schema = WIDGET_SETTINGS_SCHEMAS[kind];
    if (!schema) {
        return null;
    }
    return [
        { type: 'divider', label: '基本设置' },
        ...WIDGET_BASE_SETTINGS_SCHEMA,
        { type: 'divider', label: '样式设置' },
        ...WIDGET_STYLE_SETTINGS_SCHEMA,
        { type: 'divider', label: '组件设置' },
        ...schema,
    ];
}