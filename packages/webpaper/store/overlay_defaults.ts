import { DEFAULT_HTML_WIDGET_PROPS } from '@/features/overlay/html';
import { DEFAULT_IMAGE_WIDGET_PROPS } from '@/features/overlay/image';
import { DEFAULT_IFRAME_WIDGET_PROPS } from '@/features/overlay/iframe';
import { DEFAULT_VIDEO_WIDGET_PROPS } from '@/features/overlay/video';
import { DEFAULT_TEXT_WIDGET_PROPS } from '@/features/overlay/text';
import { buildTransformString } from '@/features/overlay/transform_utils';
import type { OverlayState, WidgetModel, WidgetStyle } from '@/features/overlay/types';

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

export function createTextWidget(id: string, transform: Partial<WidgetStyle> = {}): WidgetModel {
    return {
        id,
        kind: 'text',
        props: DEFAULT_TEXT_WIDGET_PROPS,
        style: createWidgetStyle(transform),
        autoHide: false,
    };
}

export function createHtmlWidget(id: string, transform: Partial<WidgetStyle> = {}): WidgetModel {
    return {
        id,
        kind: 'html',
        props: DEFAULT_HTML_WIDGET_PROPS,
        style: createWidgetStyle(transform),
        autoHide: false,
    };
}

export function createImageWidget(id: string, transform: Partial<WidgetStyle> = {}): WidgetModel {
    return {
        id,
        kind: 'image',
        props: DEFAULT_IMAGE_WIDGET_PROPS,
        style: createWidgetStyle(transform),
        autoHide: false,
    };
}

export function createVideoWidget(id: string, transform: Partial<WidgetStyle> = {}): WidgetModel {
    return {
        id,
        kind: 'video',
        props: DEFAULT_VIDEO_WIDGET_PROPS,
        style: createWidgetStyle(transform),
        autoHide: false,
    };
}

export function createIframeWidget(id: string, transform: Partial<WidgetStyle> = {}): WidgetModel {
    return {
        id,
        kind: 'iframe',
        props: DEFAULT_IFRAME_WIDGET_PROPS,
        style: createWidgetStyle(transform),
        autoHide: false,
    };
}

export function createDefaultOverlayState(): OverlayState {
    return {
        widgets: [
            createTextWidget('text-widget-1'),
            createIframeWidget('iframe-widget-1', { transform: buildTransformString(200, 150, 0), width: '555px' }),
        ],
        activeWidgetId: null,
    };
}