import type { WidgetStyle } from './types';

const TRANSFORM_REGEX = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)\s*rotate\(([-\d.]+)deg\)/;

type TransformParts = {
    x: number;
    y: number;
    rotation: number;
};

export function buildTransformString(x: number, y: number, rotation: number): string {
    return `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
}

export function parseTransformString(transform: string): TransformParts {
    const match = TRANSFORM_REGEX.exec(transform);
    if (!match) {
        return { x: 0, y: 0, rotation: 0 };
    }

    const [, x = '0', y = '0', rotation = '0'] = match;
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
    };
}
