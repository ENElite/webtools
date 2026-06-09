import { useMemo } from 'react';
import { useElementSize } from '@reactuses/core';

import type { WidgetModel } from '../engine/model';
import { WIDGET_PAGE_REGISTRY } from '../engine/editor';
import type { Patch } from '../engine/editor';
import { useOverlayStore } from '../store';
import { SettingsFormPanel } from '../components/settings';

import { UpdateWidgetCommand } from '../engine/commands';
import { resolveWidgetSettingsSchema } from './schema';
import { pxFromLayout } from './transform_utils';

type SettingsPanelProps = {
    sourceWidget: WidgetModel;
    container: HTMLElement;
    onClose: () => void;
};

/**
 * When the anchor changes, x/y percentages are relative to the new anchor point.
 * To keep the widget at the same pixel position, recompute x/y:
 *   1. Compute pixel position with old anchor
 *   2. Convert back to percentages with new anchor
 */
function compensateAnchorChange(
    sourceWidget: WidgetModel,
    patch: Patch,
    containerWidth: number,
    containerHeight: number
): Patch {
    const set = patch.set ?? {};
    const newAnchorX = (set['layout.anchorX'] ?? sourceWidget.layout.anchorX) as typeof sourceWidget.layout.anchorX;
    const newAnchorY = (set['layout.anchorY'] ?? sourceWidget.layout.anchorY) as typeof sourceWidget.layout.anchorY;
    const oldAnchorX = sourceWidget.layout.anchorX;
    const oldAnchorY = sourceWidget.layout.anchorY;

    const anchorChanged = newAnchorX !== oldAnchorX || newAnchorY !== oldAnchorY;
    if (!anchorChanged || containerWidth === 0 || containerHeight === 0) {
        return patch;
    }

    // Compute pixel position with old anchor
    const px = pxFromLayout(sourceWidget.layout, containerWidth, containerHeight);

    // Convert back with new anchor — use layoutFromPx logic inline
    const w = Math.max(0, px.w);
    const h = Math.max(0, px.h);
    const availableWidth = Math.max(containerWidth - w, 0);
    const availableHeight = Math.max(containerHeight - h, 0);

    function anchorBaseX(anchor: typeof newAnchorX): number {
        if (anchor === 'left') return 0;
        if (anchor === 'center') return containerWidth / 2;
        return containerWidth;
    }
    function anchorBaseY(anchor: typeof newAnchorY): number {
        if (anchor === 'top') return 0;
        if (anchor === 'center') return containerHeight / 2;
        return containerHeight;
    }
    function anchorOffsetX(anchor: typeof newAnchorX, width: number): number {
        if (anchor === 'center') return width / 2;
        if (anchor === 'right') return width;
        return 0;
    }
    function anchorOffsetY(anchor: typeof newAnchorY, height: number): number {
        if (anchor === 'center') return height / 2;
        if (anchor === 'bottom') return height;
        return 0;
    }

    const newX = availableWidth > 0
        ? ((px.x - anchorBaseX(newAnchorX) + anchorOffsetX(newAnchorX, w)) / availableWidth) * 100
        : 0;
    const newY = availableHeight > 0
        ? ((px.y - anchorBaseY(newAnchorY) + anchorOffsetY(newAnchorY, h)) / availableHeight) * 100
        : 0;

    return {
        ...patch,
        set: {
            ...set,
            'layout.anchorX': newAnchorX,
            'layout.anchorY': newAnchorY,
            'layout.x': Number.isFinite(newX) ? newX : sourceWidget.layout.x,
            'layout.y': Number.isFinite(newY) ? newY : sourceWidget.layout.y,
        },
    };
}

export function SettingsPanel({ sourceWidget, container, onClose }: SettingsPanelProps) {
    const executeCommand = useOverlayStore((state) => state.executeCommand);
    const containerSize = useElementSize(container);

    const schema = useMemo(() => {
        return resolveWidgetSettingsSchema(sourceWidget.kind) ?? [];
    }, [sourceWidget.kind]);

    const containerWidth = containerSize[0] || container.clientWidth || window.innerWidth;
    const containerHeight = containerSize[1] || container.clientHeight || window.innerHeight;

    return (
        <SettingsFormPanel
            panelKey={sourceWidget.id}
            title={`组件设置 - ${sourceWidget.label}`}
            sourceWidget={sourceWidget}
            schema={schema}
            pages={WIDGET_PAGE_REGISTRY}
            container={container}
            onChange={(patch: Patch) => {
                const finalPatch = compensateAnchorChange(sourceWidget, patch, containerWidth, containerHeight);
                const command = new UpdateWidgetCommand(sourceWidget.id, finalPatch);
                executeCommand(command);
            }}
            onClose={onClose}
        />
    );
}
