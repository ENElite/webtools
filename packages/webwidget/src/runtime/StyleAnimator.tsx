/**
 * StyleAnimator — CSS 属性动画代理组件
 *
 * 将 widget.style 分为两组：
 * - animatedProps: 在 transition 配置中的属性 → 放入 animate prop（有过渡动画）
 * - staticProps: 不在 transition 中的属性 → 放入 style prop（立即变化）
 *
 * 这样未选中的属性不会被 framer-motion 默认过渡影响。
 */

import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';
import type { WidgetModel } from '../engine/model';
import { StyleAnimateProvider } from './StyleAnimatorContext';

type AnimationSettings = NonNullable<WidgetModel['animation']>;

// ─── 所有可动画属性 ───────────────────────────────────────────────────────────

const ALL_ANIMATABLE_PROPS = new Set([
    'opacity', 'backgroundColor', 'borderRadius', 'outline', 'outlineOffset',
    'boxShadow', 'backdropFilter', 'backgroundImage',
]);

// ─── 完整 style 构建 ──────────────────────────────────────────────────────────

function buildFullStyle(widget: WidgetModel): CSSProperties {
    const backgroundColor = widget.style.backgroundColor ?? 'rgba(255, 255, 255, 0)';
    const opacity = widget.style.opacity ?? 1;
    const backgroundEffect = widget.style.backgroundEffect ?? 'none';
    const backgroundImageUrl = widget.style.backgroundImageUrl ?? '';
    const shadowRadius = widget.style.shadowRadius ?? 0;
    const shadowColor = widget.style.shadowColor ?? 'rgba(0, 0, 0, 0.5)';

    const style: CSSProperties = {
        opacity,
        backgroundColor,
        borderRadius: widget.style.borderRadius,
        outline: widget.style.outline,
        outlineOffset: widget.style.outlineOffset,
        boxShadow: shadowRadius > 0 ? `0 0 ${shadowRadius}px ${shadowColor}` : 'none',
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

// ─── framer-motion 缓动名称转换 ──────────────────────────────────────────────

function toFramerEasing(easing: string): string {
    switch (easing) {
        case 'ease-in': return 'easeIn';
        case 'ease-out': return 'easeOut';
        case 'ease-in-out': return 'easeInOut';
        default: return easing;
    }
}

// ─── 分离 animated / static 属性 ─────────────────────────────────────────────

function splitStyle(
    fullStyle: CSSProperties,
    animation: AnimationSettings | undefined,
): { animated: CSSProperties; static: CSSProperties } {
    const animated: CSSProperties = {};
    const staticProps: CSSProperties = {};

    // 获取选中的动画属性列表
    const animatedProps = animation?.animatedProperties ?? [...ALL_ANIMATABLE_PROPS];
    const animatedSet = new Set(animatedProps);

    for (const [key, value] of Object.entries(fullStyle)) {
        if (ALL_ANIMATABLE_PROPS.has(key)) {
            if (animatedSet.has(key)) {
                animated[key] = value;
            } else {
                staticProps[key] = value;
            }
        } else {
            // 非动画属性（overflow 等）始终放 style
            staticProps[key] = value;
        }
    }

    return { animated, static: staticProps };
}

// ─── transition 构建 ──────────────────────────────────────────────────────────

function buildTransition(animation: AnimationSettings | undefined): Record<string, unknown> | undefined {
    if (!animation) return undefined;

    const duration = animation.duration ?? 0.3;
    const easing = toFramerEasing(animation.easing ?? 'ease-out');
    const delay = animation.delay ?? 0;
    const animatedProps = animation.animatedProperties;

    if (!animatedProps || animatedProps.length === 0) return undefined;

    const transition: Record<string, unknown> = {};
    for (const prop of animatedProps) {
        transition[prop] = { duration, ease: easing, delay };
    }
    return transition;
}

// ─── 入场动画 CSS ─────────────────────────────────────────────────────────────

const MOUNT_FADE_KEYFRAMES = `
@keyframes widget-mount-fade {
    from { opacity: 0; }
    to { opacity: var(--target-opacity, 1); }
}
`;

// ─── 组件 ─────────────────────────────────────────────────────────────────────

export type StyleAnimatorProps = {
    widget: WidgetModel;
    className?: string;
    style?: CSSProperties;
    children?: ReactNode;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
};

export function StyleAnimator({
    widget,
    className,
    style: externalStyle,
    children,
    onMouseEnter,
    onMouseLeave,
}: StyleAnimatorProps) {
    const fullStyle = useMemo(() => buildFullStyle(widget), [widget.style]);
    const transition = useMemo(() => buildTransition(widget.animation), [widget.animation]);
    const { animated, static: staticStyle } = useMemo(
        () => splitStyle(fullStyle, widget.animation),
        [fullStyle, widget.animation],
    );

    // 入场动画
    const [mountClass, setMountClass] = useState<string>('');
    useEffect(() => {
        if (!document.getElementById('widget-mount-keyframes')) {
            const style = document.createElement('style');
            style.id = 'widget-mount-keyframes';
            style.textContent = MOUNT_FADE_KEYFRAMES;
            document.head.appendChild(style);
        }
        requestAnimationFrame(() => {
            setMountClass('widget-mount-animate');
        });
    }, []);

    // 允许 widget style 中的 overflow 控制容器裁剪行为
    const overflow = widget.style.overflow === true
        ? 'visible' as const
        : 'hidden' as const;

    return (
        <StyleAnimateProvider value={fullStyle}>
            <style>{`
                .widget-mount-animate {
                    animation: widget-mount-fade 1s ease-out 0.5s both;
                    --target-opacity: ${fullStyle.opacity ?? 1};
                }
            `}</style>
            <motion.div
                className={[className, mountClass].filter(Boolean).join(' ')}
                style={{
                    userSelect: 'none',
                    touchAction: 'none',
                    width: '100%',
                    height: '100%',
                    overflow,
                    ...staticStyle,
                    ...externalStyle,
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                animate={animated as any}
                transition={transition}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                {children}
            </motion.div>
        </StyleAnimateProvider>
    );
}
