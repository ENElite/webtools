'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import Moveable from 'react-moveable';
import type { WidgetEntity } from '@webtools/widget-core';

import { useWidgetRuntime, useWidgetSnapshot } from './context';
import { WidgetErrorBoundary } from './ErrorBoundary';
import {
    applyMoveableTransform,
    animationToTransitionStyle,
    layoutToPixels,
    layoutToStyle,
    pixelsToLayout,
} from './layout';
import type { PixelWidgetLayout } from './layout';
import type { WidgetViewCatalog } from './catalog';
import { Dimensionable } from './ables/Dimensionable';
import { Orderable } from './ables/Orderable';
import { Widgetable } from './ables/Widgetable';
import type { WidgetableAction } from './ables/Widgetable';

const SNAP_THRESHOLD = 8;
const SNAP_DIRECTIONS = Object.freeze({
    left: true,
    top: true,
    right: true,
    bottom: true,
    center: true,
    middle: true,
});

interface InteractionSnapshot {
    readonly widget: WidgetEntity;
    readonly target: HTMLElement;
    readonly containerWidth: number;
    readonly containerHeight: number;
    readonly start: PixelWidgetLayout;
    pending: PixelWidgetLayout | null;
}

export interface WidgetCanvasProps {
    readonly className?: string;
    readonly style?: CSSProperties;
    readonly idleAfterMs?: number;
    readonly onWidgetContextMenu?: (widget: WidgetEntity, event: ReactMouseEvent<HTMLElement>) => void;
}

function isTextEditingTarget(target: EventTarget | null): boolean {
    return target instanceof HTMLElement
        && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

function isFinitePixels(pixels: PixelWidgetLayout): boolean {
    return Object.values(pixels).every(Number.isFinite)
        && pixels.width > 0
        && pixels.height > 0;
}

function WidgetRenderer({
    widget,
    selected,
    views,
}: {
    readonly widget: WidgetEntity;
    readonly selected: boolean;
    readonly views: WidgetViewCatalog;
}) {
    const View = views.get(widget.kind).View;
    return <View widget={widget} selected={selected} />;
}

function usePrefersReducedMotion(): boolean {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        if (typeof window.matchMedia !== 'function') return;
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setPrefersReducedMotion(media.matches);
        update();
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, []);

    return prefersReducedMotion;
}

