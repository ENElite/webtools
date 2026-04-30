import type { WidgetStyle } from './types';

const TRANSLATE_REGEX = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/;
const ROTATE_REGEX = /rotate\(([-\d.]+)deg\)/;

type TransformParts = {
    x: number;
    y: number;
    rotation: number;
};

export function buildTransformString(x: number, y: number, rotation: number): string {
    return `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
}

export function parseTransformString(transform: string): TransformParts {
    const translateMatch = TRANSLATE_REGEX.exec(transform);
    const rotateMatch = ROTATE_REGEX.exec(transform);

    const x = translateMatch?.[1] ?? '0';
    const y = translateMatch?.[2] ?? '0';
    const rotation = rotateMatch?.[1] ?? '0';

    return {
        x: parseFloat(x),
        y: parseFloat(y),
        rotation: parseFloat(rotation),
    };
}

export function normalizeSizeToPx(size: string, fallback = 0): string {
    const value = parseFloat(size);
    const safeValue = Number.isFinite(value) ? value : fallback;
    return `${safeValue}px`;
}

export function snapshotTransformFromStyle(style: CSSStyleDeclaration): WidgetStyle {
    return {
        transform: style.transform,
        width: style.width,
        height: style.height,
        borderRadius: style.borderRadius,
        color: style.color,
        opacity: style.opacity ? parseFloat(style.opacity) : undefined,
    } satisfies WidgetStyle;
}