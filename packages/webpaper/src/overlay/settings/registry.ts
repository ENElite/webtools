import { STYLE_WIDGET_SETTINGS_SCHEMA } from './schema';
import { COMMON_WIDGET_SETTINGS_SCHEMA } from './common';
import { TEXT_WIDGET_SETTINGS_SCHEMA } from '../text/schema';
import type { WidgetKind } from '../types';
import type { WidgetSettingsSchema } from './schema';

const WIDGET_SETTINGS_SCHEMAS: Partial<Record<WidgetKind, WidgetSettingsSchema>> = {
    text: TEXT_WIDGET_SETTINGS_SCHEMA,
};

export function resolveWidgetSettingsSchema(kind: WidgetKind): WidgetSettingsSchema | null {
    const schema = WIDGET_SETTINGS_SCHEMAS[kind];
    if (!schema) {
        return null;
    }
    return [
        { type: 'divider', label: '属性设置' },
        ...STYLE_WIDGET_SETTINGS_SCHEMA,
        { type: 'divider', label: '公共设置' },
        ...COMMON_WIDGET_SETTINGS_SCHEMA,
        { type: 'divider', label: '组件设置' },
        ...schema,
    ];
}
