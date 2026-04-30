import type {
    WidgetFlatProps,
    WidgetKind,
    WidgetModel,
    WidgetStyle,
    WidgetRenderer,
    WidgetRendererMap,
} from './types';

import { ClockWidget, DEFAULT_CLOCK_WIDGET_PROPS } from './clock';
import { ImageWidget, DEFAULT_IMAGE_WIDGET_PROPS } from './image';
import { VideoWidget, DEFAULT_VIDEO_WIDGET_PROPS } from './video';
import { HtmlWidget, DEFAULT_HTML_WIDGET_PROPS } from './html';
import { IframeWidget, DEFAULT_IFRAME_WIDGET_PROPS } from './iframe';
import { TextWidget, DEFAULT_TEXT_WIDGET_PROPS } from './text';

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

export function createOverlayRendererMap(): WidgetRendererMap {
    // cast to WidgetRendererMap to avoid excess property checking on the literal
    return createWidgetRegistry({
        clock: ClockWidget,
        image: ImageWidget,
        video: VideoWidget,
        text: TextWidget,
        html: HtmlWidget,
        iframe: IframeWidget,
    } as WidgetRendererMap);
}


export const DEFAULT_OVERLAY_Z_INDEX = 4;
export const DEFAULT_SNAP_THRESHOLD = 8;
export const DEFAULT_MIN_WIDGET_WIDTH = 120;
export const DEFAULT_MIN_WIDGET_HEIGHT = 72;

export const DEFAULT_TEXT_WIDGET_TRANSFORM: WidgetStyle = {
    transform: 'translate(56px, 56px) rotate(0deg)',
    width: '520px',
    height: '128px',
    borderRadius: '0px',
};

const DEFAULT_WIDGET_STYLE = {
    backgroundColor: 'rgba(255, 255, 255, 0)',
    backgroundEffect: 'none',
    backgroundImageUrl: '',
    borderColor: '#38bdf8',
    borderWidth: 0,
    borderStyle: 'solid',
    shadowRadius: 0,
    shadowColor: 'rgba(0, 0, 0, 0.5)',
} satisfies Partial<WidgetStyle>;

function createWidgetStyle(transform: Partial<WidgetStyle> = {}): WidgetStyle {
    return {
        ...DEFAULT_WIDGET_STYLE,
        ...DEFAULT_TEXT_WIDGET_TRANSFORM,
        ...transform,
    } as WidgetStyle;
}

export function createWidget(kind: WidgetKind, id: string, transform: Partial<WidgetStyle> = {}): WidgetModel {
    const props = {
        text: DEFAULT_TEXT_WIDGET_PROPS,
        html: DEFAULT_HTML_WIDGET_PROPS,
        clock: DEFAULT_CLOCK_WIDGET_PROPS,
        image: DEFAULT_IMAGE_WIDGET_PROPS,
        video: DEFAULT_VIDEO_WIDGET_PROPS,
        iframe: DEFAULT_IFRAME_WIDGET_PROPS,
    }
    return {
        id,
        kind,
        props: props[kind],
        style: createWidgetStyle(transform),
        autoHide: false,
    }
}
