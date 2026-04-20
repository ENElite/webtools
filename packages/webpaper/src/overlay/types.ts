import type { ComponentType, Dispatch } from 'react';

export type WidgetId = string;
export type WidgetKind = 'text' | 'image' | 'canvas' | 'iframe';

export type WidgetStyle = {
    transform: string;
    width: string;
    height: string;
};

export type WidgetBounds = {
    width: number;
    height: number;
};

export type WidgetModel<TProps = unknown> = {
    id: WidgetId;
    kind: WidgetKind;
    style: WidgetStyle;
    props: TProps;
    locked?: boolean;
};

export type OverlayState = {
    widgets: WidgetModel[];
    activeWidgetId: WidgetId | null;
    bounds: WidgetBounds | null;
};

export type OverlayAction =
    | { type: 'set-active'; widgetId: WidgetId | null }
    | { type: 'set-bounds'; bounds: WidgetBounds | null }
    | { type: 'set-widgets'; widgets: WidgetModel[] }
    | { type: 'add-widget'; widget: WidgetModel }
    | { type: 'remove-widget'; widgetId: WidgetId }
    | { type: 'update-widget'; widgetId: WidgetId; patch: Partial<Omit<WidgetModel, 'id'>> }
    | { type: 'move-widget-up'; widgetId: WidgetId }
    | { type: 'move-widget-down'; widgetId: WidgetId }
    | { type: 'move-widget-to-top'; widgetId: WidgetId }
    | { type: 'move-widget-to-bottom'; widgetId: WidgetId }
    | { type: 'copy-widget'; widgetId: WidgetId; transform: WidgetStyle };

export type OverlayDispatch = Dispatch<OverlayAction>;

export type WidgetableActionEvent =
    | { type: 'move-widget-up'; widgetId: WidgetId }
    | { type: 'move-widget-down'; widgetId: WidgetId }
    | { type: 'move-widget-to-top'; widgetId: WidgetId }
    | { type: 'move-widget-to-bottom'; widgetId: WidgetId }
    | { type: 'remove-widget'; widgetId: WidgetId }
    | { type: 'reset-widget-rotation'; widgetId: WidgetId; style: WidgetStyle }
    | { type: 'toggle-widget-lock'; widgetId: WidgetId; locked: boolean }
    | { type: 'open-widget-settings'; widgetId: WidgetId }
    | { type: 'copy-widget'; widgetId: WidgetId; style: WidgetStyle };

export type SnapAxis = 'x' | 'y';
export type SnapSource = 'edge' | 'widget';

export type SnapGuideline = {
    axis: SnapAxis;
    value: number;
    source: SnapSource;
};

export type WidgetRendererProps<TProps = unknown> = {
    widget: WidgetModel<TProps>;
    active: boolean;
};

export type WidgetRenderer<TProps = unknown> = ComponentType<WidgetRendererProps<TProps>>;
export type WidgetRendererMap = Partial<Record<WidgetKind, WidgetRenderer<any>>>;
