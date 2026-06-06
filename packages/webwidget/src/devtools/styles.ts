import type { CSSProperties } from 'react';

export const PANEL_WIDTH = 380;

export const panelStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    backgroundColor: 'rgba(24, 24, 30, 0.95)',
    borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 10000,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    fontSize: 12,
    color: '#d4d4d4',
    userSelect: 'none',
    boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.4)',
};

export const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(32, 32, 40, 0.8)',
};

export const titleStyle: CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: '#a78bfa',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
};

export const closeButtonStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    fontSize: 16,
    padding: '0 4px',
    lineHeight: 1,
};

export const tabBarStyle: CSSProperties = {
    display: 'flex',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
};

export const tabStyle = (active: boolean): CSSProperties => ({
    flex: 1,
    padding: '6px 0',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: active ? 600 : 400,
    color: active ? '#a78bfa' : '#888',
    borderBottom: active ? '2px solid #a78bfa' : '2px solid transparent',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: active ? '#a78bfa' : 'transparent',
    transition: 'color 0.15s, border-color 0.15s',
});

export const contentStyle: CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: 0,
};

export const toolbarStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 8px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(28, 28, 36, 0.6)',
};

export const searchInputStyle: CSSProperties = {
    flex: 1,
    padding: '4px 8px',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    color: '#d4d4d4',
    fontSize: 11,
    outline: 'none',
    fontFamily: 'inherit',
};

export const smallButtonStyle = (active?: boolean): CSSProperties => ({
    padding: '3px 8px',
    fontSize: 10,
    fontWeight: 500,
    color: active ? '#18181e' : '#aaa',
    backgroundColor: active ? '#a78bfa' : 'rgba(255, 255, 255, 0.06)',
    border: 'none',
    borderRadius: 3,
    cursor: 'pointer',
    transition: 'all 0.15s',
});

// ─── Widget list ────────────────────────────────────────────────────────────

export const widgetRowStyle = (selected: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 12px',
    cursor: 'pointer',
    backgroundColor: selected ? 'rgba(167, 139, 250, 0.12)' : 'transparent',
    borderLeft: selected ? '2px solid #a78bfa' : '2px solid transparent',
    transition: 'background-color 0.1s',
});

export const widgetKindBadgeStyle: CSSProperties = {
    padding: '1px 6px',
    fontSize: 9,
    fontWeight: 600,
    color: '#a78bfa',
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    borderRadius: 3,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
};

export const widgetLabelStyle: CSSProperties = {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: '#d4d4d4',
};

export const widgetIdStyle: CSSProperties = {
    fontSize: 10,
    color: '#666',
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
};

// ─── Signal log ─────────────────────────────────────────────────────────────

export const signalRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
    padding: '4px 12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
    fontSize: 11,
    lineHeight: 1.5,
};

export const signalTimeStyle: CSSProperties = {
    color: '#555',
    fontSize: 10,
    whiteSpace: 'nowrap',
    minWidth: 56,
};

const SOURCE_COLORS: Record<string, string> = {
    widget: '#60a5fa',
    system: '#34d399',
    user: '#fbbf24',
    lifecycle: '#f87171',
};

export const signalSourceStyle = (source: string): CSSProperties => ({
    color: SOURCE_COLORS[source] || '#888',
    fontWeight: 600,
    fontSize: 10,
    minWidth: 52,
});

export const signalTypeStyle: CSSProperties = {
    color: '#d4d4d4',
    flex: 1,
    wordBreak: 'break-all',
};

// ─── Inspector ──────────────────────────────────────────────────────────────

export const sectionStyle: CSSProperties = {
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
};

export const sectionHeaderStyle: CSSProperties = {
    padding: '6px 12px',
    fontSize: 10,
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
};

export const propRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    padding: '3px 12px 3px 20px',
    gap: 8,
};

export const propKeyStyle: CSSProperties = {
    color: '#93c5fd',
    minWidth: 100,
    fontSize: 11,
    wordBreak: 'break-all',
};

export const propValueType = (value: unknown): CSSProperties => ({
    fontSize: 10,
    padding: '0 4px',
    borderRadius: 2,
    backgroundColor:
        typeof value === 'string'
            ? 'rgba(52, 211, 153, 0.12)'
            : typeof value === 'number'
                ? 'rgba(251, 191, 36, 0.12)'
                : typeof value === 'boolean'
                    ? 'rgba(248, 113, 113, 0.12)'
                    : 'rgba(148, 163, 184, 0.12)',
    color:
        typeof value === 'string'
            ? '#34d399'
            : typeof value === 'number'
                ? '#fbbf24'
                : typeof value === 'boolean'
                    ? '#f87171'
                    : '#94a3b8',
});

export const propValueStyle: CSSProperties = {
    color: '#e2e8f0',
    flex: 1,
    wordBreak: 'break-all',
    fontSize: 11,
};

// ─── JSON Viewer ────────────────────────────────────────────────────────────

export const jsonKeyStyle: CSSProperties = {
    color: '#93c5fd',
};

export const jsonStringStyle: CSSProperties = {
    color: '#34d399',
};

export const jsonNumberStyle: CSSProperties = {
    color: '#fbbf24',
};

export const jsonBooleanStyle: CSSProperties = {
    color: '#f87171',
};

export const jsonNullStyle: CSSProperties = {
    color: '#6b7280',
    fontStyle: 'italic',
};

export const jsonBracketStyle: CSSProperties = {
    color: '#888',
};

export const jsonToggleStyle: CSSProperties = {
    cursor: 'pointer',
    color: '#888',
    marginRight: 4,
    fontSize: 10,
    display: 'inline-block',
    width: 12,
};
