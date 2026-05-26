import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { useIdle } from '@reactuses/core';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';

import type { WidgetLayout, WidgetModel } from '../engine/model';
import { buildPreset, getMotionTransition } from '../engine/animation/presets';
import { useRuntime } from './useRuntime';
import { useLifecycleSignal } from './useLifecycleSignal';
import { useVisualMotionState } from './useVisualMotionState';
import { registerControls } from './runtimes/controlsRegistry';

function combineClassNames(...names: Array<string | undefined | false>) {
    return names.filter(Boolean).join(' ');
}

function buildGlitchStyle(intensity: number): CSSProperties {
    const offset = 4 * intensity;
    return {
        animation: `glitch-flicker 0.15s infinite`,
        '--glitch-offset': `${offset}px`,
    } as CSSProperties;
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
    if (anchorX === 'left') {
        return 0;
    }

    if (anchorX === 'center') {
        return containerWidth / 2;
    }

    return containerWidth;
}

function getAnchorBaseY(anchorY: WidgetLayout['anchorY'], containerHeight: number): number {
    if (anchorY === 'top') {
        return 0;
    }

    if (anchorY === 'center') {
        return containerHeight / 2;
    }

    return containerHeight;
}

function getAnchorOffsetX(anchorX: WidgetLayout['anchorX'], width: number): number {
    if (anchorX === 'center') {
        return width / 2;
    }

    if (anchorX === 'right') {
        return width;
    }

    return 0;
}

function getAnchorOffsetY(anchorY: WidgetLayout['anchorY'], height: number): number {
    if (anchorY === 'center') {
        return height / 2;
    }

    if (anchorY === 'bottom') {
        return height;
    }

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
    };
}

function buildWidgetVisualStyle(widget: WidgetModel): CSSProperties {
    const backgroundColor = widget.style.backgroundColor ?? 'rgba(255, 255, 255, 0)';
    const opacity = widget.style.opacity ?? 1;
    const backgroundEffect = widget.style.backgroundEffect ?? 'none';
    const backgroundImageUrl = widget.style.backgroundImageUrl ?? '';
    const shadowRadius = widget.style.shadowRadius ?? 0;
    const shadowColor = widget.style.shadowColor ?? 'rgba(0, 0, 0, 0.5)';

    const style: CSSProperties = {
        borderRadius: widget.style.borderRadius,
        outline: widget.style.outline,
        outlineOffset: widget.style.outlineOffset,
        opacity,
        backgroundColor,
        boxShadow: shadowRadius > 0 ? `0 0 ${shadowRadius}px ${shadowColor}` : 'none',
        overflow: 'hidden',
    };

    if (backgroundEffect === 'blur') {
        style.backdropFilter = 'blur(8px)';
    }

    if (backgroundEffect === 'image' && backgroundImageUrl) {
        style.backgroundImage = `url(${backgroundImageUrl})`;
        style.backgroundSize = 'cover';
        style.backgroundPosition = 'center';
        style.backgroundRepeat = 'no-repeat';
    }

    return style;
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
    const { userRuntime, animationRuntime } = useRuntime();
    const isIdle = useIdle(5000);
    const [isHydrated, setIsHydrated] = React.useState(false);
    const controls = useAnimationControls();
    const baseContainerSizeRef = React.useRef<{ width: number; height: number } | null>(null);
    const fixedSizeRef = React.useRef<{ widthPx: number; heightPx: number } | null>(null);
    const layoutIdRef = React.useRef<string>('');

    // Register controls for AnimationRuntime
    useEffect(() => {
        return registerControls(widget.id, controls);
    }, [widget.id, controls]);

    // Lifecycle signal
    useLifecycleSignal(widget);

    // Compile animations when widget.animation changes
    useEffect(() => {
        return animationRuntime.compile(widget.id, widget.animation);
    }, [widget.id, widget.animation, animationRuntime]);

    // Visual motion state for declarative framer-motion rendering
    const motionState = useVisualMotionState(widget.id);

    React.useEffect(() => {
        setIsHydrated(true);
    }, []);

    const fixedAdaptState = React.useMemo(() => {
        if (widget.layout.adapt !== 'fixed' || !containerBounds) {
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

    // Build mount/unmount animation presets
    const mountSlots = (widget.animation ?? []).filter(
        (s) => s.signal.source === 'lifecycle' && s.signal.type === 'mount',
    );
    const unmountSlots = (widget.animation ?? []).filter(
        (s) => s.signal.source === 'lifecycle' && s.signal.type === 'unmount',
    );

    const firstMountConfig = mountSlots[0]?.motion;
    const mountPreset = firstMountConfig ? buildPreset(firstMountConfig) : undefined;
    const unmountPreset = unmountSlots[0]?.motion ? buildPreset(unmountSlots[0].motion) : undefined;

    const initial = mountPreset?.initial as Record<string, unknown> | undefined;

    // Check for glitch effect
    const hasGlitch = mountSlots.some((s) => s.motion.effect === 'glitch');
    const glitchIntensity = mountSlots.find((s) => s.motion.effect === 'glitch')?.motion.intensity ?? 1;
    const glitchStyle = hasGlitch ? buildGlitchStyle(glitchIntensity) : undefined;

    // Determine animate target:
    // 1. visualStateRuntime state (WidgetSignal-driven)
    // 2. mount preset animate (declarative mount animation)
    // 3. controls (imperative, for user/system signal animations)
    const hasVisualState = Object.keys(motionState.animate).length > 0;
    const animateTarget = hasVisualState
        ? motionState.animate
        : mountPreset
            ? mountPreset.animate as Record<string, unknown>
            : controls;

    const transitionConfig = hasVisualState
        ? motionState.transition
        : firstMountConfig
            ? getMotionTransition(firstMountConfig.motionType, firstMountConfig)
            : undefined;

    const visualStyle = buildWidgetVisualStyle(widget);
    const needsPresence = mountPreset || unmountPreset;

    const motionDiv = (
        <motion.div
            key={widget.id}
            className={combineClassNames('widget-content', className)}
            style={{
                userSelect: 'none',
                touchAction: 'none',
                width: '100%',
                height: '100%',
                ...visualStyle,
                ...glitchStyle,
                ...style,
            }}
            initial={initial as any}
            animate={animateTarget as any}
            exit={unmountPreset?.exit as any}
            transition={transitionConfig as any}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}
        </motion.div>
    );

    return (
        <div
            className={'widget group'}
            ref={rootRef}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onDoubleClick={onDoubleClick}
            onContextMenu={onContextMenu}
            style={{
                ...(isHydrated
                    ? buildWidgetLayoutStyle(
                        widget.layout,
                        containerBounds ?? { width: window.innerWidth, height: window.innerHeight },
                        fixedAdaptState.effectiveLayout,
                        fixedAdaptState.fixedPixelSize,
                    )
                    : { visibility: 'hidden' }),
            }}
        >
            {needsPresence ? (
                <AnimatePresence>
                    {motionDiv}
                </AnimatePresence>
            ) : motionDiv}
        </div>
    );
}
