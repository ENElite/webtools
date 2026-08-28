import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { AIEditChange, AIMessage, AIMode, AIStatus, EditorSelection } from './types';

export type AISettings = {
    apiKey: string;
    baseUrl: string;
};

type AIChatDialogProps = {
    messages: AIMessage[];
    pendingChanges: AIEditChange[];
    mode: AIMode;
    status: AIStatus;
    requesting: boolean;
    selection: EditorSelection;
    settings?: AISettings;
    onSend: (content: string) => void;
    onModeChange: (mode: AIMode) => void;
    onAcceptChange: (changeId: string) => void;
    onRejectChange: (changeId: string) => void;
    onAcceptAll: () => void;
    onRejectAll: () => void;
    onClear: () => void;
    onSettingsChange?: (settings: AISettings) => void;
};

const MODE_OPTIONS: Array<{ key: AIMode; label: string; desc: string }> = [
    { key: 'ask', label: 'Ask', desc: '仅对话，不编辑代码' },
    { key: 'agent', label: 'Agent', desc: '编辑代码，手动接受/拒绝' },
    { key: 'plan', label: 'Plan', desc: '思考和计划，不编辑' },
    { key: 'auto', label: 'Auto', desc: '自动接受所有编辑' },
];

const DIALOG_STYLE: React.CSSProperties = {
    position: 'absolute',
    bottom: 44,
    right: 8,
    width: 400,
    maxHeight: 'calc(100% - 56px)',
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(24, 24, 32, 0.96)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    zIndex: 30,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 13,
    color: '#d4d4d4',
    overflow: 'hidden',
    backdropFilter: 'blur(12px)',
};

const HEADER_STYLE: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(30, 30, 40, 0.6)',
};

const MODE_BUTTON_STYLE = (active: boolean): React.CSSProperties => ({
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: active ? 600 : 400,
    color: active ? '#c4b5fd' : '#888',
    background: active ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
    border: `1px solid ${active ? 'rgba(139, 92, 246, 0.3)' : 'transparent'}`,
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
});

const MESSAGES_STYLE: React.CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minHeight: 0,
};

const INPUT_AREA_STYLE: React.CSSProperties = {
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
};

const USER_MSG_STYLE: React.CSSProperties = {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    padding: '6px 10px',
    borderRadius: '6px 6px 2px 6px',
    background: 'rgba(139, 92, 246, 0.2)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: 1.5,
};

const ASSISTANT_MSG_STYLE: React.CSSProperties = {
    alignSelf: 'flex-start',
    maxWidth: '85%',
    padding: '6px 10px',
    borderRadius: '6px 6px 6px 2px',
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: 1.5,
};

const QUOTE_STYLE: React.CSSProperties = {
    fontSize: 11,
    color: '#6b7280',
    borderLeft: '2px solid rgba(139, 92, 246, 0.3)',
    paddingLeft: 8,
    marginBottom: 4,
    fontStyle: 'italic',
};

const CHANGE_STYLE: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: 4,
    background: 'rgba(34, 197, 94, 0.08)',
    border: '1px solid rgba(34, 197, 94, 0.2)',
    fontSize: 12,
};

const TEXTAREA_STYLE: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    background: 'transparent',
    border: 'none',
    color: '#d4d4d4',
    fontSize: 13,
    fontFamily: 'inherit',
    resize: 'none',
    outline: 'none',
    lineHeight: 1.5,
    minHeight: 36,
    maxHeight: 120,
    boxSizing: 'border-box',
};

const FOOTER_STYLE: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 12px',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
};

const SEND_BUTTON_STYLE: React.CSSProperties = {
    padding: '4px 14px',
    fontSize: 12,
    fontWeight: 500,
    color: '#fff',
    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
};

function formatTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
}

const STATUS_CONFIG: Record<AIStatus, { label: string; color: string; icon: string }> = {
    idle: { label: '', color: '', icon: '' },
    requesting: { label: '发起请求', color: '#f59e0b', icon: '⏳' },
    thinking: { label: '思考中', color: '#3b82f6', icon: '💭' },
    editing: { label: '编辑中', color: '#22c55e', icon: '✏️' },
    timeout: { label: '请求超时', color: '#ef4444', icon: '⚠️' },
};

