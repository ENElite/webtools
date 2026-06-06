import { widgetRegistry } from '../../engine/model/registry';
import { TextWidget } from './text_widget';
import { DEFAULT_TEXT_WIDGET_PROPS, TEXT_WIDGET_SETTINGS_SCHEMA } from './schema';

// Self-register this widget
widgetRegistry.register('text' as any, {
    renderer: TextWidget,
    defaults: DEFAULT_TEXT_WIDGET_PROPS,
    label: '文本组件',
    schema: TEXT_WIDGET_SETTINGS_SCHEMA,
});

export { TextWidget } from './text_widget';
export { DEFAULT_TEXT_WIDGET_PROPS, type TextWidgetProps } from './schema';
export { TEXT_WIDGET_SETTINGS_SCHEMA } from './schema';