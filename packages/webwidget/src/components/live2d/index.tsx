import { widgetRegistry } from '../../engine/model/registry';
import { Live2dWidget } from './live2d_widget';
import { Live2dSuspenseBoundary } from './Live2dSuspenseBoundary';
import {
    LIVE2D_WIDGET_SETTINGS_SCHEMA,
    DEFAULT_LIVE2D_WIDGET_PROPS,
} from './schema';

/** 包裹 Suspense + ErrorBoundary 的 Live2D 渲染器 */
function Live2dWidgetWithBoundary(props: Parameters<typeof Live2dWidget>[0]) {
    return (
        <Live2dSuspenseBoundary>
            <Live2dWidget {...props} />
        </Live2dSuspenseBoundary>
    );
}

// Self-register this widget
widgetRegistry.register('live2d' as any, {
    renderer: Live2dWidgetWithBoundary,
    defaults: DEFAULT_LIVE2D_WIDGET_PROPS,
    label: 'Live2D 组件',
    schema: LIVE2D_WIDGET_SETTINGS_SCHEMA,
});

export { Live2dWidget } from './live2d_widget';
export { Live2dSuspenseBoundary } from './Live2dSuspenseBoundary';
export {
    LIVE2D_WIDGET_SETTINGS_SCHEMA,
    DEFAULT_LIVE2D_WIDGET_PROPS,
    DEFAULT_LIVE2D_WIDGET_LAYOUT,
} from './schema';
export type { Live2dWidgetProps } from './schema';
