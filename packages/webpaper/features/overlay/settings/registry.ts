import { WIDGET_STYLE_SETTINGS_SCHEMA } from './schema';
import { CLOCK_WIDGET_SETTINGS_SCHEMA } from '../clock';
import { IMAGE_WIDGET_SETTINGS_SCHEMA } from '../image';
import { VIDEO_WIDGET_SETTINGS_SCHEMA } from '../video';
import { TEXT_WIDGET_SETTINGS_SCHEMA } from '../text/schema';
import { HTML_WIDGET_SETTINGS_SCHEMA } from '../html/schema';
import { IFRAME_WIDGET_SETTINGS_SCHEMA } from '../iframe/schema';
import type { WidgetKind } from '../types';
import type { WidgetSettingsSchema } from './schema';

const MODEL_WIDGET_SETTINGS_SCHEMA = [
    {
        key: 'id',
        label: '组件 ID',
        type: 'string',
        readOnly: true,
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
        { type: 'divider', label: '属性设置' },
        ...MODEL_WIDGET_SETTINGS_SCHEMA,
        { type: 'divider', label: '样式设置' },
        ...WIDGET_STYLE_SETTINGS_SCHEMA,
        { type: 'divider', label: '组件设置' },
        ...schema,
    ];
}