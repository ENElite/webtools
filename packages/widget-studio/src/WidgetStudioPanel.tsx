'use client';

import { Drawer } from 'antd';
import type { ReactNode } from 'react';
import { useWidgetRuntime, useWidgetSnapshot } from '@webtools/widget-react';

import { WidgetInspector } from './WidgetInspector';
import type { InspectorControlCatalog, WidgetInspectorCatalog } from './schema';

export interface WidgetStudioPanelProps {
    readonly schemas: WidgetInspectorCatalog;
    readonly controls: InspectorControlCatalog;
    readonly container?: HTMLElement | null;
    readonly extra?: ReactNode;
}

export function WidgetStudioPanel({ schemas, controls, container, extra }: WidgetStudioPanelProps) {
    const runtime = useWidgetRuntime();
    const snapshot = useWidgetSnapshot();
    const widget = snapshot.document.widgets.find((item) => item.id === runtime.settingsWidgetId);
    return (
        <Drawer
            open={Boolean(widget)}
            title={widget ? `编辑：${widget.label}` : '编辑组件'}
            placement='right'
            width={560}
            getContainer={container ?? false}
            onClose={runtime.closeSettings}
            extra={extra}
            destroyOnHidden
        >
            {widget ? <WidgetInspector widgetId={widget.id} schemas={schemas} controls={controls} /> : null}
        </Drawer>
    );
}
