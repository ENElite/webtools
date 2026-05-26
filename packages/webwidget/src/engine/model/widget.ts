import type { WidgetKind, WidgetLayout, WidgetModel, WidgetRenderer, WidgetRendererMap, WidgetStyle, WidgetFlatProps } from './types';

import { ClockWidget, DEFAULT_CLOCK_WIDGET_PROPS } from '../../components/clock';
import { ImageWidget, DEFAULT_IMAGE_WIDGET_PROPS } from '../../components/image';
import { VideoWidget, DEFAULT_VIDEO_WIDGET_PROPS } from '../../components/video';
import { HtmlWidget, DEFAULT_HTML_WIDGET_PROPS } from '../../components/html';
import { IframeWidget, DEFAULT_IFRAME_WIDGET_PROPS } from '../../components/iframe';
import { TextWidget, DEFAULT_TEXT_WIDGET_PROPS } from '../../components/text';
import { Live2dWidget, DEFAULT_LIVE2D_WIDGET_PROPS } from '../../components/live2d';
import type { AnimationConfig, WidgetAnimation } from './animation';

export function createWidgetRegistry(initial?: WidgetRendererMap): WidgetRendererMap {
    return { ...(initial || {}) };
}

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

export function resolveWidgetRenderer(
    registry: WidgetRendererMap,
    kind: WidgetKind,
): WidgetRenderer<WidgetFlatProps> | null {
    return registry[kind] || null;
}

export function createOverlayRendererMap(): WidgetRendererMap {
    return createWidgetRegistry({
        clock: ClockWidget,
        image: ImageWidget,
        video: VideoWidget,
        text: TextWidget,
        html: HtmlWidget,
        iframe: IframeWidget,
        live2d: Live2dWidget,
    });
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
    return {
        text: '文本组件',
        html: 'HTML 组件',
        clock: '时钟组件',
        image: '图片组件',
        video: '视频组件',
        iframe: 'URL 组件',
        live2d: 'Live2D 组件',
    }[kind];
}

function createDefaultAnimation(): WidgetAnimation {
    const tween03: AnimationConfig = {
        effect: 'fade',
        motionType: 'tween',
        loop: false,
        delay: 0,
        duration: 0.3,
        intensity: 1,
        easing: 'ease-out',
    };

    return [
        {
            signal: { source: 'lifecycle', type: 'mount' },
            motion: {
                effect: 'fade',
                motionType: 'tween',
                loop: false,
                delay: 0.5,
                duration: 1,
                intensity: 1,
            },
        },
        { signal: { source: 'widget', type: 'style.opacity' }, motion: { ...tween03 } },
        { signal: { source: 'widget', type: 'style.backgroundColor' }, motion: { ...tween03 } },
        { signal: { source: 'widget', type: 'style.borderRadius' }, motion: { ...tween03 } },
        { signal: { source: 'widget', type: 'style.outline' }, motion: { ...tween03 } },
        { signal: { source: 'widget', type: 'style.outlineOffset' }, motion: { ...tween03 } },
        { signal: { source: 'widget', type: 'style.shadowRadius' }, motion: { ...tween03 } },
        { signal: { source: 'widget', type: 'style.shadowColor' }, motion: { ...tween03 } },
        { signal: { source: 'widget', type: 'style.backgroundEffect' }, motion: { ...tween03 } },
        { signal: { source: 'widget', type: 'style.backgroundImageUrl' }, motion: { ...tween03 } },
    ];
}

export function createWidget(
    kind: WidgetKind,
    opts: { style?: Partial<WidgetStyle>; layout?: Partial<WidgetLayout>; animation?: WidgetAnimation } = {},
): WidgetModel {
    const props = {
        text: DEFAULT_TEXT_WIDGET_PROPS,
        html: DEFAULT_HTML_WIDGET_PROPS,
        clock: DEFAULT_CLOCK_WIDGET_PROPS,
        image: DEFAULT_IMAGE_WIDGET_PROPS,
        video: DEFAULT_VIDEO_WIDGET_PROPS,
        iframe: DEFAULT_IFRAME_WIDGET_PROPS,
        live2d: DEFAULT_LIVE2D_WIDGET_PROPS,
    };

    const id = generateWidgetId();
    return {
        id,
        kind,
        label: defaultWidgetLabel(kind),
        props: props[kind],
        style: createWidgetStyle(opts.style || {}),
        layout: createWidgetLayout(opts.layout || {}),
        autoHide: false,
        animation: opts.animation ?? createDefaultAnimation(),
    };
}
