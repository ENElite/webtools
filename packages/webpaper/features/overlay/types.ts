import type { ComponentType, Dispatch } from 'react';

export type WidgetId = string;
export type WidgetKind = 'text' | 'image' | 'video' | 'clock' | 'canvas' | 'html' | 'iframe';

export type WidgetStyle = {
    transform: string;
    width: string;
    height: string;
    borderRadius: string;
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

export type WidgetModel<TProps extends WidgetFlatProps = WidgetFlatProps> = {
    id: WidgetId;
    kind: WidgetKind;
    label: string;
    style: WidgetStyle;
    props: TProps;
    locked?: boolean;
    autoHide?: boolean;
};

export type OverlayState = {
    widgets: WidgetModel[];
    activeWidgetId: WidgetId | null;
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
    | { type: 'copy-widget'; widgetId: WidgetId; style: WidgetStyle };

export type OverlayDispatch = Dispatch<OverlayAction>;

export type WidgetableActionEvent =
    | { type: 'move-widget-up'; widgetId: WidgetId }
    | { type: 'move-widget-down'; widgetId: WidgetId }
    | { type: 'move-widget-to-top'; widgetId: WidgetId }
    | { type: 'move-widget-to-bottom'; widgetId: WidgetId }
    | { type: 'remove-widget'; widgetId: WidgetId }
    | { type: 'reset-widget-rotation'; widgetId: WidgetId; style: WidgetStyle }
    | { type: 'toggle-widget-lock'; widgetId: WidgetId; locked: boolean }
    | { type: 'copy-widget'; widgetId: WidgetId; style: WidgetStyle }
    | { type: 'open-widget-settings'; widgetId: WidgetId };

export type SnapAxis = 'x' | 'y';
export type SnapSource = 'edge' | 'widget';

export type SnapGuideline = {
    axis: SnapAxis;
    value: number;
    source: SnapSource;
};

export type WidgetRendererProps<TProps extends WidgetFlatProps = WidgetFlatProps> = {
    widget: WidgetModel<TProps>;
    active: boolean;
};

export type WidgetRenderer<TProps extends WidgetFlatProps = WidgetFlatProps> = ComponentType<WidgetRendererProps<TProps>>;
export type WidgetRendererMap = Partial<Record<WidgetKind, WidgetRenderer<any>>>;