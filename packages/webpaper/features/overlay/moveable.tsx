import Moveable from 'react-moveable';
import { useLayoutEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';

import { Widgetable } from './widgetable';
import type { WidgetModel, WidgetableActionEvent } from './types';
import { DEFAULT_SNAP_THRESHOLD } from './registry';

type OverlayMoveableProps = {
    activeWidget: WidgetModel | null;
    hoveredWidget: WidgetModel | null;
    widgetableVisibleWidgetId: string | null;
    overlayRef: RefObject<HTMLDivElement | null>;
    widgetElementRef: RefObject<Record<string, HTMLDivElement | null>>;
    widgets: WidgetModel[];
    widgetableConfig?: {
        widgetable?: boolean;
        rotatable?: boolean;
        roundable?: boolean;
        resizable?: boolean;
        dragTarget?: HTMLElement;
    };
    onWidgetableMouseEnter: (widgetId: string) => void;
    onWidgetableMouseLeave: (widgetId: string) => void;
    onWidgetableAction: (event: WidgetableActionEvent) => void;
    onWidgetLayoutChange: (widgetId: string, target: HTMLElement | null, container: HTMLElement | null) => void;
    onWidgetStyleChange: (widgetId: string, target: HTMLElement | null) => void;
};

export function OverlayMoveable({
    activeWidget,
    hoveredWidget,
    widgetableVisibleWidgetId,
    overlayRef,
    widgetElementRef,
    widgets,
    widgetableConfig,
    onWidgetableMouseEnter,
    onWidgetableMouseLeave,
    onWidgetableAction,
    onWidgetLayoutChange,
    onWidgetStyleChange,
}: OverlayMoveableProps) {
    const moveableRef = useRef<Moveable | null>(null);
    const widgetableRef = useRef<Moveable | null>(null);
    const activeWidgetIdRef = useRef<string | null>(null);
    const activeTarget = activeWidget ? widgetElementRef.current[activeWidget.id] : null;
    const hoveredTarget = hoveredWidget ? widgetElementRef.current[hoveredWidget.id] : null;

    useLayoutEffect(() => {
        if (!activeWidget || !activeTarget) {
            return;
        }

        if (activeWidgetIdRef.current === activeWidget.id) {
            return;
        }

        activeWidgetIdRef.current = activeWidget.id;
        moveableRef.current?.updateRect();
    }, [activeWidget, activeTarget]);

    useLayoutEffect(() => {
        if (!activeWidget) {
            activeWidgetIdRef.current = null;
        }
    }, [activeWidget]);

    const elementGuidelines = useMemo(() => {
        if (!activeWidget) {
            return [];
        }

        return widgets
            .filter((widget) => widget.id !== activeWidget.id)
            .map((widget) => widgetElementRef.current[widget.id])
            .filter((element): element is HTMLDivElement => Boolean(element));
    }, [activeWidget, widgetElementRef, widgets]);

    const locked = activeWidget?.locked ?? false;
    const widgetable = widgetableConfig?.widgetable ?? true;
    const rotatable = widgetableConfig?.rotatable ?? !locked;
    const roundable = widgetableConfig?.roundable ?? !locked;
    const resizable = widgetableConfig?.resizable ?? !locked;
    const draggable = !locked;
    const dragTarget = widgetableConfig?.dragTarget ?? activeTarget ?? undefined;

    const widgetableWidget = widgetableVisibleWidgetId
        ? (activeWidget?.id === widgetableVisibleWidgetId ? activeWidget : hoveredWidget?.id === widgetableVisibleWidgetId ? hoveredWidget : null)
        : null;
    const widgetableTarget = widgetableVisibleWidgetId
        ? (activeWidget?.id === widgetableVisibleWidgetId ? activeTarget : hoveredWidget?.id === widgetableVisibleWidgetId ? hoveredTarget : null)
        : null;
    const widgetableLocked = widgetableWidget?.locked ?? false;

    const onWidgetableClicked = (type: string) => {
        if (!widgetableWidget || !widgetableTarget) {
            return;
        }

        if (!overlayRef.current) {
            return;
        }

        const actionType = type as WidgetableActionEvent['type'];

        if (actionType === 'toggle-widget-lock') {
            onWidgetableAction({
                type: actionType,
                widgetId: widgetableWidget.id,
                locked: !widgetableWidget.locked,
            });
            return;
        }

        if (actionType === 'copy-widget') {
            const layout = widgetableWidget.layout;

            onWidgetableAction({
                type: actionType,
                widgetId: widgetableWidget.id,
                layout,
            });
            return;
        }

        onWidgetableAction({
            type: actionType,
            widgetId: widgetableWidget.id,
        } as WidgetableActionEvent);
    };

    return (
        <>
            {activeTarget && activeWidget
                ? (
                    <Moveable
                        ref={moveableRef}
                        target={activeTarget}
                        draggable={draggable}
                        dragTarget={dragTarget}
                        rotatable={rotatable}
                        roundable={roundable}
                        useMutationObserver={true}
                        useResizeObserver={true}
                        isDisplayShadowRoundControls={'horizontal'}
                        maxRoundControls={[1, 0]}
                        roundClickable={'control'}
                        roundPadding={15}
                        snappable
                        snapGap
                        elementGuidelines={elementGuidelines}
                        snapDirections={{ left: true, top: true, right: true, bottom: true, center: true, middle: true }}
                        elementSnapDirections={{ left: true, top: true, right: true, bottom: true, center: true, middle: true }}
                        snapContainer={overlayRef.current}
                        snapThreshold={DEFAULT_SNAP_THRESHOLD}
                        bounds={{ position: 'css', left: 0, top: 0, right: 0, bottom: 0 }}
                        snapRotationDegrees={[0, 45, 90, 135, 180, 225, 270, 315]}
                        resizable={resizable}
                        keepRatio={false}
                        origin={false}
                        edge={false}
                        preventClickEventOnDrag
                        ables={[Widgetable]}
                        props={{
                            widgetable,
                            locked: widgetableLocked,
                            onWidgetableClicked,
                        }}
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
                        onRound={({ target, borderRadius }) => {
                            target.style.borderRadius = borderRadius;
                        }}
                        onDragEnd={({ target }) => onWidgetLayoutChange(activeWidget.id, target as HTMLElement, overlayRef.current)}
                        onResizeEnd={({ target }) => onWidgetLayoutChange(activeWidget.id, target as HTMLElement, overlayRef.current)}
                        onRotateEnd={({ target }) => onWidgetLayoutChange(activeWidget.id, target as HTMLElement, overlayRef.current)}
                        onRoundEnd={({ target }) => onWidgetStyleChange(activeWidget.id, target as HTMLElement)}
                    />
                )
                : null}

            {(!activeTarget || !activeWidget) && widgetableTarget && widgetableWidget
                ? (
                    <Moveable
                        ref={widgetableRef}
                        target={widgetableTarget}
                        draggable={false}
                        rotatable={false}
                        resizable={false}
                        snappable={false}
                        origin={false}
                        edge={false}
                        hideDefaultLines
                        renderDirections={[]}
                        ables={[Widgetable]}
                        props={{
                            widgetable,
                            locked: widgetableLocked,
                            onWidgetableMouseEnter: () => onWidgetableMouseEnter(widgetableWidget.id),
                            onWidgetableMouseLeave: () => onWidgetableMouseLeave(widgetableWidget.id),
                            onWidgetableClicked,
                        }}
                    />
                )
                : null}
        </>
    );
}