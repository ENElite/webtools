import { widgetRegistry } from '../../engine/model/registry';
import { IframeWidget } from './iframe_widget';
import { DEFAULT_IFRAME_WIDGET_PROPS, IFRAME_WIDGET_SETTINGS_SCHEMA } from './schema';

// Self-register this widget
widgetRegistry.register('iframe' as any, {
    renderer: IframeWidget,
    defaults: DEFAULT_IFRAME_WIDGET_PROPS,
    label: 'URL 组件',
    schema: IFRAME_WIDGET_SETTINGS_SCHEMA,
});

export { IframeWidget } from './iframe_widget';
export { DEFAULT_IFRAME_WIDGET_PROPS, IFRAME_WIDGET_SETTINGS_SCHEMA, type IframeWidgetProps } from './schema';