function StatusIndicator({ status }: { status: AIStatus }) {
    const config = STATUS_CONFIG[status];
    if (!config) return null;

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '1px 6px',
                fontSize: 10,
                fontWeight: 500,
                color: config.color,
                background: `${config.color}15`,
                border: `1px solid ${config.color}30`,
                borderRadius: 4,
                lineHeight: '16px',
            }}
        >
            <span style={{ fontSize: 10 }}>{config.icon}</span>
            {config.label}
        </span>
    );
}

export function AIChatDialog({
    messages,
    pendingChanges,
    mode,
    status,
    requesting,
    selection,
    settings,
    onSend,
    onModeChange,
    onAcceptChange,
    onRejectChange,
    onAcceptAll,
    onRejectAll,
    onClear,
    onSettingsChange,
}: AIChatDialogProps) {
    const [input, setInput] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [settingsDraft, setSettingsDraft] = useState<AISettings>({
        apiKey: settings?.apiKey ?? '',
        baseUrl: settings?.baseUrl ?? '/api/deepseek/chat',
    });
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, pendingChanges]);

    const handleSend = useCallback(() => {
        if (!input.trim() || requesting) return;
        onSend(input.trim());
        setInput('');
    }, [input, requesting, onSend]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);

    const activeChanges = pendingChanges.filter((c) => c.status === 'pending');

    return (
        <div style={DIALOG_STYLE} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={HEADER_STYLE}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#a78bfa', letterSpacing: '0.03em' }}>
                    AI
                </span>
                <div style={{ flex: 1, display: 'flex', gap: 2, justifyContent: 'center' }}>
                    {MODE_OPTIONS.map((opt) => (
                        <button
                            key={opt.key}
                            type='button'
                            style={MODE_BUTTON_STYLE(mode === opt.key)}
                            onClick={() => onModeChange(opt.key)}
                            title={opt.desc}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                <button
                    type='button'
                    onClick={onClear}
                    style={{
                        background: 'none', border: 'none', color: '#666', cursor: 'pointer',
                        fontSize: 11, padding: '0 4px',
                    }}
                    title='清空对话'
                >
                    🗑
                </button>
            </div>

            {/* Messages */}
            <div style={MESSAGES_STYLE}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#555', padding: '20px 0', fontSize: 12 }}>
                        选择代码并输入需求，AI 将帮你编辑
                    </div>
                )}

                {messages.map((msg) => (
                    <div key={msg.id}>
                        {msg.quote && (
                            <div style={QUOTE_STYLE}>
                                引用 L{msg.quote.startLine}-{msg.quote.endLine}:
                                {' '}{msg.quote.text.slice(0, 100)}{msg.quote.text.length > 100 ? '...' : ''}
                            </div>
                        )}
                        <div style={msg.role === 'user' ? USER_MSG_STYLE : ASSISTANT_MSG_STYLE}>
                            {msg.content}
                        </div>
                        <div style={{
                            fontSize: 10, color: '#555', marginTop: 2,
                            textAlign: msg.role === 'user' ? 'right' : 'left',
                        }}>
                            {formatTime(msg.timestamp)}
                        </div>
                    </div>
                ))}

                {activeChanges.map((change) => (
                    <div key={change.id} style={CHANGE_STYLE}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ color: '#4ade80', fontWeight: 500, fontSize: 11 }}>
                                {change.summary ?? `L${change.range.startLine}-${change.range.endLine}`}
                            </span>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                    type='button'
                                    onClick={() => onAcceptChange(change.id)}
                                    style={{
                                        padding: '1px 8px', fontSize: 11, fontWeight: 500,
                                        color: '#fff', background: '#22c55e', border: 'none',
                                        borderRadius: 3, cursor: 'pointer',
                                    }}
                                >
                                    ✓
                                </button>
                                <button
                                    type='button'
                                    onClick={() => onRejectChange(change.id)}
                                    style={{
                                        padding: '1px 8px', fontSize: 11, fontWeight: 500,
                                        color: '#fff', background: '#ef4444', border: 'none',
                                        borderRadius: 3, cursor: 'pointer',
                                    }}
                                >
                                    ✗
                                </button>
                            </div>
                        </div>
                        <pre style={{
                            margin: 0, fontSize: 11, lineHeight: 1.4,
                            color: '#94a3b8', overflow: 'auto', maxHeight: 80,
                            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                        }}>
                            {change.newText.slice(0, 300)}{change.newText.length > 300 ? '...' : ''}
                        </pre>
                    </div>
                ))}

                {activeChanges.length > 1 && (
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button
                            type='button'
                            onClick={onAcceptAll}
                            style={{
                                padding: '3px 12px', fontSize: 11, fontWeight: 500,
                                color: '#fff', background: '#22c55e', border: 'none',
                                borderRadius: 3, cursor: 'pointer',
                            }}
                        >
                            全部接受 ({activeChanges.length})
                        </button>
                        <button
                            type='button'
                            onClick={onRejectAll}
                            style={{
                                padding: '3px 12px', fontSize: 11, fontWeight: 500,
                                color: '#fff', background: '#ef4444', border: 'none',
                                borderRadius: 3, cursor: 'pointer',
                            }}
                        >
                            全部拒绝
                        </button>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div style={INPUT_AREA_STYLE}>
                {/* Settings panel */}
                {showSettings && (
                    <div style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <label style={{ fontSize: 11, color: '#888' }}>API Key</label>
                            <input
                                type='password'
                                value={settingsDraft.apiKey}
                                onChange={(e) => setSettingsDraft((s) => ({ ...s, apiKey: e.target.value }))}
                                placeholder='留空使用服务端代理密钥'
                                style={{
                                    padding: '4px 8px',
                                    fontSize: 12,
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: 4,
                                    color: '#d4d4d4',
                                    outline: 'none',
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <label style={{ fontSize: 11, color: '#888' }}>Base URL</label>
                            <input
                                type='text'
                                value={settingsDraft.baseUrl}
                                onChange={(e) => setSettingsDraft((s) => ({ ...s, baseUrl: e.target.value }))}
                                placeholder='/api/deepseek/chat'
                                style={{
                                    padding: '4px 8px',
                                    fontSize: 12,
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: 4,
                                    color: '#d4d4d4',
                                    outline: 'none',
                                }}
                            />
                        </div>
                        <button
                            type='button'
                            onClick={() => {
                                onSettingsChange?.(settingsDraft);
                                setShowSettings(false);
                            }}
                            style={{
                                padding: '4px 12px',
                                fontSize: 11,
                                fontWeight: 500,
                                color: '#fff',
                                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                                border: 'none',
                                borderRadius: 4,
                                cursor: 'pointer',
                                alignSelf: 'flex-end',
                            }}
                        >
                            保存设置
                        </button>
                    </div>
                )}
                <textarea
                    ref={textareaRef}
                    style={TEXTAREA_STYLE}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                        mode === 'ask' ? '向 AI 提问...' :
                        mode === 'plan' ? '描述需求，AI 将给出计划...' :
                        '描述你想要的修改...'
                    }
                    rows={2}
                />
                <div style={{
                    height: 1,
                    background: 'rgba(255, 255, 255, 0.06)',
                }} />
                <div style={FOOTER_STYLE}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Status indicator */}
                        <StatusIndicator status={status} />
                        <span style={{ fontSize: 11, color: '#666' }}>
                            {selection
                                ? `L${selection.startLine}-${selection.endLine} · ${selection.text.length} chars`
                                : mode === 'ask' ? '对话模式' : '选择代码以引用'
                            }
                        </span>
                        <button
                            type='button'
                            onClick={() => setShowSettings((v) => !v)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: showSettings ? '#a78bfa' : '#666',
                                cursor: 'pointer',
                                fontSize: 14,
                                padding: '0 4px',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                            title='设置'
                        >
                            ⚙
                        </button>
                    </div>
                    <button
                        type='button'
                        style={{
                            ...SEND_BUTTON_STYLE,
                            opacity: (!input.trim() || requesting) ? 0.5 : 1,
                            cursor: (!input.trim() || requesting) ? 'not-allowed' : 'pointer',
                        }}
                        disabled={!input.trim() || requesting}
                        onClick={handleSend}
                    >
                        {requesting ? '...' : '发送'}
                    </button>
                </div>
            </div>
        </div>
    );
}
