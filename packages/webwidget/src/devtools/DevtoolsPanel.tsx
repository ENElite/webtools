import { useMemo } from 'react';
import { useWidgetStore, useOverlayStore } from '../store';
import { useDevtoolsStore, useDevtoolsShortcut } from './useDevtools';
import { WidgetList } from './WidgetList';
import { WidgetInspector } from './WidgetInspector';
import { SignalLog } from './SignalLog';
import type { DevtoolsTab } from './useDevtools';
import {
    panelStyle,
    headerStyle,
    titleStyle,
    closeButtonStyle,
    tabBarStyle,
    tabStyle,
    contentStyle,
    smallButtonStyle,
} from './styles';

const TABS: Array<{ key: DevtoolsTab; label: string }> = [
    { key: 'widgets', label: 'Widgets' },
    { key: 'signals', label: 'Signals' },
    { key: 'state', label: 'State' },
];

function StateView() {
    const widgets = useOverlayStore((s) => s.widgets);
    const activeWidgetId = useOverlayStore((s) => s.activeWidgetId);
    const canUndo = useOverlayStore((s) => s.canUndo);
    const canRedo = useOverlayStore((s) => s.canRedo);

    const stateJson = useMemo(() => ({
        widgetCount: widgets.length,
        activeWidgetId,
        canUndo,
        canRedo,
        widgets: widgets.map((w) => ({
            id: w.id,
            kind: w.kind,
            label: w.label,
        })),
    }), [widgets, activeWidgetId, canUndo, canRedo]);

    return (
        <div style={contentStyle}>
            <div style={{ padding: '12px' }}>
                <pre style={{
                    margin: 0,
                    fontSize: 11,
                    lineHeight: 1.6,
                    color: '#d4d4d4',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                }}>
                    {JSON.stringify(stateJson, null, 2)}
                </pre>
            </div>
        </div>
    );
}

export function DevtoolsPanel() {
    useDevtoolsShortcut();

    const isOpen = useDevtoolsStore((s) => s.isOpen);
    const activeTab = useDevtoolsStore((s) => s.activeTab);
    const setActiveTab = useDevtoolsStore((s) => s.setActiveTab);
    const close = useDevtoolsStore((s) => s.close);
    const selectedWidgetId = useDevtoolsStore((s) => s.selectedWidgetId);
    const { findWidget } = useWidgetStore();

    const selectedWidget = useMemo(() => {
        if (!selectedWidgetId) return null;
        return findWidget(selectedWidgetId);
    }, [selectedWidgetId, findWidget]);

    const handleCopyAll = () => {
        const widgets = useOverlayStore.getState().widgets;
        const json = JSON.stringify(widgets, null, 2);
        navigator.clipboard?.writeText(json);
    };

    if (!isOpen) return null;

    return (
        <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={headerStyle}>
                <span style={titleStyle}>Widget DevTools</span>
                <button style={closeButtonStyle} onClick={close}>×</button>
            </div>

            {/* Tab bar */}
            <div style={tabBarStyle}>
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        style={tabStyle(activeTab === tab.key)}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {activeTab === 'widgets' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {selectedWidget ? (
                        <>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 12px',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                backgroundColor: 'rgba(167, 139, 250, 0.06)',
                            }}>
                                <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600 }}>
                                    {selectedWidget.label}
                                </span>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button style={smallButtonStyle()} onClick={handleCopyAll}>
                                        Copy JSON
                                    </button>
                                    <button style={smallButtonStyle()} onClick={() => useDevtoolsStore.getState().selectWidget(null)}>
                                        ← Back
                                    </button>
                                </div>
                            </div>
                            <WidgetInspector widget={selectedWidget} />
                        </>
                    ) : (
                        <WidgetList />
                    )}
                </div>
            )}

            {activeTab === 'signals' && <SignalLog />}
            {activeTab === 'state' && <StateView />}
        </div>
    );
}
