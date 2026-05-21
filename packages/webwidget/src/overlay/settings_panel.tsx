import { useMemo } from 'react';
import { useElementSize } from '@reactuses/core';

import type { WidgetModel, WidgetPropPrimitive } from './types';
import { useOverlayStore } from '../store';
import { SettingsFormPanel } from '../components/settings';

import { UpdateWidgetCommand } from './commands';
import { WidgetLayoutSettingsKeys, WidgetStyleSettingsKeys, resolveWidgetSettingsSchema } from './schema';
import { layoutFromPx, pxFromLayout } from './transform_utils';

type SettingsPanelProps = {
    sourceWidget: WidgetModel;
    container: HTMLElement;
    onClose: () => void;
};

export function SettingsPanel({ sourceWidget, container, onClose }: SettingsPanelProps) {
    const executeCommand = useOverlayStore((state) => state.executeCommand);
    const [width, height] = useElementSize(container);

    const schema = useMemo(() => {
        return resolveWidgetSettingsSchema(sourceWidget.kind) ?? [];
    }, [sourceWidget.kind]);

    const value = useMemo(() => buildWidgetSettingsDraft(sourceWidget), [sourceWidget]);

    return (
        <SettingsFormPanel
            panelKey={sourceWidget.id}
            title={`组件设置 - ${sourceWidget.label}`}
            value={value}
            schema={schema}
            container={container}
            onChange={(nextDraft) => {
                const patch = splitSettingsValues(nextDraft, sourceWidget, { width, height });
                const command = new UpdateWidgetCommand(sourceWidget.id, patch as any);
                executeCommand(command);
            }}
            onClose={onClose}
        />
    );
}

export type WidgetSettingsDraft = Record<string, WidgetPropPrimitive>;

export const splitSettingsValues = (
    draft: WidgetSettingsDraft,
    widget: WidgetModel,
    containerBounds?: { width: number; height: number },
): Omit<WidgetModel, 'id' | 'kind'> => {
    let props: Record<string, WidgetPropPrimitive> = {};
    for (const key in draft) {
        if (key === 'id') continue;
        if (WidgetStyleSettingsKeys.includes(key as any) || WidgetLayoutSettingsKeys.includes(key as any))
            continue;
        props[key] = draft[key] ?? widget.props[key] ?? '';
    }
    const label = typeof draft['label'] === 'string' ? draft['label'] : widget.label;
    const locked = typeof draft['locked'] === 'boolean' ? draft['locked'] : (widget.locked ?? false);
    const autoHide = typeof draft['autoHide'] === 'boolean' ? draft['autoHide'] : (widget.autoHide ?? false);
    const { style, layout } = buildWidgetStyle(draft, widget.style, widget.layout, containerBounds);
    return {
        label,
        locked,
        autoHide,
        style,
        props,
        layout,
    };
};

export function buildWidgetSettingsDraft(widget: WidgetModel): WidgetSettingsDraft {
    const anchorX = widget.layout?.anchorX ?? 'left';
    const anchorY = widget.layout?.anchorY ?? 'top';
    const adapt = widget.layout?.adapt ?? 'fixed';

    return {
        id: widget.id,
        label: widget.label,
        locked: widget.locked ?? false,
        autoHide: widget.autoHide ?? false,
        ...widget.props,
        anchorX,
        anchorY,
        adapt,
        opacity: widget.style.opacity ?? 1,
        backgroundColor: widget.style.backgroundColor ?? 'rgba(255, 255, 255, 0)',
        backgroundEffect: widget.style.backgroundEffect ?? 'none',
        backgroundImageUrl: widget.style.backgroundImageUrl ?? '',
        borderColor: widget.style.borderColor ?? '#38bdf8',
        borderWidth: widget.style.borderWidth ?? 0,
        borderStyle: widget.style.borderStyle ?? 'solid',
        shadowRadius: widget.style.shadowRadius ?? 0,
        shadowColor: widget.style.shadowColor ?? 'rgba(0, 0, 0, 0.5)',
    };
}

export const buildWidgetStyle = (
    draft: WidgetSettingsDraft,
    fallbackStyle: WidgetModel['style'],
    fallbackLayout: WidgetModel['layout'],
    containerBounds?: { width: number; height: number },
): { style: WidgetModel['style']; layout: WidgetModel['layout'] } => {
    const nextLayout: WidgetModel['layout'] = {
        ...fallbackLayout,
        anchorX: (draft['anchorX'] as WidgetModel['layout']['anchorX']) || fallbackLayout.anchorX,
        anchorY: (draft['anchorY'] as WidgetModel['layout']['anchorY']) || fallbackLayout.anchorY,
        adapt: (draft['adapt'] as WidgetModel['layout']['adapt']) || fallbackLayout.adapt,
    };

    const layout =
        containerBounds && containerBounds.width > 0 && containerBounds.height > 0
            ? layoutFromPx(
                pxFromLayout(fallbackLayout, containerBounds.width, containerBounds.height),
                containerBounds.width,
                containerBounds.height,
                nextLayout.anchorX,
                nextLayout.anchorY,
                nextLayout.adapt,
            )
            : nextLayout;

    const rawBorderRadius = parseFloat(fallbackStyle.borderRadius ?? '0');
    const style: WidgetModel['style'] = {
        borderRadius: `${rawBorderRadius}px`,
        opacity:
            typeof draft['opacity'] === 'number'
                ? clamp(draft['opacity'], 0, 1)
                : fallbackStyle.opacity ?? 1,
        backgroundColor:
            typeof draft['backgroundColor'] === 'string'
                ? draft['backgroundColor']
                : fallbackStyle.backgroundColor ?? 'rgba(255, 255, 255, 0)',
        backgroundEffect:
            (typeof draft['backgroundEffect'] === 'string'
                ? (draft['backgroundEffect'] as WidgetModel['style']['backgroundEffect'])
                : fallbackStyle.backgroundEffect) ?? 'none',
        backgroundImageUrl:
            typeof draft['backgroundImageUrl'] === 'string'
                ? draft['backgroundImageUrl']
                : fallbackStyle.backgroundImageUrl ?? '',
        borderColor:
            typeof draft['borderColor'] === 'string'
                ? draft['borderColor']
                : fallbackStyle.borderColor ?? '#38bdf8',
        borderWidth:
            typeof draft['borderWidth'] === 'number'
                ? draft['borderWidth']
                : fallbackStyle.borderWidth ?? 0,
        borderStyle:
            (typeof draft['borderStyle'] === 'string'
                ? (draft['borderStyle'] as WidgetModel['style']['borderStyle'])
                : fallbackStyle.borderStyle) ?? 'solid',
        shadowRadius:
            typeof draft['shadowRadius'] === 'number'
                ? draft['shadowRadius']
                : fallbackStyle.shadowRadius ?? 0,
        shadowColor:
            typeof draft['shadowColor'] === 'string'
                ? draft['shadowColor']
                : fallbackStyle.shadowColor ?? 'rgba(0, 0, 0, 0.5)',
    };

    return { style, layout };
};

export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}
