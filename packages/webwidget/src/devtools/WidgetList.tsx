import { useState, useMemo, type ChangeEvent } from 'react';
import { useOverlayStore, useWidgetStore } from '../store';
import { useDevtoolsStore } from './useDevtools';
import {
    toolbarStyle,
    searchInputStyle,
    widgetRowStyle,
    widgetKindBadgeStyle,
    widgetLabelStyle,
    widgetIdStyle,
    contentStyle,
} from './styles';

const KIND_ICONS: Record<string, string> = {
    clock: '🕐',
    text: '📝',
    image: '🖼️',
    video: '🎬',
    html: '🌐',
    iframe: '🔗',
    live2d: '🎭',
    canvas: '🎨',
};

export function WidgetList() {
    const widgets = useOverlayStore((s) => s.widgets);
    const selectedWidgetId = useDevtoolsStore((s) => s.selectedWidgetId);
    const selectWidget = useDevtoolsStore((s) => s.selectWidget);
    const { activate } = useWidgetStore();
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        if (!search.trim()) return widgets;
        const q = search.toLowerCase();
        return widgets.filter(
            (w) =>
                w.label.toLowerCase().includes(q) ||
                w.kind.toLowerCase().includes(q) ||
                w.id.toLowerCase().includes(q),
        );
    }, [widgets, search]);

    const handleSelect = (id: string) => {
        selectWidget(id);
        activate(id);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={toolbarStyle}>
                <input
                    style={searchInputStyle}
                    placeholder="Search widgets..."
                    value={search}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                />
                <span style={{ color: '#666', fontSize: 10, whiteSpace: 'nowrap' }}>
                    {filtered.length}/{widgets.length}
                </span>
            </div>
            <div style={contentStyle}>
                {filtered.length === 0 && (
                    <div style={{ padding: '20px 12px', textAlign: 'center', color: '#555' }}>
                        {widgets.length === 0 ? 'No widgets added yet' : 'No matching widgets'}
                    </div>
                )}
                {filtered.map((widget) => (
                    <div
                        key={widget.id}
                        style={widgetRowStyle(widget.id === selectedWidgetId)}
                        onClick={() => handleSelect(widget.id)}
                    >
                        <span>{KIND_ICONS[widget.kind] || '📦'}</span>
                        <span style={widgetLabelStyle}>{widget.label}</span>
                        <span style={widgetKindBadgeStyle}>{widget.kind}</span>
                        <span style={widgetIdStyle}>{widget.id.slice(0, 6)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
