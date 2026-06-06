import type { WidgetKind, WidgetLayout, WidgetModel, WidgetRenderer, WidgetRendererMap, WidgetStyle, WidgetFlatProps } from './types';
import { widgetRegistry } from './registry';
import type { InspectorSchema } from '../editor';

// Re-export WidgetKinds for convenience
export { WidgetKinds } from './types';

// Re-export registry for external use
export { widgetRegistry, type WidgetRegistration } from './registry';

// Legacy API: createWidgetRegistry creates a renderer map from the registry
export function createWidgetRegistry(): WidgetRendererMap {
    const map: WidgetRendererMap = {};
    for (const kind of widgetRegistry.getAllKinds()) {
        const renderer = widgetRegistry.getRenderer(kind);
        if (renderer) {
            map[kind] = renderer;
        }
    }
    return map;
}

// Legacy API: registerWidgetRenderer adds a renderer to a map (for backward compatibility)
export function registerWidgetRenderer(
    registry: WidgetRendererMap,
    kind: WidgetKind,
    renderer: WidgetRenderer<WidgetFlatProps>,
): WidgetRendererMap {
    return {
        ...registry,
        [kind]: renderer,
    };
}

// Legacy API: resolveWidgetRenderer from a renderer map
export function resolveWidgetRenderer(
    registry: WidgetRendererMap,
    kind: WidgetKind,
): WidgetRenderer<WidgetFlatProps> | null {
    return registry[kind] || null;
}

// Create overlay renderer map from the registry
export function createOverlayRendererMap(): WidgetRendererMap {
    return createWidgetRegistry();
}

// Resolve widget settings schema from the registry
export function resolveWidgetSettingsSchema(kind: WidgetKind): InspectorSchema | null {
    return widgetRegistry.getSchema(kind);
}

export const DEFAULT_OVERLAY_Z_INDEX = 4;
export const DEFAULT_SNAP_THRESHOLD = 8;

export const DEFAULT_WIDGET_STYLE = {
    opacity: 1,
    backgroundColor: 'rgba(255, 255, 255, 0)',
    backgroundEffect: 'none',
    backgroundImageUrl: '',
    outline: '0px solid #000000',
    outlineOffset: '0px',
    borderRadius: '0px',
    shadowRadius: 0,
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    overflow: false,
} satisfies Partial<WidgetStyle>;

export const DEFAULT_WIDGET_LAYOUT = {
    anchorX: 'left',
    anchorY: 'top',
    x: 5,
    y: 5,
    w: 40,
    h: 16,
    rotation: 0,
    adapt: 'stretch',
    order: 1,
} satisfies Partial<WidgetLayout>;

function createWidgetStyle(transform: Partial<WidgetStyle> = {}): WidgetStyle {
    return {
        ...DEFAULT_WIDGET_STYLE,
        ...transform,
    } as WidgetStyle;
}

function createWidgetLayout(layout: Partial<WidgetLayout> = {}): WidgetLayout {
    return {
        ...DEFAULT_WIDGET_LAYOUT,
        ...layout,
    } as WidgetLayout;
}

function encodeBase62(value: bigint): string {
    const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    if (value === 0n) {
        return alphabet[0]!;
    }

    let nextValue = value < 0n ? -value : value;
    let output = '';

    while (nextValue > 0n) {
        const remainder = Number(nextValue % 62n);
        output = alphabet[remainder] + output;
        nextValue /= 62n;
    }

    return output;
}

export function generateWidgetId(): string {
    const seed = (BigInt(Date.now()) * 1000000n) + BigInt(Math.floor(Math.random() * 1000000));
    return encodeBase62(seed);
}

export function defaultWidgetLabel(kind: WidgetKind): string {
    return widgetRegistry.getLabel(kind);
}

import type { Connection } from './bindings';

/**
 * 创建默认连接（Qt 风格四元组）。
 * target 默认为当前 widget 自身。
 */
export function createDefaultConnections(widgetId: string): Connection[] {
    return [
        // mount → animation（入场动画）
        { signal: 'mount', target: widgetId, slot: 'animation', params: { duration: 1, delay: 0, easing: 'ease-out' } },
    ];
}

export function createWidget(
    kind: WidgetKind,
    opts: { style?: Partial<WidgetStyle>; layout?: Partial<WidgetLayout>; connections?: Connection[] } = {},
): WidgetModel {
    const defaults = widgetRegistry.getDefaults(kind) ?? {};

    const id = generateWidgetId();
    return {
        id,
        kind,
        label: widgetRegistry.getLabel(kind),
        props: defaults,
        style: createWidgetStyle(opts.style || {}),
        layout: createWidgetLayout(opts.layout || {}),
        autoHide: false,
        connections: opts.connections ?? createDefaultConnections(id),
    };
}