export function WidgetCanvas({ className, style, idleAfterMs = 4_000, onWidgetContextMenu }: WidgetCanvasProps) {
    const runtime = useWidgetRuntime();
    const snapshot = useWidgetSnapshot();
    const containerRef = useRef<HTMLDivElement>(null);
    const moveableRef = useRef<Moveable>(null);
    const elementRefs = useRef(new Map<string, HTMLDivElement>());
    const interactionRef = useRef<InteractionSnapshot | null>(null);
    const pendingBorderRadiusRef = useRef<string | null>(null);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [idle, setIdle] = useState(false);
    const prefersReducedMotion = usePrefersReducedMotion();

    const widgets = useMemo(
        () => [...snapshot.document.widgets].sort((a, b) => a.layout.order - b.layout.order),
        [snapshot.document.widgets],
    );
    const selected = widgets.find((widget) => widget.id === runtime.selectedWidgetId) ?? null;
    const selectedElement = selected ? elementRefs.current.get(selected.id) ?? null : null;
    const selectedLayout = selected?.layout ?? null;

    useLayoutEffect(() => {
        if (!runtime.editable || !selectedElement || !selectedLayout) return;
        moveableRef.current?.updateRect();
    }, [runtime.editable, selectedElement, selectedLayout]);

    useEffect(() => {
        if (!runtime.editable || !selectedElement) return;
        const container = containerRef.current;
        let animationFrame: number | null = null;
        const updateControlRect = () => {
            moveableRef.current?.updateRect();
            if (animationFrame !== null && typeof cancelAnimationFrame === 'function') {
                cancelAnimationFrame(animationFrame);
            }
            if (typeof requestAnimationFrame !== 'function') return;
            animationFrame = requestAnimationFrame(() => {
                animationFrame = null;
                moveableRef.current?.updateRect();
            });
        };
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateControlRect);
        if (container) observer?.observe(container);
        observer?.observe(selectedElement);
        window.addEventListener('resize', updateControlRect);
        return () => {
            observer?.disconnect();
            window.removeEventListener('resize', updateControlRect);
            if (animationFrame !== null && typeof cancelAnimationFrame === 'function') {
                cancelAnimationFrame(animationFrame);
            }
        };
    }, [runtime.editable, selectedElement]);

    const resetIdle = useCallback(() => {
        setIdle(false);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => setIdle(true), idleAfterMs);
    }, [idleAfterMs]);

    useEffect(() => {
        resetIdle();
        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
    }, [resetIdle]);

    const beginInteraction = useCallback((target: HTMLElement | SVGElement): InteractionSnapshot | null => {
        const container = containerRef.current;
        if (!selected || !container || !(target instanceof HTMLElement)) return null;
        const containerRect = container.getBoundingClientRect();
        if (containerRect.width <= 0 || containerRect.height <= 0) return null;
        const interaction: InteractionSnapshot = {
            widget: selected,
            target,
            containerWidth: containerRect.width,
            containerHeight: containerRect.height,
            start: layoutToPixels(selected.layout, containerRect.width, containerRect.height),
            pending: null,
        };
        interactionRef.current = interaction;
        resetIdle();
        return interaction;
    }, [resetIdle, selected]);

    const previewInteraction = useCallback((pixels: PixelWidgetLayout, translateX: number, translateY: number) => {
        const interaction = interactionRef.current;
        if (!interaction || !isFinitePixels(pixels)) return;
        interaction.pending = pixels;
        interaction.target.style.width = `${pixels.width}px`;
        interaction.target.style.height = `${pixels.height}px`;
        applyMoveableTransform(
            interaction.target,
            `translate(${translateX}px, ${translateY}px) rotate(${pixels.rotation}deg)`,
        );
    }, []);

    const finishInteraction = useCallback(() => {
        const interaction = interactionRef.current;
        if (!interaction) return;
        interactionRef.current = null;

        // Remove imperative preview values before the external store publishes.
        // This also restores the target when an interaction ends without moving.
        interaction.target.style.width = `${interaction.widget.layout.w}%`;
        interaction.target.style.height = `${interaction.widget.layout.h}%`;
        applyMoveableTransform(interaction.target, `rotate(${interaction.widget.layout.rotation}deg)`);
        if (!interaction.pending) return;

        runtime.engine.dispatch({
            type: 'widget.layout',
            widgetId: interaction.widget.id,
            changes: pixelsToLayout(
                interaction.pending,
                interaction.containerWidth,
                interaction.containerHeight,
                interaction.widget.layout,
            ),
        });
    }, [runtime.engine]);

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
        resetIdle();
        if (!runtime.editable || isTextEditingTarget(event.target)) return;
        const commandKey = event.ctrlKey || event.metaKey;
        if (commandKey && event.key.toLowerCase() === 'z') {
            event.preventDefault();
            if (event.shiftKey) runtime.engine.redo();
            else runtime.engine.undo();
            return;
        }
        if (commandKey && event.key.toLowerCase() === 'y') {
            event.preventDefault();
            runtime.engine.redo();
            return;
        }
        if ((event.key === 'Delete' || event.key === 'Backspace') && selected && !event.repeat) {
            event.preventDefault();
            runtime.engine.dispatch({ type: 'widget.remove', widgetId: selected.id });
            runtime.selectWidget(null);
        }
    }, [resetIdle, runtime, selected]);

    const runWidgetableAction = useCallback((action: WidgetableAction) => {
        if (!selected) return;
        const index = widgets.findIndex((widget) => widget.id === selected.id);
        if (index < 0) return;

        if (action === 'move-up' || action === 'move-down' || action === 'move-top' || action === 'move-bottom') {
            const toIndex = action === 'move-up'
                ? Math.min(index + 1, widgets.length - 1)
                : action === 'move-down'
                    ? Math.max(index - 1, 0)
                    : action === 'move-top'
                        ? widgets.length - 1
                        : 0;
            if (toIndex !== index) {
                runtime.engine.dispatch({ type: 'widget.reorder', widgetId: selected.id, toIndex });
            }
            return;
        }
        if (action === 'reset-rotation') {
            runtime.engine.dispatch({ type: 'widget.layout', widgetId: selected.id, changes: { rotation: 0 } });
            return;
        }
        if (action === 'toggle-lock') {
            runtime.engine.dispatch({ type: 'widget.update', widgetId: selected.id, changes: { locked: !selected.locked } });
            return;
        }
        if (action === 'copy') {
            const { order: _order, ...layout } = selected.layout;
            const result = runtime.engine.dispatch({
                type: 'widget.add',
                at: index + 1,
                widget: {
                    kind: selected.kind,
                    label: `${selected.label} 副本`,
                    props: selected.props,
                    style: selected.style,
                    animation: selected.animation,
                    layout: { ...layout, x: layout.x + 2, y: layout.y + 2 },
                    locked: selected.locked,
                    autoHide: selected.autoHide,
                },
            });
            const added = result.events.find((event) => event.type === 'widget.added');
            if (added) runtime.selectWidget(added.widgetId);
            return;
        }
        if (action === 'remove') {
            runtime.selectWidget(null);
            runtime.engine.dispatch({ type: 'widget.remove', widgetId: selected.id });
            return;
        }
        runtime.requestSettings(selected.id);
    }, [runtime, selected, widgets]);

    return (
        <div
            ref={containerRef}
            className={['wt-widget-canvas', className].filter(Boolean).join(' ')}
            style={style}
            tabIndex={runtime.editable ? 0 : undefined}
            onKeyDown={handleKeyDown}
            onPointerMove={resetIdle}
            onWheel={resetIdle}
            onPointerDown={(event) => {
                resetIdle();
                if (event.target === event.currentTarget) runtime.selectWidget(null);
            }}
        >
            {widgets.map((widget) => {
                const isSelected = widget.id === runtime.selectedWidgetId;
                const hiddenByIdle = idle && widget.autoHide && !isSelected;
                return (
                    <div
                        key={widget.id}
                        ref={(element) => {
                            if (element) elementRefs.current.set(widget.id, element);
                            else elementRefs.current.delete(widget.id);
                        }}
                        data-widget-id={widget.id}
                        data-widget-kind={widget.kind}
                        data-selected={isSelected || undefined}
                        data-auto-hidden={hiddenByIdle || undefined}
                        className='wt-widget-frame'
                        style={{
                            ...layoutToStyle(widget.layout, widget.style),
                            ...animationToTransitionStyle(widget.animation, prefersReducedMotion),
                        }}
                        onPointerDown={(event) => {
                            event.stopPropagation();
                            if (runtime.editable) runtime.selectWidget(widget.id);
                        }}
                        onDoubleClick={() => runtime.editable && runtime.requestSettings(widget.id)}
                        onContextMenu={(event) => {
                            if (runtime.editable) {
                                event.preventDefault();
                                event.stopPropagation();
                                runtime.requestSettings(widget.id);
                            }
                            onWidgetContextMenu?.(widget, event);
                        }}
                    >
                        <WidgetErrorBoundary resetKey={widget}>
                            <WidgetRenderer widget={widget} selected={isSelected} views={runtime.views} />
                        </WidgetErrorBoundary>
                    </div>
                );
            })}

            {runtime.editable && selected && selectedElement ? (
                <Moveable
                    ref={moveableRef}
                    target={selectedElement}
                    draggable={!selected.locked}
                    resizable={!selected.locked}
                    rotatable={!selected.locked}
                    snappable
                    snapGap
                    snapThreshold={SNAP_THRESHOLD}
                    snapContainer={containerRef.current}
                    snapDirections={SNAP_DIRECTIONS}
                    elementSnapDirections={SNAP_DIRECTIONS}
                    verticalGuidelines={['50%']}
                    horizontalGuidelines={['50%']}
                    snapRotationDegrees={[0, 45, 90, 135, 180, 225, 270, 315]}
                    elementGuidelines={widgets
                        .filter((widget) => widget.id !== selected.id)
                        .map((widget) => elementRefs.current.get(widget.id))
                        .filter((element): element is HTMLDivElement => Boolean(element))}
                    bounds={{ position: 'css', left: 0, top: 0, right: 0, bottom: 0 }}
                    origin={false}
                    keepRatio={selected.layout.adapt === 'stretch-ratio'}
                    useResizeObserver
                    useMutationObserver
                    roundable={!selected.locked}
                    roundClickable='control'
                    isDisplayShadowRoundControls='horizontal'
                    maxRoundControls={[1, 0]}
                    roundPadding={14}
                    ables={[Widgetable, Dimensionable, Orderable]}
                    props={{
                        widgetable: true,
                        dimensionable: true,
                        orderable: true,
                        widgetLocked: selected.locked,
                        widgetOrder: selected.layout.order,
                        widgetablePosition: 'bottom-left',
                        dimensionablePosition: 'top-right',
                        orderablePosition: 'top-left',
                        widgetablePadding: 8,
                        dimensionablePadding: 8,
                        orderablePadding: 8,
                        onWidgetableAction: runWidgetableAction,
                    }}
                    onDragStart={(event) => {
                        if (beginInteraction(event.target)) event.set([0, 0]);
                    }}
                    onDrag={(event) => {
                        const interaction = interactionRef.current;
                        if (!interaction) return;
                        const translateX = event.beforeTranslate[0] ?? 0;
                        const translateY = event.beforeTranslate[1] ?? 0;
                        previewInteraction({
                            ...interaction.start,
                            left: interaction.start.left + translateX,
                            top: interaction.start.top + translateY,
                        }, translateX, translateY);
                    }}
                    onDragEnd={finishInteraction}
                    onResizeStart={(event) => {
                        const interaction = beginInteraction(event.target);
                        if (!interaction) return;
                        event.set([interaction.start.width, interaction.start.height]);
                        if (event.dragStart) event.dragStart.set([0, 0]);
                    }}
                    onResize={(event) => {
                        const interaction = interactionRef.current;
                        if (!interaction) return;
                        const translateX = event.drag.beforeTranslate[0] ?? 0;
                        const translateY = event.drag.beforeTranslate[1] ?? 0;
                        previewInteraction({
                            ...interaction.start,
                            left: interaction.start.left + translateX,
                            top: interaction.start.top + translateY,
                            width: event.width,
                            height: event.height,
                        }, translateX, translateY);
                    }}
                    onResizeEnd={finishInteraction}
                    onRotateStart={(event) => {
                        const interaction = beginInteraction(event.target);
                        if (!interaction) return;
                        event.set(interaction.start.rotation);
                        if (event.dragStart) event.dragStart.set([0, 0]);
                    }}
                    onRotate={(event) => {
                        const interaction = interactionRef.current;
                        if (!interaction) return;
                        const translateX = event.drag.beforeTranslate[0] ?? 0;
                        const translateY = event.drag.beforeTranslate[1] ?? 0;
                        previewInteraction({
                            ...interaction.start,
                            left: interaction.start.left + translateX,
                            top: interaction.start.top + translateY,
                            rotation: event.rotation,
                        }, translateX, translateY);
                    }}
                    onRotateEnd={finishInteraction}
                    onRoundStart={() => {
                        pendingBorderRadiusRef.current = selected.style.borderRadius ?? '0px';
                        resetIdle();
                    }}
                    onRound={(event) => {
                        pendingBorderRadiusRef.current = event.borderRadius;
                        event.target.style.borderRadius = event.borderRadius;
                    }}
                    onRoundEnd={() => {
                        const borderRadius = pendingBorderRadiusRef.current;
                        pendingBorderRadiusRef.current = null;
                        if (borderRadius !== null) {
                            runtime.engine.dispatch({
                                type: 'widget.update',
                                widgetId: selected.id,
                                changes: { style: { borderRadius } },
                            });
                        }
                    }}
                />
            ) : null}
        </div>
    );
}
