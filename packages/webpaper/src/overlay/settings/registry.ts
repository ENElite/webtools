import { STYLE_WIDGET_SETTINGS_SCHEMA } from './style';
import { COMMON_WIDGET_SETTINGS_SCHEMA } from './common';
import { TEXT_WIDGET_SETTINGS_SCHEMA } from '../text/schema';
import type { WidgetKind } from '../types';
import type { WidgetSettingsSchema } from './types';

const WIDGET_SETTINGS_SCHEMAS: Partial<Record<WidgetKind, WidgetSettingsSchema>> = {
    text: TEXT_WIDGET_SETTINGS_SCHEMA,
};

export function resolveWidgetSettingsSchema(kind: WidgetKind): WidgetSettingsSchema | null {
    const schema = WIDGET_SETTINGS_SCHEMAS[kind];
    if (!schema) {
        return null;
    }

    return [
        ...STYLE_WIDGET_SETTINGS_SCHEMA,
        { type: 'divider' },
        ...COMMON_WIDGET_SETTINGS_SCHEMA,
        { type: 'divider' },
        ...schema,
    ];
}
