'use client';

import type { ReactNode } from 'react';
import { Drawer } from '@webtools/ui';
import { useWidgetRuntime, useWidgetSnapshot } from '@webtools/widget-react';

import { WidgetInspector } from './WidgetInspector';
import type { InspectorControlCatalog, WidgetInspectorCatalog } from './schema';

export interface WidgetStudioPanelProps {
    readonly schemas: WidgetInspectorCatalog;
    readonly controls: InspectorControlCatalog;
    readonly extra?: ReactNode;
}

export function WidgetStudioPanel({ schemas, controls, extra }: WidgetStudioPanelProps) {
    const runtime = useWidgetRuntime();
    const snapshot = useWidgetSnapshot();
    const widget = snapshot.document.widgets.find((item) => item.id === runtime.settingsWidgetId);
    return (
        <Drawer
            open={Boolean(widget)}
            title={widget ? `编辑：${widget.label}` : '编辑组件'}
            placement='right'
            size='lg'
            onOpenChange={(open) => {
                if (!open) runtime.closeSettings();
            }}
            className='wt-studio-inspector-drawer'
        >
            {extra ? <div className='wt-studio-inspector-extra'>{extra}</div> : null}
            {widget ? <WidgetInspector widgetId={widget.id} schemas={schemas} controls={controls} /> : null}
        </Drawer>
    );
}
