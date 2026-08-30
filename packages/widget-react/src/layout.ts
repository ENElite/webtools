import type { CSSProperties } from 'react';
import type {
    WidgetAnimatedStyleProperty,
    WidgetAnimationSettings,
    WidgetLayout,
    WidgetStyle,
} from '@webtools/widget-core';

const ANIMATED_PROPERTY_CSS_NAMES: Readonly<Record<WidgetAnimatedStyleProperty, string>> = Object.freeze({
    opacity: 'opacity',
    backgroundColor: 'background-color',
    borderRadius: 'border-radius',
    outline: 'outline',
    outlineOffset: 'outline-offset',
    boxShadow: 'box-shadow',
    backdropFilter: 'backdrop-filter',
    backgroundImage: 'background-image',
});

export interface PixelWidgetLayout {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
    readonly rotation: number;
}

function horizontalAnchorBase(anchor: WidgetLayout['anchorX'], containerWidth: number): number {
    if (anchor === 'center') return containerWidth / 2;
    if (anchor === 'right') return containerWidth;
    return 0;
}

function verticalAnchorBase(anchor: WidgetLayout['anchorY'], containerHeight: number): number {
    if (anchor === 'center') return containerHeight / 2;
    if (anchor === 'bottom') return containerHeight;
    return 0;
}

function horizontalAnchorOffset(anchor: WidgetLayout['anchorX'], width: number): number {
    if (anchor === 'center') return width / 2;
    if (anchor === 'right') return width;
    return 0;
}

function verticalAnchorOffset(anchor: WidgetLayout['anchorY'], height: number): number {
    if (anchor === 'center') return height / 2;
    if (anchor === 'bottom') return height;
    return 0;
}

export function layoutToPixels(
    layout: WidgetLayout,
    containerWidth: number,
    containerHeight: number,
): PixelWidgetLayout {
    const width = (layout.w / 100) * containerWidth;
    const height = (layout.h / 100) * containerHeight;
    const availableWidth = containerWidth - width;
    const availableHeight = containerHeight - height;

    return {
        left: horizontalAnchorBase(layout.anchorX, containerWidth)
            - horizontalAnchorOffset(layout.anchorX, width)
            + ((layout.x / 100) * availableWidth),
        top: verticalAnchorBase(layout.anchorY, containerHeight)
            - verticalAnchorOffset(layout.anchorY, height)
            + ((layout.y / 100) * availableHeight),
        width,
        height,
        rotation: layout.rotation,
    };
}

export function pixelsToLayout(
    pixels: PixelWidgetLayout,
    containerWidth: number,
    containerHeight: number,
    source: WidgetLayout,
): Omit<WidgetLayout, 'order'> {
    if (containerWidth <= 0 || containerHeight <= 0) {
        return {
            anchorX: source.anchorX,
            anchorY: source.anchorY,
            x: source.x,
            y: source.y,
            w: source.w,
            h: source.h,
            rotation: source.rotation,
            adapt: source.adapt,
        };
    }

    const width = Math.max(pixels.width, 1);
    const height = Math.max(pixels.height, 1);
    const availableWidth = containerWidth - width;
    const availableHeight = containerHeight - height;
    const x = availableWidth === 0
        ? 0
        : ((pixels.left
            - horizontalAnchorBase(source.anchorX, containerWidth)
            + horizontalAnchorOffset(source.anchorX, width)) / availableWidth) * 100;
    const y = availableHeight === 0
        ? 0
        : ((pixels.top
            - verticalAnchorBase(source.anchorY, containerHeight)
            + verticalAnchorOffset(source.anchorY, height)) / availableHeight) * 100;

    return {
        anchorX: source.anchorX,
        anchorY: source.anchorY,
        x: Number.isFinite(x) ? x : 0,
        y: Number.isFinite(y) ? y : 0,
        w: (width / containerWidth) * 100,
        h: (height / containerHeight) * 100,
        rotation: pixels.rotation,
        adapt: source.adapt,
    };
}

function horizontalPosition(layout: WidgetLayout): string {
    const base = layout.anchorX === 'left' ? 0 : layout.anchorX === 'center' ? 50 : 100;
    const offset = layout.anchorX === 'left' ? 0 : layout.anchorX === 'center' ? layout.w / 2 : layout.w;
    const position = base - offset + ((layout.x / 100) * (100 - layout.w));
    return `${position}%`;
}

function verticalPosition(layout: WidgetLayout): string {
    const base = layout.anchorY === 'top' ? 0 : layout.anchorY === 'center' ? 50 : 100;
    const offset = layout.anchorY === 'top' ? 0 : layout.anchorY === 'center' ? layout.h / 2 : layout.h;
    const position = base - offset + ((layout.y / 100) * (100 - layout.h));
    return `${position}%`;
}

export function layoutToStyle(layout: WidgetLayout, style: WidgetStyle): CSSProperties {
    const position: CSSProperties = {
        position: 'absolute',
        left: horizontalPosition(layout),
        top: verticalPosition(layout),
        width: `${layout.w}%`,
        height: `${layout.h}%`,
        zIndex: layout.order,
        transform: `rotate(${layout.rotation}deg)`,
        transformOrigin: 'center',
    };

    return {
        ...position,
        opacity: style.opacity ?? 1,
        outline: style.outline,
        outlineOffset: style.outlineOffset,
        borderRadius: style.borderRadius,
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImageUrl ? `url("${style.backgroundImageUrl}")` : undefined,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
        boxShadow: style.shadowRadius
            ? `0 0 ${style.shadowRadius}px ${style.shadowColor ?? 'rgba(0,0,0,.5)'}`
            : undefined,
        overflow: style.overflow ? 'hidden' : 'visible',
        backdropFilter: style.backgroundEffect === 'blur' ? 'blur(12px)' : undefined,
    };
}

export function animationToTransitionStyle(
    animation: WidgetAnimationSettings,
    prefersReducedMotion = false,
): CSSProperties {
    if (prefersReducedMotion) return { transition: 'none' };
    const properties = [...new Set(
        animation.animatedProperties.map((property) => ANIMATED_PROPERTY_CSS_NAMES[property]),
    )];
    if (properties.length === 0) return {};

    const transitions = ['visibility 0s linear 180ms'];
    if (!properties.includes('opacity')) transitions.push('opacity 180ms ease');
    transitions.push(...properties.map((property) =>
        `${property} ${animation.duration}s ${animation.easing} ${animation.delay}s`));
    return { transition: transitions.join(', ') };
}

export function applyMoveableTransform(target: HTMLElement | SVGElement, transform: string): void {
    target.style.transform = transform;
}
