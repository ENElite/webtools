import { widgetRegistry } from '../../engine/model/registry';
import { Live2dWidget } from './live2d_widget';
import {
    LIVE2D_WIDGET_SETTINGS_SCHEMA,
    DEFAULT_LIVE2D_WIDGET_PROPS,
} from './schema';

// Self-register this widget
widgetRegistry.register('live2d' as any, {
    renderer: Live2dWidget,
    defaults: DEFAULT_LIVE2D_WIDGET_PROPS,
    label: 'Live2D 组件',
    schema: LIVE2D_WIDGET_SETTINGS_SCHEMA,
});

export { Live2dWidget } from './live2d_widget';
export {
    LIVE2D_WIDGET_SETTINGS_SCHEMA,
    DEFAULT_LIVE2D_WIDGET_PROPS,
    DEFAULT_LIVE2D_WIDGET_LAYOUT,
} from './schema';
export type { Live2dWidgetProps } from './schema';
