import { widgetRegistry } from '../../engine/model/registry';
import { ImageWidget } from './image_widget';
import { DEFAULT_IMAGE_WIDGET_PROPS, IMAGE_WIDGET_SETTINGS_SCHEMA } from './schema';

// Self-register this widget
widgetRegistry.register('image' as any, {
    renderer: ImageWidget,
    defaults: DEFAULT_IMAGE_WIDGET_PROPS,
    label: '图片组件',
    schema: IMAGE_WIDGET_SETTINGS_SCHEMA,
});

export { ImageWidget } from './image_widget';
export { DEFAULT_IMAGE_WIDGET_PROPS, IMAGE_WIDGET_SETTINGS_SCHEMA } from './schema';
export type { ImageWidgetProps } from './schema';
