import React, { useLayoutEffect, useCallback } from 'react';
import { useIdle } from '@reactuses/core';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';

import type { WidgetLayout, WidgetModel } from '../engine/model';
import { useRuntime } from './useRuntime';
import { useLifecycleSignal } from './useLifecycleSignal';
import { StyleAnimator } from './StyleAnimator';
import { widgetRuntimeRegistry } from './WidgetRuntimeRegistry';
import { createDefaultConnections } from '../engine/model/widget';

function combineClassNames(...names: Array<string | undefined | false>) {
    return names.filter(Boolean).join(' ');
}

type WidgetProps = {
    children?: ReactNode;
    widget: WidgetModel;
    containerBounds?: {
        width: number;
        height: number;
    };
    className?: string;
    style?: CSSProperties;
    rootRef?: (element: HTMLDivElement | null) => void;
    onClick?: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onDoubleClick?: () => void;
    onContextMenu?: (event: MouseEvent<HTMLDivElement>) => void;
};

function getAnchorBaseX(anchorX: WidgetLayout['anchorX'], containerWidth: number): number {
    if (anchorX === 'left') return 0;
    if (anchorX === 'center') return containerWidth / 2;
    return containerWidth;
}

function getAnchorBaseY(anchorY: WidgetLayout['anchorY'], containerHeight: number): number {
    if (anchorY === 'top') return 0;
    if (anchorY === 'center') return containerHeight / 2;
    return containerHeight;
}

function getAnchorOffsetX(anchorX: WidgetLayout['anchorX'], width: number): number {
    if (anchorX === 'center') return width / 2;
    if (anchorX === 'right') return width;
    return 0;
}

function getAnchorOffsetY(anchorY: WidgetLayout['anchorY'], height: number): number {
    if (anchorY === 'center') return height / 2;
    if (anchorY === 'bottom') return height;
    return 0;
}

function buildWidgetLayoutStyle(
    layout: WidgetLayout,
    containerBounds: { width: number; height: number },
    effectiveLayout?: WidgetLayout,
    fixedPixelSize?: { widthPx: number; heightPx: number },
): CSSProperties {
    const layoutToUse = effectiveLayout || layout;
    const containerWidth = containerBounds.width;
    const containerHeight = containerBounds.height;
    const widthPx = fixedPixelSize?.widthPx ?? Math.max(0, (layoutToUse.w / 100) * containerWidth);
    const heightPx = fixedPixelSize?.heightPx ?? Math.max(0, (layoutToUse.h / 100) * containerHeight);
    const availableWidth = Math.max(containerWidth - widthPx, 0);
    const availableHeight = Math.max(containerHeight - heightPx, 0);
    const translateX = ((layoutToUse.x / 100) * availableWidth)
        - (layoutToUse.anchorX === 'center' ? widthPx / 2 : layoutToUse.anchorX === 'right' ? widthPx : 0);
    const translateY = ((layoutToUse.y / 100) * availableHeight)
        - (layoutToUse.anchorY === 'center' ? heightPx / 2 : layoutToUse.anchorY === 'bottom' ? heightPx : 0);

    const anchorLeft = layoutToUse.anchorX === 'left' ? '0%' : layoutToUse.anchorX === 'center' ? '50%' : '100%';
    const anchorTop = layoutToUse.anchorY === 'top' ? '0%' : layoutToUse.anchorY === 'center' ? '50%' : '100%';

    return {
        position: 'absolute',
        left: anchorLeft,
        top: anchorTop,
        width: `${widthPx}px`,
        height: `${heightPx}px`,
        transform: `translate(${translateX}px, ${translateY}px) rotate(${layout.rotation}deg)`,
        zIndex: layout.order,
    };
}

