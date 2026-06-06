import { useMemo } from 'react';
import { useSignalLog } from './useSignalLog';
import { useDevtoolsStore } from './useDevtools';
import {
    toolbarStyle,
    smallButtonStyle,
    contentStyle,
    signalRowStyle,
    signalTimeStyle,
    signalSourceStyle,
    signalTypeStyle,
} from './styles';

type SignalFilterValue = 'all' | 'widget' | 'system' | 'user' | 'lifecycle';

const SOURCE_OPTIONS: Array<{ label: string; value: SignalFilterValue }> = [
    { label: 'All', value: 'all' },
    { label: 'Widget', value: 'widget' },
    { label: 'System', value: 'system' },
    { label: 'User', value: 'user' },
    { label: 'Lifecycle', value: 'lifecycle' },
];

function formatTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

export function SignalLog() {
    const { entries, clear } = useSignalLog();
    const signalFilter = useDevtoolsStore((s) => s.signalFilter);
    const setSignalFilter = useDevtoolsStore((s) => s.setSignalFilter);
    const signalPaused = useDevtoolsStore((s) => s.signalPaused);
    const toggleSignalPause = useDevtoolsStore((s) => s.toggleSignalPause);

    const filtered = useMemo(() => {
        if (signalFilter === 'all') return entries;
        return entries.filter((e) => e.source === signalFilter);
    }, [entries, signalFilter]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={toolbarStyle}>
                <button style={smallButtonStyle(signalPaused)} onClick={toggleSignalPause}>
                    {signalPaused ? '▶ Resume' : '⏸ Pause'}
                </button>
                <button style={smallButtonStyle()} onClick={clear}>
                    🗑 Clear
                </button>
                <span style={{ width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                {SOURCE_OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        style={smallButtonStyle(signalFilter === opt.value)}
                        onClick={() => setSignalFilter(opt.value)}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
            <div style={{ ...contentStyle, overflowY: 'auto' }}>
                {filtered.length === 0 && (
                    <div style={{ padding: '20px 12px', textAlign: 'center', color: '#555' }}>
                        {entries.length === 0 ? 'Waiting for signals...' : 'No matching signals'}
                    </div>
                )}
                {filtered.map((entry) => (
                    <div key={entry.id} style={signalRowStyle}>
                        <span style={signalTimeStyle}>{formatTime(entry.timestamp)}</span>
                        <span style={signalSourceStyle(entry.source)}>{entry.source}</span>
                        <span style={signalTypeStyle}>
                            {entry.type}
                            {entry.widgetId && (
                                <span style={{ color: '#666', marginLeft: 6 }}>
                                    [{entry.widgetId.slice(0, 6)}]
                                </span>
                            )}
                            {entry.payloadSummary && (
                                <span style={{ color: '#555', marginLeft: 6 }}>
                                    {entry.payloadSummary}
                                </span>
                            )}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
