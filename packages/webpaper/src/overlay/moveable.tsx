import Moveable from 'react-moveable';
import { useLayoutEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';

import { Widgetable } from './ables';
import { DEFAULT_SNAP_THRESHOLD } from './constants';
import type { WidgetModel, WidgetableActionEvent } from './types';
import { snapshotTransformFromStyle } from './transform_utils';

type OverlayMoveableProps = {
    activeWidget: WidgetModel | null;
    overlayRef: RefObject<HTMLDivElement | null>;
    widgetElementRef: RefObject<Record<string, HTMLDivElement | null>>;
    widgets: WidgetModel[];
    widgetableConfig?: {
        widgetable?: boolean;
        rotatable?: boolean;
        resizable?: boolean;
    };
    onWidgetableAction: (event: WidgetableActionEvent) => void;
    onWidgetTransformChange: (widgetId: string, transform: WidgetModel['style']) => void;
};

export function OverlayMoveable({
    activeWidget,
    overlayRef,
    widgetElementRef,
    widgets,
    widgetableConfig,
    onWidgetableAction,
    onWidgetTransformChange,
}: OverlayMoveableProps) {
    const moveableRef = useRef<Moveable | null>(null);
    const activeTarget = activeWidget ? widgetElementRef.current[activeWidget.id] : null;

    useLayoutEffect(() => {
        if (!activeWidget || !activeTarget) {
            return;
        }
        moveableRef.current?.updateRect();
    }, [activeWidget, activeTarget, activeWidget?.style.transform, activeWidget?.style.width, activeWidget?.style.height]);

    const elementGuidelines = useMemo(() => {
        if (!activeWidget) {
            return [];
        }

        return widgets
            .filter((widget) => widget.id !== activeWidget.id)
            .map((widget) => widgetElementRef.current[widget.id])
            .filter((element): element is HTMLDivElement => Boolean(element));
    }, [activeWidget, widgetElementRef, widgets]);

    if (!activeTarget || !activeWidget) {
        return null;
    }

    const isSettingsWidget = activeWidget.kind === 'settings';
    const locked = activeWidget?.locked ?? false;
    const widgetable = widgetableConfig?.widgetable ?? (isSettingsWidget ? false : true);
    const rotatable = widgetableConfig?.rotatable ?? (isSettingsWidget ? false : !locked);
    const resizable = widgetableConfig?.resizable ?? !locked;
    const onWidgetableClicked = (type: string) => {
        const event: Record<string, unknown> = {
            type,
            widgetId: activeWidget.id,
            style: snapshotTransformFromStyle(activeTarget.style),
            locked: !activeWidget.locked,
        };
        onWidgetableAction(event as WidgetableActionEvent);
    };
    const commitActiveWidgetTransform = (target: HTMLDivElement) => {
        onWidgetTransformChange(activeWidget.id, snapshotTransformFromStyle(target.style));
    };

    return (
        <Moveable
            ref={moveableRef}
            target={activeTarget}
            // 内置 ables
            draggable={!locked}
            rotatable={rotatable}
            // snappable props
            snappable
            snapGap
            elementGuidelines={elementGuidelines}
            snapDirections={{ left: true, top: true, right: true, bottom: true, center: true, middle: true }}
            elementSnapDirections={{ left: true, top: true, right: true, bottom: true, center: true, middle: true }}
            snapContainer={overlayRef.current || undefined}
            snapThreshold={DEFAULT_SNAP_THRESHOLD}
            bounds={{ position: 'css', left: 0, top: 0, right: 0, bottom: 0 }}
            snapRotationDegrees={[0, 45, 90, 135, 180, 225, 270, 315]}
            // resizable props
            resizable={resizable}
            keepRatio={false}
            throttleResize={1}
            // other props
            origin={false}
            edge={false}

            // 自定义 ables
            ables={[Widgetable]}
            props={{
                widgetable: widgetable,
                locked,
                onWidgetableClicked,
            }}
            preventClickEventOnDrag
            // 不做节流，保持用户交互的实时性
            onDrag={({ target, transform }) => {
                target.style.transform = transform;
            }}
            onResize={({ target, width, height, drag }) => {
                target.style.width = `${width}px`;
                target.style.height = `${height}px`;
                target.style.transform = drag.transform;
            }}
            onRotate={({ target, drag }) => {
                target.style.transform = drag.transform;
            }}
            // 在拖动、缩放、旋转结束时提交最终的 transform 和尺寸
            onDragEnd={({ target }) => commitActiveWidgetTransform(target as HTMLDivElement)}
            onResizeEnd={({ target }) => commitActiveWidgetTransform(target as HTMLDivElement)}
            onRotateEnd={({ target }) => commitActiveWidgetTransform(target as HTMLDivElement)}
        />
    );
}
