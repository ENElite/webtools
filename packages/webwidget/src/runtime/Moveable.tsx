import Moveable from 'react-moveable';
import { useCallback, useMemo, useRef } from 'react';
import type { RefObject } from 'react';

import { Widgetable } from './ables/widgetable';
import { Dimensionable } from './ables/dimensionable';
import type { WidgetModel } from '../engine/model';
import { DEFAULT_SNAP_THRESHOLD } from '../engine/model/widget';

import { useWidgetAction, WidgetActionEvent } from '../store';

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
    onWidgetSettingsClick: () => void;
    onWidgetLayoutChange: (widgetId: string, target: HTMLElement | null, container: HTMLElement | null) => void;
    onWidgetStyleChange: (widgetId: string, target: HTMLElement | null) => void;
};

export function OverlayMoveable({
    activeWidget,
    hoveredWidget,
    overlayRef,
    widgetElementRef,
    widgets,
    widgetableConfig,
    onWidgetableMouseEnter,
    onWidgetableMouseLeave,
    onWidgetSettingsClick,
    onWidgetLayoutChange,
    onWidgetStyleChange,
}: OverlayMoveableProps) {
    const moveableRef = useRef<Moveable | null>(null);
    const hoverableRef = useRef<Moveable | null>(null);
    const activeTarget = activeWidget ? widgetElementRef.current[activeWidget.id] : null;
    const hoveredTarget = hoveredWidget ? widgetElementRef.current[hoveredWidget.id] : null;

    const elementGuidelines = useMemo(() => {
        if (!activeWidget) {
            return [];
        }

        const otherElements = widgets
            .filter((widget) => widget.id !== activeWidget.id)
            .map((widget) => widgetElementRef.current[widget.id])
            .filter((element): element is HTMLDivElement => Boolean(element));

        if (overlayRef?.current) {
            return [overlayRef.current, ...otherElements];
        }

        return otherElements;
    }, [activeWidget, widgetElementRef, widgets, overlayRef]);

    const locked = activeWidget?.locked ?? false;
    const widgetable = widgetableConfig?.widgetable ?? true;
    const rotatable = widgetableConfig?.rotatable ?? !locked;
    const roundable = widgetableConfig?.roundable ?? !locked;
    const resizable = widgetableConfig?.resizable ?? !locked;
    const draggable = !locked;

    const widgetableLocked = activeWidget?.locked ?? false;
    const {
        toggleLock, resetRotation,
        moveUp, moveDown, moveToTop, moveToBottom,
        remove, copy,
    } = useWidgetAction();

    const callbacks = useMemo(() => ({
        'toggle-widget-lock': toggleLock,
        'copy-widget': copy,
        'move-widget-up': moveUp,
        'move-widget-down': moveDown,
        'move-widget-to-top': moveToTop,
        'move-widget-to-bottom': moveToBottom,
        'remove-widget': remove,
        'reset-widget-rotation': resetRotation,
    }), [toggleLock, copy, moveUp, moveDown, moveToTop, moveToBottom, remove, resetRotation]);

    const onWidgetableClicked = useCallback((type: string) => {
        const widgetableWidget = activeWidget || hoveredWidget;
        if (!widgetableWidget) {
            return;
        }
        const actionType = type as WidgetActionEvent['type'];

        if (actionType === 'toggle-widget-lock') {
            toggleLock(widgetableWidget.id, !widgetableWidget.locked);
            return;
        }

        if (actionType === 'open-widget-settings') {
            onWidgetSettingsClick?.();
            return;
        }

        callbacks[actionType](widgetableWidget.id);
    }, [activeWidget, hoveredWidget, toggleLock, onWidgetSettingsClick, callbacks]);

    const onDrag = useCallback((e: { target: HTMLElement | SVGElement; transform: string }) => {
        e.target.style.transform = e.transform;
    }, []);

    const onResize = useCallback((e: { target: HTMLElement | SVGElement; width: number; height: number; drag: { transform: string } }) => {
        e.target.style.width = `${e.width}px`;
        e.target.style.height = `${e.height}px`;
        e.target.style.transform = e.drag.transform;
    }, []);

    const onRotate = useCallback((e: { target: HTMLElement | SVGElement; drag: { transform: string } }) => {
        e.target.style.transform = e.drag.transform;
    }, []);

    const onRound = useCallback((e: { target: HTMLElement | SVGElement; borderRadius: string }) => {
        e.target.style.borderRadius = e.borderRadius;
        if (activeWidget) {
            onWidgetStyleChange(activeWidget.id, e.target as HTMLElement);
        }
    }, [activeWidget, onWidgetStyleChange]);

    const onDragEnd = useCallback((e: { target: HTMLElement | SVGElement }) => {
        if (activeWidget) {
            onWidgetLayoutChange(activeWidget.id, e.target as HTMLElement, overlayRef.current);
        }
    }, [activeWidget, onWidgetLayoutChange, overlayRef]);

    const onResizeEnd = useCallback((e: { target: HTMLElement | SVGElement }) => {
        if (activeWidget) {
            onWidgetLayoutChange(activeWidget.id, e.target as HTMLElement, overlayRef.current);
        }
    }, [activeWidget, onWidgetLayoutChange, overlayRef]);

    const onRotateEnd = useCallback((e: { target: HTMLElement | SVGElement }) => {
        if (activeWidget) {
            onWidgetLayoutChange(activeWidget.id, e.target as HTMLElement, overlayRef.current);
        }
    }, [activeWidget, onWidgetLayoutChange, overlayRef]);

    const activeProps = useMemo(() => ({
        widgetable,
        locked: widgetableLocked,
        onWidgetableClicked,
        dimensionable: true,
        position: 'top-right',
        padding: 2,
    }), [widgetable, widgetableLocked, onWidgetableClicked]);

    return (
        <>
            {activeWidget
                ? (
                    <Moveable
                        ref={moveableRef}
                        target={activeTarget}
                        draggable={draggable}
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
                        ables={[Widgetable, Dimensionable]}
                        props={activeProps}
                        onDrag={onDrag}
                        onResize={onResize}
                        onRotate={onRotate}
                        onRound={onRound}
                        onDragEnd={onDragEnd}
                        onResizeEnd={onResizeEnd}
                        onRotateEnd={onRotateEnd}
                    />
                )
                : null}

            {(!activeWidget) && hoveredWidget
                ? (
                    <Moveable
                        ref={hoverableRef}
                        target={hoveredTarget}
                        draggable={false}
                        rotatable={false}
                        resizable={false}
                        snappable={false}
                        origin={false}
                        edge={false}
                        hideDefaultLines
                        renderDirections={[]}
                        ables={[Widgetable, Dimensionable]}
                        props={{
                            widgetable,
                            dimensionable: true,
                            locked: widgetableLocked,
                            onMouseEnter: () => onWidgetableMouseEnter(hoveredWidget.id),
                            onMouseLeave: () => onWidgetableMouseLeave(hoveredWidget.id),
                            onWidgetableClicked,
                        }}
                    />
                )
                : null}
        </>
    );
}