export function Widget({
    children,
    widget,
    containerBounds,
    className,
    style,
    rootRef,
    onClick,
    onMouseEnter,
    onMouseLeave,
    onDoubleClick,
    onContextMenu,
}: WidgetProps) {
    const { userRuntime } = useRuntime();
    const isIdle = useIdle(5000);
    const [isHydrated, setIsHydrated] = React.useState(false);
    const baseContainerSizeRef = React.useRef<{ width: number; height: number } | null>(null);
    const fixedSizeRef = React.useRef<{ widthPx: number; heightPx: number } | null>(null);
    const layoutIdRef = React.useRef<string>('');

    // WidgetRuntime: create runtime and set up connections from model
    // 必须在 lifecycle signal 之前注册，否则 mount 信号到达时连接还未建立
    useLayoutEffect(() => {
        const runtime = widgetRuntimeRegistry.getOrCreate(widget.id);
        const connections = widget.connections ?? createDefaultConnections(widget.id);
        runtime.setConnections(connections);

        return () => {
            // Don't dispose here — let OverlayRoot manage lifecycle
        };
    }, [widget.id, widget.connections]);

    // Lifecycle signal — 必须在 connections 注册之后触发
    useLifecycleSignal(widget);

    React.useEffect(() => {
        setIsHydrated(true);
    }, []);

    const fixedAdaptState = React.useMemo(() => {
        if ((widget.layout.adapt !== 'fixed' && widget.layout.adapt !== 'stick') || !containerBounds) {
            return {
                effectiveLayout: undefined as WidgetLayout | undefined,
                fixedPixelSize: undefined as { widthPx: number; heightPx: number } | undefined,
            };
        }

        const currentLayoutId = `${widget.layout.anchorX}-${widget.layout.anchorY}-${widget.layout.x}-${widget.layout.y}-${widget.layout.w}-${widget.layout.h}`;

        if (layoutIdRef.current !== currentLayoutId) {
            const widthPx = Math.max(0, (widget.layout.w / 100) * containerBounds.width);
            const heightPx = Math.max(0, (widget.layout.h / 100) * containerBounds.height);
            fixedSizeRef.current = { widthPx, heightPx };
            baseContainerSizeRef.current = { ...containerBounds };
            layoutIdRef.current = currentLayoutId;
        }

        const baseContainer = baseContainerSizeRef.current;
        const fixedSize = fixedSizeRef.current;

        if (!baseContainer || !fixedSize) {
            return {
                effectiveLayout: undefined as WidgetLayout | undefined,
                fixedPixelSize: undefined as { widthPx: number; heightPx: number } | undefined,
            };
        }

        const baseAvailableWidth = Math.max(baseContainer.width - fixedSize.widthPx, 0);
        const baseAvailableHeight = Math.max(baseContainer.height - fixedSize.heightPx, 0);
        const baseLeft = getAnchorBaseX(widget.layout.anchorX, baseContainer.width)
            - getAnchorOffsetX(widget.layout.anchorX, fixedSize.widthPx)
            + ((widget.layout.x / 100) * baseAvailableWidth);
        const baseTop = getAnchorBaseY(widget.layout.anchorY, baseContainer.height)
            - getAnchorOffsetY(widget.layout.anchorY, fixedSize.heightPx)
            + ((widget.layout.y / 100) * baseAvailableHeight);

        const currentAvailableWidth = Math.max(containerBounds.width - fixedSize.widthPx, 0);
        const currentAvailableHeight = Math.max(containerBounds.height - fixedSize.heightPx, 0);
        const currentBaseX = getAnchorBaseX(widget.layout.anchorX, containerBounds.width);
        const currentBaseY = getAnchorBaseY(widget.layout.anchorY, containerBounds.height);
        const currentOffsetX = getAnchorOffsetX(widget.layout.anchorX, fixedSize.widthPx);
        const currentOffsetY = getAnchorOffsetY(widget.layout.anchorY, fixedSize.heightPx);

        const nextX = currentAvailableWidth > 0
            ? ((baseLeft - currentBaseX + currentOffsetX) / currentAvailableWidth) * 100
            : 0;
        const nextY = currentAvailableHeight > 0
            ? ((baseTop - currentBaseY + currentOffsetY) / currentAvailableHeight) * 100
            : 0;

        return {
            effectiveLayout: {
                ...widget.layout,
                x: Number.isFinite(nextX) ? nextX : 0,
                y: Number.isFinite(nextY) ? nextY : 0,
            },
            fixedPixelSize: fixedSize,
        };
    }, [widget.layout, containerBounds]);

    // Handle stretch-ratio adapt mode: maintain aspect ratio while scaling
    const stretchRatioAdaptState = React.useMemo(() => {
        if (widget.layout.adapt !== 'stretch-ratio' || !containerBounds) {
            return {
                effectiveLayout: undefined as WidgetLayout | undefined,
                fixedPixelSize: undefined as { widthPx: number; heightPx: number } | undefined,
            };
        }

        const currentLayoutId = `${widget.layout.anchorX}-${widget.layout.anchorY}-${widget.layout.x}-${widget.layout.y}-${widget.layout.w}-${widget.layout.h}`;

        if (layoutIdRef.current !== currentLayoutId) {
            const widthPx = Math.max(0, (widget.layout.w / 100) * containerBounds.width);
            const heightPx = Math.max(0, (widget.layout.h / 100) * containerBounds.height);
            fixedSizeRef.current = { widthPx, heightPx };
            baseContainerSizeRef.current = { ...containerBounds };
            layoutIdRef.current = currentLayoutId;
        }

        const baseContainer = baseContainerSizeRef.current;
        const fixedSize = fixedSizeRef.current;

        if (!baseContainer || !fixedSize) {
            return {
                effectiveLayout: undefined as WidgetLayout | undefined,
                fixedPixelSize: undefined as { widthPx: number; heightPx: number } | undefined,
            };
        }

        // Scale uniformly to fit the container while maintaining aspect ratio
        const maxScaleX = containerBounds.width / fixedSize.widthPx;
        const maxScaleY = containerBounds.height / fixedSize.heightPx;
        const scale = Math.min(maxScaleX, maxScaleY);

        const scaledWidth = fixedSize.widthPx * scale;
        const scaledHeight = fixedSize.heightPx * scale;

        // Calculate position based on anchor and layout percentages
        const baseAvailableWidth = Math.max(baseContainer.width - fixedSize.widthPx, 0);
        const baseAvailableHeight = Math.max(baseContainer.height - fixedSize.heightPx, 0);
        const baseLeft = getAnchorBaseX(widget.layout.anchorX, baseContainer.width)
            - getAnchorOffsetX(widget.layout.anchorX, fixedSize.widthPx)
            + ((widget.layout.x / 100) * baseAvailableWidth);
        const baseTop = getAnchorBaseY(widget.layout.anchorY, baseContainer.height)
            - getAnchorOffsetY(widget.layout.anchorY, fixedSize.heightPx)
            + ((widget.layout.y / 100) * baseAvailableHeight);

        // Scale the position relative to container center
        const centerX = containerBounds.width / 2;
        const centerY = containerBounds.height / 2;
        const scaledX = centerX + (baseLeft - baseContainer.width / 2) * scale;
        const scaledY = centerY + (baseTop - baseContainer.height / 2) * scale;

        // Convert back to percentage-based layout
        const currentAvailableWidth = Math.max(containerBounds.width - scaledWidth, 0);
        const currentAvailableHeight = Math.max(containerBounds.height - scaledHeight, 0);
        const currentBaseX = getAnchorBaseX(widget.layout.anchorX, containerBounds.width);
        const currentBaseY = getAnchorBaseY(widget.layout.anchorY, containerBounds.height);
        const currentOffsetX = getAnchorOffsetX(widget.layout.anchorX, scaledWidth);
        const currentOffsetY = getAnchorOffsetY(widget.layout.anchorY, scaledHeight);

        const nextX = currentAvailableWidth > 0
            ? ((scaledX - currentBaseX + currentOffsetX) / currentAvailableWidth) * 100
            : 0;
        const nextY = currentAvailableHeight > 0
            ? ((scaledY - currentBaseY + currentOffsetY) / currentAvailableHeight) * 100
            : 0;

        return {
            effectiveLayout: {
                ...widget.layout,
                x: Number.isFinite(nextX) ? nextX : 0,
                y: Number.isFinite(nextY) ? nextY : 0,
                w: Number.isFinite((scaledWidth / containerBounds.width) * 100) ? (scaledWidth / containerBounds.width) * 100 : 0,
                h: Number.isFinite((scaledHeight / containerBounds.height) * 100) ? (scaledHeight / containerBounds.height) * 100 : 0,
            },
            fixedPixelSize: { widthPx: scaledWidth, heightPx: scaledHeight },
        };
    }, [widget.layout, containerBounds]);

    if (widget.autoHide && isIdle) {
        return null;
    }

    // Mouse handlers that emit user signals
    const handleMouseEnter = useCallback(() => {
        userRuntime.emitMouseEnter(widget.id);
        onMouseEnter?.();
    }, [widget.id, userRuntime, onMouseEnter]);

    const handleMouseLeave = useCallback(() => {
        userRuntime.emitMouseLeave(widget.id);
        onMouseLeave?.();
    }, [widget.id, userRuntime, onMouseLeave]);

    const handleClick = useCallback(() => {
        userRuntime.emitMouseClick(widget.id);
        onClick?.();
    }, [widget.id, userRuntime, onClick]);

    // Determine which adapt state to use
    const activeAdaptState = widget.layout.adapt === 'stretch-ratio'
        ? stretchRatioAdaptState
        : fixedAdaptState;

    return (
        <div
            className={'widget group'}
            ref={rootRef}
            onClick={handleClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onDoubleClick={onDoubleClick}
            onContextMenu={onContextMenu}
            style={{
                ...(isHydrated
                    ? buildWidgetLayoutStyle(
                        widget.layout,
                        containerBounds ?? { width: window.innerWidth, height: window.innerHeight },
                        activeAdaptState.effectiveLayout,
                        activeAdaptState.fixedPixelSize,
                    )
                    : { visibility: 'hidden' }),
            }}
        >
            <StyleAnimator
                widget={widget}
                className={combineClassNames('widget-content', className)}
                style={style}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {children}
            </StyleAnimator>
        </div>
    );
}
