'use client';

import { widgetLayoutSchema, widgetStyleSchema } from '@webtools/widget-core';
import type { JsonObject, WidgetEntity } from '@webtools/widget-core';
import { useWidgetRuntime, useWidgetSnapshot } from '@webtools/widget-react';

import { readPath, writePath } from './path';
import { SchemaForm } from './SchemaForm';
import type { InspectorControlCatalog, WidgetInspectorCatalog } from './schema';

interface EditableWidgetRecord extends JsonObject {
    readonly label: string;
    readonly locked: boolean;
    readonly autoHide: boolean;
    readonly props: JsonObject;
    readonly style: JsonObject;
    readonly layout: JsonObject;
}

function toEditableRecord(widget: WidgetEntity): EditableWidgetRecord {
    return {
        label: widget.label,
        locked: widget.locked,
        autoHide: widget.autoHide,
        props: widget.props,
        style: Object.fromEntries(
            Object.entries(widget.style).filter((entry) => entry[1] !== undefined),
        ) as JsonObject,
        layout: { ...widget.layout },
    };
}

export interface WidgetInspectorProps {
    readonly schemas: WidgetInspectorCatalog;
    readonly controls: InspectorControlCatalog;
    readonly widgetId?: string | null;
}

export function WidgetInspector({ schemas, controls, widgetId }: WidgetInspectorProps) {
    const runtime = useWidgetRuntime();
    const snapshot = useWidgetSnapshot();
    const activeId = widgetId ?? runtime.settingsWidgetId ?? runtime.selectedWidgetId;
    const widget = snapshot.document.widgets.find((item) => item.id === activeId);
    if (!widget) return null;
    if (!schemas.has(widget.kind)) return <div className='wt-studio-empty'>该组件没有 Inspector Schema</div>;

    const value = toEditableRecord(widget);
    return (
        <SchemaForm
            value={value}
            schema={schemas.get(widget.kind).schema}
            controls={controls}
            onChange={(path, next) => {
                if (path.startsWith('layout.')) {
                    const changed = writePath(value.layout, path.slice('layout.'.length), next);
                    const parsed = widgetLayoutSchema.safeParse(changed);
                    if (!parsed.success) return;
                    const { order: _order, ...layout } = parsed.data;
                    runtime.engine.dispatch({
                        type: 'widget.layout',
                        widgetId: widget.id,
                        changes: layout,
                    });
                    return;
                }
                if (path.startsWith('props.')) {
                    const changed = writePath(value.props, path.slice('props.'.length), next);
                    runtime.engine.dispatch({
                        type: 'widget.update',
                        widgetId: widget.id,
                        changes: { props: changed },
                    });
                    return;
                }
                if (path.startsWith('style.')) {
                    const changed = writePath(value.style, path.slice('style.'.length), next);
                    const parsed = widgetStyleSchema.safeParse(changed);
                    if (!parsed.success) return;
                    runtime.engine.dispatch({
                        type: 'widget.update',
                        widgetId: widget.id,
                        changes: { style: parsed.data },
                    });
                    return;
                }
                const current = readPath(value, path);
                if (current === next) return;
                if (path === 'label' && typeof next === 'string') {
                    runtime.engine.dispatch({ type: 'widget.update', widgetId: widget.id, changes: { label: next } });
                } else if (path === 'locked' && typeof next === 'boolean') {
                    runtime.engine.dispatch({ type: 'widget.update', widgetId: widget.id, changes: { locked: next } });
                } else if (path === 'autoHide' && typeof next === 'boolean') {
                    runtime.engine.dispatch({ type: 'widget.update', widgetId: widget.id, changes: { autoHide: next } });
                }
            }}
        />
    );
}
