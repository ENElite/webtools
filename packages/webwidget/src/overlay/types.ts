import type { ComponentType, Dispatch } from 'react';

export type WidgetId = string;
export type WidgetKind = 'text' | 'image' | 'video' | 'clock' | 'canvas' | 'html' | 'iframe' | 'live2d';

export type WidgetStyle = {
    borderRadius?: string; // 仅通过 moveable 调整
    opacity?: number;
    backgroundColor?: string;
    backgroundEffect?: 'blur' | 'image' | 'none';
    backgroundImageUrl?: string;
    borderColor?: string;
    borderWidth?: number;
    borderStyle?: 'solid' | 'dot' | 'dash' | 'dotdash';
    shadowRadius?: number;
    shadowColor?: string;
};

export type WidgetPropPrimitive = string | number | boolean | null;
export type WidgetFlatProps = Record<string, WidgetPropPrimitive>;

export type WidgetHorizontalAnchor = 'left' | 'center' | 'right';
export type WidgetVerticalAnchor = 'top' | 'center' | 'bottom';

export type WidgetLayout = {
    anchorX: WidgetHorizontalAnchor;
    anchorY: WidgetVerticalAnchor;
    x: number;
    y: number;
    w: number;
    h: number;
    // 以度为单位的旋转角度（持久化）
    rotation: number;
    adapt: 'stretch' | 'fixed';
};

export type WidgetModel<TProps extends WidgetFlatProps = WidgetFlatProps> = {
    id: WidgetId;
    kind: WidgetKind;
    label: string;
    style: WidgetStyle;
    layout: WidgetLayout;
    props: TProps;
    locked?: boolean;
    autoHide?: boolean;
};

export type OverlayAction =
    | { type: 'set-active'; widgetId: WidgetId | null }
    | { type: 'set-widgets'; widgets: WidgetModel[] }
    | { type: 'add-widget'; widget: WidgetModel }
    | { type: 'remove-widget'; widgetId: WidgetId }
    | { type: 'update-widget'; widgetId: WidgetId; patch: Partial<Omit<WidgetModel, 'id'>> }
    | { type: 'move-widget-up'; widgetId: WidgetId }
    | { type: 'move-widget-down'; widgetId: WidgetId }
    | { type: 'move-widget-to-top'; widgetId: WidgetId }
    | { type: 'move-widget-to-bottom'; widgetId: WidgetId }
    | { type: 'copy-widget'; widgetId: WidgetId; layout?: WidgetLayout };

export type OverlayDispatch = Dispatch<OverlayAction>;

export type SnapAxis = 'x' | 'y';
export type SnapSource = 'edge' | 'widget';

export type SnapGuideline = {
    axis: SnapAxis;
    value: number;
    source: SnapSource;
};

export type WidgetRendererProps<TProps extends WidgetFlatProps = WidgetFlatProps> = {
    widget: WidgetModel<TProps>;
};

export type WidgetRenderer<TProps extends WidgetFlatProps = WidgetFlatProps> = ComponentType<WidgetRendererProps<TProps>>;
export type WidgetRendererMap = Partial<Record<WidgetKind, WidgetRenderer<any>>>;
