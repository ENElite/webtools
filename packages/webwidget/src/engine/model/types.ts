import type { ComponentType } from 'react';
import type { Connection } from './bindings';

// ── 基础标识 ──────────────────────────────────────────────

export type WidgetId = string;

// Branded string type for extensible widget kinds
export type WidgetKind = string & { readonly __brand: unique symbol };

// Built-in widget kinds as constants
export const WidgetKinds = {
    TEXT: 'text' as WidgetKind,
    IMAGE: 'image' as WidgetKind,
    VIDEO: 'video' as WidgetKind,
    CLOCK: 'clock' as WidgetKind,
    CANVAS: 'canvas' as WidgetKind,
    HTML: 'html' as WidgetKind,
    IFRAME: 'iframe' as WidgetKind,
    LIVE2D: 'live2d' as WidgetKind,
} as const;

// ── Props ─────────────────────────────────────────────────

export type WidgetPropPrimitive = string | number | boolean | Record<string, unknown>;
export type WidgetFlatProps = Record<string, WidgetPropPrimitive>;

// ── Widget 样式 ───────────────────────────────────────────

export type WidgetStyle = {
    outline?: string;
    borderRadius?: string;
    outlineOffset?: string;
    opacity?: number;
    backgroundColor?: string;
    backgroundEffect?: 'blur' | 'image' | 'none';
    backgroundImageUrl?: string;
    shadowRadius?: number;
    shadowColor?: string;
    overflow?: boolean;
};

// ── Widget 布局 ───────────────────────────────────────────

export type WidgetHorizontalAnchor = 'left' | 'center' | 'right';
export type WidgetVerticalAnchor = 'top' | 'center' | 'bottom';

export type WidgetLayout = {
    anchorX: WidgetHorizontalAnchor;
    anchorY: WidgetVerticalAnchor;
    x: number;
    y: number;
    w: number;
    h: number;
    rotation: number;
    adapt: 'stretch' | 'fixed' | 'stretch-ratio' | 'stick';
    order: number;
};

// ── Widget 动画 ───────────────────────────────────────────

/**
 * 动画设置 — 控制 widget.style 属性的过渡动画
 */
export type WidgetAnimationSettings = {
    /** 缓动曲线 */
    easing?: string;
    /** 过渡时长（秒） */
    duration?: number;
    /** 过渡延迟（秒） */
    delay?: number;
    /** 启用过渡动画的 CSS 属性列表 */
    animatedProperties?: string[];
};

// ── Widget 模型 ───────────────────────────────────────────

export type WidgetModel<TProps extends WidgetFlatProps = WidgetFlatProps> = {
    id: WidgetId;
    kind: WidgetKind;
    label: string;
    style: WidgetStyle;
    layout: WidgetLayout;
    props: TProps;
    locked?: boolean;
    autoHide?: boolean;
    /** Qt 风格信号槽连接 */
    connections?: Connection[];
    /** 动画设置（framer-motion 过渡配置） */
    animation?: WidgetAnimationSettings;
};

// ── 渲染器 ────────────────────────────────────────────────

export type WidgetRendererProps<TProps extends WidgetFlatProps = WidgetFlatProps> = {
    widget: WidgetModel<TProps>;
};

export type WidgetRenderer<TProps extends WidgetFlatProps = WidgetFlatProps> = ComponentType<WidgetRendererProps<TProps>>;
export type WidgetRendererMap = Partial<Record<WidgetKind, WidgetRenderer<any>>>;
