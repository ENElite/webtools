import { useMemo } from 'react';
import { useElementSize } from '@reactuses/core';

import type { WidgetModel } from '../engine/model';
import { WIDGET_PAGE_REGISTRY, applyChange } from '../engine/editor';
import type { Patch } from '../engine/editor';
import { useOverlayStore } from '../store';
import { SettingsFormPanel } from './settings_panel';

import { UpdateWidgetCommand } from '../engine/commands';
import { resolveWidgetSettingsSchema } from './schema';

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

    return (
        <SettingsFormPanel
            panelKey={sourceWidget.id}
            title={`组件设置 - ${sourceWidget.label}`}
            sourceWidget={sourceWidget}
            schema={schema}
            pages={WIDGET_PAGE_REGISTRY}
            container={container}
            onChange={(patch: Patch) => {
                const widgetPatch = applyChange({}, patch);
                const command = new UpdateWidgetCommand(sourceWidget.id, widgetPatch as any);
                executeCommand(command);
            }}
            onClose={onClose}
        />
    );
}
