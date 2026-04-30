import type { WidgetModel, WidgetPropPrimitive } from '../types';
import { buildTransformString, parseTransformString } from '../transform_utils';

export type WidgetSettingsDraft = Record<string, WidgetPropPrimitive>;

export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

export const readDraftNumber = (draft: WidgetSettingsDraft, key: string, fallback: number) => {
    const nextValue = draft[key];
    return typeof nextValue === 'number' ? nextValue : fallback;
};

export const buildWidgetStyleFromDraft = (
    draft: WidgetSettingsDraft,
    fallbackStyle: WidgetModel['style'],
    overlayBounds: { width: number; height: number } | null
): WidgetModel['style'] => {
    const fallbackTransform = parseTransformString(fallbackStyle.transform);
    const rawBorderRadius = readDraftNumber(draft, 'borderRadius', Number.parseFloat(fallbackStyle.borderRadius) || 0);
    const rawWidth = readDraftNumber(draft, 'width', Number.parseFloat(fallbackStyle.width) || 0);
    const rawHeight = readDraftNumber(draft, 'height', Number.parseFloat(fallbackStyle.height) || 0);
    const rawX = readDraftNumber(draft, 'x', fallbackTransform.x);
    const rawY = readDraftNumber(draft, 'y', fallbackTransform.y);
    const rawRotation = readDraftNumber(draft, 'rotation', fallbackTransform.rotation);

    const maxWidth = overlayBounds?.width ?? Number.POSITIVE_INFINITY;
    const maxHeight = overlayBounds?.height ?? Number.POSITIVE_INFINITY;
    const width = clamp(rawWidth, 0, maxWidth);
    const height = clamp(rawHeight, 0, maxHeight);
    const x = clamp(rawX, 0, Math.max(0, maxWidth - width));
    const y = clamp(rawY, 0, Math.max(0, maxHeight - height));
    const rotation = ((rawRotation % 360) + 360) % 360;

    return {
        borderRadius: `${rawBorderRadius}px`,
        width: `${width}px`,
        height: `${height}px`,
        transform: buildTransformString(x, y, rotation),
        color: typeof draft['color'] === 'string' ? draft['color'] : (fallbackStyle.color ?? '#f8fafc'),
        opacity: typeof draft['opacity'] === 'number' ? clamp(draft['opacity'], 0, 1) : (fallbackStyle.opacity ?? 1),
        backgroundColor: typeof draft['backgroundColor'] === 'string' ? draft['backgroundColor'] : fallbackStyle.backgroundColor ?? 'rgba(255, 255, 255, 0)',
        backgroundEffect: typeof draft['backgroundEffect'] === 'string' ? draft['backgroundEffect'] as WidgetModel['style']['backgroundEffect'] : (fallbackStyle.backgroundEffect ?? 'none'),
        backgroundImageUrl: typeof draft['backgroundImageUrl'] === 'string' ? draft['backgroundImageUrl'] : (fallbackStyle.backgroundImageUrl ?? ''),
        borderColor: typeof draft['borderColor'] === 'string' ? draft['borderColor'] : (fallbackStyle.borderColor ?? '#38bdf8'),
        borderWidth: typeof draft['borderWidth'] === 'number' ? draft['borderWidth'] : (fallbackStyle.borderWidth ?? 0),
        borderStyle: typeof draft['borderStyle'] === 'string' ? draft['borderStyle'] as WidgetModel['style']['borderStyle'] : (fallbackStyle.borderStyle ?? 'solid'),
        shadowRadius: typeof draft['shadowRadius'] === 'number' ? draft['shadowRadius'] : (fallbackStyle.shadowRadius ?? 0),
        shadowColor: typeof draft['shadowColor'] === 'string' ? draft['shadowColor'] : (fallbackStyle.shadowColor ?? 'rgba(0, 0, 0, 0.5)'),
    };
};

export const splitSettingsValues = (draft: WidgetSettingsDraft, widget: WidgetModel) => {
    const {
        width,
        height,
        x,
        y,
        rotation,
        borderRadius,
        color,
        opacity,
        id: _id,
        label,
        locked,
        autoHide,
        backgroundColor,
        backgroundEffect,
        backgroundImageUrl,
        borderColor,
        borderWidth,
        borderStyle,
        shadowRadius,
        shadowColor,
        ...props
    } = draft;

    return {
        label: typeof label === 'string' ? label : widget.label,
        props,
        locked: typeof locked === 'boolean' ? locked : (widget.locked ?? false),
        autoHide: typeof autoHide === 'boolean' ? autoHide : (widget.autoHide ?? false),
        style: buildWidgetStyleFromDraft({
            width,
            height,
            x,
            y,
            rotation,
            borderRadius,
            color,
            opacity,
            backgroundColor,
            backgroundEffect,
            backgroundImageUrl,
            borderColor,
            borderWidth,
            borderStyle,
            shadowRadius,
            shadowColor,
        } as unknown as WidgetSettingsDraft, widget.style, null),
    };
};