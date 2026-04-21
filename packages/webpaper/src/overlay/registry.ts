import type {
    WidgetFlatProps,
    WidgetKind,
    WidgetRenderer,
    WidgetRendererMap,
} from './types';

export function createWidgetRegistry(initial?: WidgetRendererMap): WidgetRendererMap {
    return { ...(initial || {}) };
}

export function registerWidgetRenderer(
    registry: WidgetRendererMap,
    kind: WidgetKind,
    renderer: WidgetRenderer<WidgetFlatProps>
): WidgetRendererMap {
    return {
        ...registry,
        [kind]: renderer,
    };
}

export function resolveWidgetRenderer(
    registry: WidgetRendererMap,
    kind: WidgetKind
): WidgetRenderer<WidgetFlatProps> | null {
    return registry[kind] || null;
}
