import { DEFAULT_TEXT_WIDGET_TRANSFORM } from './constants';
import { OverlayRoot } from './overlay';
export { overlayReducer, getWidget, getWidgetLayerIndex } from './reducer';
import { createWidgetRegistry } from './registry';
import { DEFAULT_TEXT_WIDGET_PROPS, TextWidget } from './text';
import type {
    WidgetModel,
    WidgetRendererMap,
} from './types';

export * from './types';

export { OverlayRoot };

export function createDefaultOverlayRenderers(): WidgetRendererMap {
    return createWidgetRegistry({
        text: TextWidget,
    });
}

export function createTextWidget(
    id: string,
    transform: Partial<WidgetModel['style']> = {}
): WidgetModel {
    return {
        id,
        kind: 'text',
        props: DEFAULT_TEXT_WIDGET_PROPS,
        style: {
            ...DEFAULT_TEXT_WIDGET_TRANSFORM,
            ...transform,
        },
    };
}
