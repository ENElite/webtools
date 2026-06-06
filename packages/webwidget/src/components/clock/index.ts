import { widgetRegistry } from '../../engine/model/registry';
import { ClockWidget } from './clock_widget';
import { CLOCK_WIDGET_SETTINGS_SCHEMA, DEFAULT_CLOCK_WIDGET_PROPS } from './schema';

// Self-register this widget
widgetRegistry.register('clock' as any, {
    renderer: ClockWidget,
    defaults: DEFAULT_CLOCK_WIDGET_PROPS,
    label: '时钟组件',
    schema: CLOCK_WIDGET_SETTINGS_SCHEMA,
});

export { ClockWidget } from './clock_widget';
export { CLOCK_WIDGET_SETTINGS_SCHEMA, DEFAULT_CLOCK_WIDGET_PROPS } from './schema';
export type { ClockWidgetProps } from './schema';
