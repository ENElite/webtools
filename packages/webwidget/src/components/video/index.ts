import { widgetRegistry } from '../../engine/model/registry';
import { VideoWidget } from './video_widget';
import { DEFAULT_VIDEO_WIDGET_PROPS, VIDEO_WIDGET_SETTINGS_SCHEMA } from './schema';

// Self-register this widget
widgetRegistry.register('video' as any, {
    renderer: VideoWidget,
    defaults: DEFAULT_VIDEO_WIDGET_PROPS,
    label: '视频组件',
    schema: VIDEO_WIDGET_SETTINGS_SCHEMA,
});

export { VideoWidget } from './video_widget';
export { DEFAULT_VIDEO_WIDGET_PROPS, VIDEO_WIDGET_SETTINGS_SCHEMA } from './schema';
export type { VideoWidgetProps } from './schema';
