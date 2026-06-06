import { widgetRegistry } from '../../engine/model/registry';
import { HtmlWidget } from './html_widget';
import { DEFAULT_HTML_WIDGET_PROPS, HTML_WIDGET_SETTINGS_SCHEMA } from './schema';

// Self-register this widget
widgetRegistry.register('html' as any, {
    renderer: HtmlWidget,
    defaults: DEFAULT_HTML_WIDGET_PROPS,
    label: 'HTML 组件',
    schema: HTML_WIDGET_SETTINGS_SCHEMA,
});

export { HtmlWidget } from './html_widget';
export { DEFAULT_HTML_WIDGET_PROPS, HTML_WIDGET_SETTINGS_SCHEMA, type HtmlWidgetProps } from './schema';
