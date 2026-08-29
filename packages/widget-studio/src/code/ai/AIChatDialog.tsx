'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
    Button,
    Card,
    EmptyState,
    Field,
    IconButton,
    SegmentedControl,
    TextInput,
    Textarea,
    Toolbar,
} from '@webtools/ui';

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
    onClose: () => void;
    onSettingsChange?: (settings: AISettings) => void;
};

const MODE_OPTIONS: Array<{ value: AIMode; label: string }> = [
    { value: 'ask', label: 'Ask' },
    { value: 'agent', label: 'Agent' },
    { value: 'plan', label: 'Plan' },
    { value: 'auto', label: 'Auto' },
];

const STATUS_CONFIG: Record<AIStatus, { label: string; icon: string }> = {
    idle: { label: '', icon: '' },
    requesting: { label: '发起请求', icon: '⏳' },
    thinking: { label: '思考中', icon: '💭' },
    editing: { label: '编辑中', icon: '✏️' },
    timeout: { label: '请求超时', icon: '⚠️' },
};

function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
    });
}

function StatusIndicator({ status }: { status: AIStatus }) {
    const config = STATUS_CONFIG[status];
    if (!config.label) return null;

    return (
        <span className={`wt-studio-ai-status wt-studio-ai-status--${status}`} role='status' aria-live='polite'>
            <span aria-hidden='true'>{config.icon}</span>
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
    onClose,
    onSettingsChange,
}: AIChatDialogProps) {
    const [input, setInput] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [settingsDraft, setSettingsDraft] = useState<AISettings>({
        apiKey: settings?.apiKey ?? '',
        baseUrl: settings?.baseUrl ?? '/api/deepseek/chat',
    });
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const composerRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const previousFocus = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        const focusFrame = window.requestAnimationFrame(() => composerRef.current?.focus());
        return () => {
            window.cancelAnimationFrame(focusFrame);
            if (previousFocus?.isConnected) previousFocus.focus();
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, pendingChanges]);

    useEffect(() => {
        setSettingsDraft({
            apiKey: settings?.apiKey ?? '',
            baseUrl: settings?.baseUrl ?? '/api/deepseek/chat',
        });
    }, [settings]);

    useEffect(() => {
        const handleEscape = (event: globalThis.KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const handleSend = useCallback(() => {
        const content = input.trim();
        if (!content || requesting) return;
        onSend(content);
        setInput('');
    }, [input, requesting, onSend]);

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSend();
        }
    }, [handleSend]);

    const activeChanges = pendingChanges.filter((change) => change.status === 'pending');
    const composerPlaceholder = mode === 'ask'
        ? '向 AI 提问...'
        : mode === 'plan'
            ? '描述需求，AI 将给出计划...'
            : '描述你想要的修改...';

    return (
        <Card
            ref={dialogRef}
            className='wt-studio-ai-dialog'
            role='dialog'
            aria-label='AI 代码助手'
            aria-modal='false'
            onClick={(event) => event.stopPropagation()}
        >
            <header className='wt-studio-ai-header'>
                <span className='wt-studio-ai-title'>AI</span>
                <SegmentedControl<AIMode>
                    className='wt-studio-ai-modes'
                    value={mode}
                    options={MODE_OPTIONS}
                    onValueChange={onModeChange}
                    aria-label='AI 工作模式'
                />
                <IconButton size='sm' variant='ghost' aria-label='清空对话' title='清空对话' onClick={onClear}>
                    <span aria-hidden='true'>🗑</span>
                </IconButton>
                <IconButton size='sm' variant='ghost' aria-label='关闭 AI 助手' title='关闭 AI 助手' onClick={onClose}>
                    <span aria-hidden='true'>×</span>
                </IconButton>
            </header>

            <div className='wt-studio-ai-messages' aria-live='polite' aria-busy={requesting}>
                {messages.length === 0 && activeChanges.length === 0 ? (
                    <EmptyState
                        title='从一段代码开始'
                        description='选择代码并输入需求，AI 将帮你编辑。'
                        className='wt-studio-ai-empty'
                    />
                ) : null}

                {messages.map((message) => (
                    <article className={`wt-studio-ai-message wt-studio-ai-message--${message.role}`} key={message.id}>
                        {message.quote ? (
                            <blockquote className='wt-studio-ai-quote'>
                                引用 L{message.quote.startLine}-{message.quote.endLine}: {' '}
                                {message.quote.text.slice(0, 100)}{message.quote.text.length > 100 ? '…' : ''}
                            </blockquote>
                        ) : null}
                        <div className='wt-studio-ai-bubble'>{message.content}</div>
                        <time className='wt-studio-ai-time' dateTime={new Date(message.timestamp).toISOString()}>
                            {formatTime(message.timestamp)}
                        </time>
                    </article>
                ))}

                {activeChanges.map((change) => (
                    <Card className='wt-studio-ai-change' key={change.id}>
                        <div className='wt-studio-ai-change-header'>
                            <strong>{change.summary ?? `L${change.range.startLine}-${change.range.endLine}`}</strong>
                            <Toolbar aria-label={`处理变更 ${change.summary ?? change.id}`}>
                                <IconButton
                                    size='sm'
                                    variant='secondary'
                                    className='wt-studio-ai-accept'
                                    aria-label='接受变更'
                                    onClick={() => onAcceptChange(change.id)}
                                >
                                    <span aria-hidden='true'>✓</span>
                                </IconButton>
                                <IconButton
                                    size='sm'
                                    variant='danger'
                                    className='wt-studio-ai-reject'
                                    aria-label='拒绝变更'
                                    onClick={() => onRejectChange(change.id)}
                                >
                                    <span aria-hidden='true'>✕</span>
                                </IconButton>
                            </Toolbar>
                        </div>
                        <pre className='wt-studio-ai-change-code'>
                            {change.newText.slice(0, 300)}{change.newText.length > 300 ? '…' : ''}
                        </pre>
                    </Card>
                ))}

                {activeChanges.length > 1 ? (
                    <Toolbar className='wt-studio-ai-bulk-actions' aria-label='批量处理变更'>
                        <Button size='sm' variant='secondary' className='wt-studio-ai-accept' onClick={onAcceptAll}>
                            全部接受 ({activeChanges.length})
                        </Button>
                        <Button size='sm' variant='danger' className='wt-studio-ai-reject' onClick={onRejectAll}>
                            全部拒绝
                        </Button>
                    </Toolbar>
                ) : null}

                <div ref={messagesEndRef} />
            </div>

            <div className='wt-studio-ai-composer'>
                {showSettings ? (
                    <section className='wt-studio-ai-settings' aria-label='AI 服务设置'>
                        <Field label='API Key' description='留空时使用服务端代理密钥'>
                            <TextInput
                                type='password'
                                autoComplete='off'
                                value={settingsDraft.apiKey}
                                onChange={(event) => setSettingsDraft((current) => ({
                                    ...current,
                                    apiKey: event.target.value,
                                }))}
                            />
                        </Field>
                        <Field label='Base URL'>
                            <TextInput
                                value={settingsDraft.baseUrl}
                                placeholder='/api/deepseek/chat'
                                onChange={(event) => setSettingsDraft((current) => ({
                                    ...current,
                                    baseUrl: event.target.value,
                                }))}
                            />
                        </Field>
                        <Button
                            size='sm'
                            className='wt-studio-ai-settings-save'
                            onClick={() => {
                                onSettingsChange?.(settingsDraft);
                                setShowSettings(false);
                            }}
                        >
                            保存设置
                        </Button>
                    </section>
                ) : null}

                <label className='wt-studio-ai-composer-label' htmlFor='wt-studio-ai-prompt'>给 AI 的消息</label>
                <Textarea
                    ref={composerRef}
                    id='wt-studio-ai-prompt'
                    className='wt-studio-ai-prompt'
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={composerPlaceholder}
                    rows={2}
                />

                <footer className='wt-studio-ai-footer'>
                    <div className='wt-studio-ai-context'>
                        <StatusIndicator status={status} />
                        <span>
                            {selection
                                ? `L${selection.startLine}-${selection.endLine} · ${selection.text.length} chars`
                                : mode === 'ask' ? '对话模式' : '选择代码以引用'}
                        </span>
                        <IconButton
                            size='sm'
                            variant='ghost'
                            aria-label={showSettings ? '关闭设置' : '打开设置'}
                            aria-expanded={showSettings}
                            onClick={() => setShowSettings((current) => !current)}
                        >
                            <span aria-hidden='true'>⚙</span>
                        </IconButton>
                    </div>
                    <Button size='sm' disabled={!input.trim() || requesting} onClick={handleSend}>
                        {requesting ? '发送中…' : '发送'}
                    </Button>
                </footer>
            </div>
        </Card>
    );
}
