'use client';

import { EmptyState } from '@webtools/ui';
import { widgetAnimationSchema, widgetLayoutSchema, widgetStyleSchema } from '@webtools/widget-core';
import type { JsonObject, JsonValue, WidgetEntity, WidgetOperation } from '@webtools/widget-core';
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
    readonly animation: JsonObject;
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
        animation: {
            easing: widget.animation.easing,
            duration: widget.animation.duration,
            delay: widget.animation.delay,
            animatedProperties: [...widget.animation.animatedProperties],
            entry: {
                effect: widget.animation.entry.effect,
                direction: widget.animation.entry.direction,
                duration: widget.animation.entry.duration,
                delay: widget.animation.entry.delay,
                easing: widget.animation.entry.easing,
            },
        },
        layout: { ...widget.layout },
    };
}

export function createWidgetInspectorOperation(
    widget: WidgetEntity,
    path: string,
    next: JsonValue | undefined,
): WidgetOperation | null {
    const value = toEditableRecord(widget);
    if (readPath(value, path) === next) return null;
    if (path.startsWith('layout.')) {
        const changed = writePath(value.layout, path.slice('layout.'.length), next);
        const parsed = widgetLayoutSchema.safeParse(changed);
        if (!parsed.success) return null;
        const { order: _order, ...layout } = parsed.data;
        return { type: 'widget.layout', widgetId: widget.id, changes: layout };
    }
    if (path.startsWith('props.')) {
        const changed = writePath(value.props, path.slice('props.'.length), next);
        return { type: 'widget.update', widgetId: widget.id, changes: { props: changed } };
    }
    if (path.startsWith('style.')) {
        const changed = writePath(value.style, path.slice('style.'.length), next);
        const parsed = widgetStyleSchema.safeParse(changed);
        return parsed.success
            ? { type: 'widget.update', widgetId: widget.id, changes: { style: parsed.data } }
            : null;
    }
    if (path.startsWith('animation.')) {
        const changed = writePath(value.animation, path.slice('animation.'.length), next);
        const parsed = widgetAnimationSchema.safeParse(changed);
        return parsed.success
            ? { type: 'widget.update', widgetId: widget.id, changes: { animation: parsed.data } }
            : null;
    }
    if (path === 'label' && typeof next === 'string') {
        return { type: 'widget.update', widgetId: widget.id, changes: { label: next } };
    }
    if (path === 'locked' && typeof next === 'boolean') {
        return { type: 'widget.update', widgetId: widget.id, changes: { locked: next } };
    }
    if (path === 'autoHide' && typeof next === 'boolean') {
        return { type: 'widget.update', widgetId: widget.id, changes: { autoHide: next } };
    }
    return null;
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
    if (!schemas.has(widget.kind)) {
        return (
            <EmptyState
                className='wt-studio-empty'
                title='暂无可编辑属性'
                description='这个组件还没有定义 Inspector Schema。'
            />
        );
    }

    const value = toEditableRecord(widget);
    return (
        <SchemaForm
            value={value}
            schema={schemas.get(widget.kind).schema}
            controls={controls}
            onChange={(path, next) => {
                const operation = createWidgetInspectorOperation(widget, path, next);
                if (operation) runtime.engine.dispatch(operation);
            }}
        />
    );
}
