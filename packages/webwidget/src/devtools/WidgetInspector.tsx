import { useMemo } from 'react';
import type { WidgetModel, WidgetStyle } from '../engine/model';
import { resolveWidgetSettingsSchema } from '../runtime/schema';
import { JsonViewer } from './JsonViewer';
import {
    contentStyle,
    sectionStyle,
    sectionHeaderStyle,
    propRowStyle,
    propKeyStyle,
    propValueType,
    propValueStyle,
} from './styles';

type WidgetInspectorProps = {
    widget: WidgetModel;
};

type PropEntry = {
    key: string;
    label: string;
    value: unknown;
    group: string;
};

function formatValue(value: unknown): string {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') return value.length > 80 ? value.slice(0, 80) + '...' : value;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

function collectProps(widget: WidgetModel, schema: ReturnType<typeof resolveWidgetSettingsSchema>): PropEntry[] {
    const entries: PropEntry[] = [];

    // Basic info
    entries.push({ key: 'id', label: 'ID', value: widget.id, group: 'Basic' });
    entries.push({ key: 'kind', label: 'Kind', value: widget.kind, group: 'Basic' });
    entries.push({ key: 'label', label: 'Label', value: widget.label, group: 'Basic' });
    entries.push({ key: 'locked', label: 'Locked', value: widget.locked ?? false, group: 'Basic' });
    entries.push({ key: 'autoHide', label: 'Auto Hide', value: widget.autoHide ?? false, group: 'Basic' });

    // Layout
    const layout = widget.layout;
    entries.push({ key: 'anchorX', label: 'Anchor X', value: layout.anchorX, group: 'Layout' });
    entries.push({ key: 'anchorY', label: 'Anchor Y', value: layout.anchorY, group: 'Layout' });
    entries.push({ key: 'x', label: 'X', value: layout.x, group: 'Layout' });
    entries.push({ key: 'y', label: 'Y', value: layout.y, group: 'Layout' });
    entries.push({ key: 'w', label: 'Width', value: layout.w, group: 'Layout' });
    entries.push({ key: 'h', label: 'Height', value: layout.h, group: 'Layout' });
    entries.push({ key: 'rotation', label: 'Rotation', value: layout.rotation, group: 'Layout' });
    entries.push({ key: 'adapt', label: 'Adapt', value: layout.adapt, group: 'Layout' });

    // Style
    const style = widget.style;
    const styleEntries: [keyof WidgetStyle, string][] = [
        ['opacity', 'Opacity'],
        ['backgroundColor', 'Background Color'],
        ['backgroundEffect', 'Background Effect'],
        ['backgroundImageUrl', 'Background Image URL'],
        ['outline', 'Outline'],
        ['borderRadius', 'Border Radius'],
        ['outlineOffset', 'Outline Offset'],
        ['shadowRadius', 'Shadow Radius'],
        ['shadowColor', 'Shadow Color'],
    ];
    for (const [k, label] of styleEntries) {
        const v = style[k];
        if (v !== undefined && v !== '') {
            entries.push({ key: `style.${String(k)}`, label, value: v, group: 'Style' });
        }
    }

    // Props
    const props = widget.props as Record<string, unknown>;
    const propKeys = Object.keys(props);
    if (propKeys.length > 0) {
        // Use schema labels if available
        const schemaMap = new Map<string, string>();
        if (schema) {
            for (const item of schema) {
                if (item.bind && typeof item.bind === 'string' && item.bind.startsWith('props.')) {
                    schemaMap.set(item.bind.replace('props.', ''), item.label || item.key);
                }
            }
        }
        for (const k of propKeys) {
            entries.push({
                key: `props.${k}`,
                label: schemaMap.get(k) || k,
                value: props[k],
                group: 'Props',
            });
        }
    }

    // Connections
    if (widget.connections && widget.connections.length > 0) {
        entries.push({ key: 'connections', label: 'Connections', value: `${widget.connections.length} connection(s)`, group: 'Connections' });
    }

    return entries;
}

function groupEntries(entries: PropEntry[]): Map<string, PropEntry[]> {
    const groups = new Map<string, PropEntry[]>();
    for (const entry of entries) {
        const list = groups.get(entry.group) || [];
        list.push(entry);
        groups.set(entry.group, list);
    }
    return groups;
}

export function WidgetInspector({ widget }: WidgetInspectorProps) {
    const schema = useMemo(() => resolveWidgetSettingsSchema(widget.kind), [widget.kind]);
    const entries = useMemo(() => collectProps(widget, schema), [widget, schema]);
    const groups = useMemo(() => groupEntries(entries), [entries]);

    return (
        <div style={contentStyle}>
            {Array.from(groups.entries()).map(([group, items]) => (
                <div key={group} style={sectionStyle}>
                    <div style={sectionHeaderStyle}>{group}</div>
                    {items.map((item) => (
                        <div key={item.key} style={propRowStyle}>
                            <span style={propKeyStyle}>{item.label}</span>
                            <span style={propValueType(item.value)}>{typeof item.value}</span>
                            <span style={propValueStyle} title={formatValue(item.value)}>
                                {typeof item.value === 'object' && item.value !== null ? (
                                    <JsonViewer data={item.value} defaultExpanded={false} />
                                ) : (
                                    formatValue(item.value)
                                )}
                            </span>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
