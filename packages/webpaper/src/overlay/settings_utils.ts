import type { WidgetModel, WidgetPropPrimitive } from './types';
import { buildTransformString, parseTransformString } from './transform_utils';

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
    };
};

export const splitSettingsValues = (draft: WidgetSettingsDraft, widget: WidgetModel) => {
    const { width, height, x, y, rotation, borderRadius, ...props } = draft;
    return {
        props,
        style: buildWidgetStyleFromDraft({ width, height, x, y, rotation, borderRadius } as WidgetSettingsDraft, widget.style, null),
    };
};
