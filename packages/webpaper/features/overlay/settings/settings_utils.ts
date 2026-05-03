import type { WidgetModel, WidgetPropPrimitive } from '../types';
import { buildTransformString, parseTransformString } from '../transform_utils';
import { WidgetStyleSettingsKeys } from './schema';

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
    let props: Record<string, WidgetPropPrimitive> = {};
    for (const key in draft) {
        if (key in WidgetStyleSettingsKeys)
            continue;
        props[key] = draft[key] ?? widget.props[key] ?? '';
    }
    const label = typeof draft['label'] === 'string' ? draft['label'] : widget.label;
    const locked = typeof draft['locked'] === 'boolean' ? draft['locked'] : (widget.locked ?? false);
    const autoHide = typeof draft['autoHide'] === 'boolean' ? draft['autoHide'] : (widget.autoHide ?? false);
    return {
        label: label,
        locked: locked,
        autoHide: autoHide,
        style: buildWidgetStyleFromDraft(draft, widget.style, null),
        props,
    };
};