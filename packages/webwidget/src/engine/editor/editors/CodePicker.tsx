import { useCallback, useMemo, useRef, useState } from 'react';
import { Modal } from 'antd';
import { CodeEditor, type CodeEditorHandle, createDeepSeekProvider } from '@webtools/shared';
import type { AISettings } from '@webtools/shared';
import type { EditorProps } from '../registry';

type CodePickerProps = EditorProps;

const STORAGE_KEY = 'webwidget-ai-settings';

function loadSettings(): AISettings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return { apiKey: '', baseUrl: '/api/deepseek/chat' };
}

function saveSettings(settings: AISettings) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch { /* ignore */ }
}

export default function CodePicker({ item, value, onChange }: CodePickerProps) {
    const bind = item.bind as string;
    const meta = item.meta ?? {};
    const current = typeof value === 'string' ? value : '';
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(current);
    const editorRef = useRef<CodeEditorHandle>(null);
    const [aiSettings, setAISettings] = useState<AISettings>(loadSettings);
    const [aiOpen, setAIOpen] = useState(false);

    const aiProvider = useMemo(
        () => createDeepSeekProvider({
            baseUrl: aiSettings.baseUrl || '/api/deepseek/chat',
            apiKey: aiSettings.apiKey || undefined,
        }),
        [aiSettings.baseUrl, aiSettings.apiKey],
    );

    const language = (meta['language'] as string) ?? 'typescript';
    const previewText = useMemo(() => {
        if (!current) return '空内容';
        const firstLine = current.split('\n')[0] ?? '';
        return firstLine.length > 60 ? firstLine.slice(0, 60) + '...' : firstLine || '空内容';
    }, [current]);

    const handleOpen = useCallback(() => {
        setDraft(current);
        setOpen(true);
    }, [current]);

    const handleOk = useCallback(() => {
        const content = editorRef.current?.getContent() ?? draft;
        onChange({ set: { [bind]: content } });
        setOpen(false);
    }, [bind, draft, onChange]);

    const handleCancel = useCallback(() => {
        setOpen(false);
        setAIOpen(false);
    }, []);

    const handleSettingsChange = useCallback((newSettings: AISettings) => {
        setAISettings(newSettings);
        saveSettings(newSettings);
    }, []);

    const modalFooter = (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
                type='button'
                onClick={() => setAIOpen((v) => !v)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 12px',
                    fontSize: 13,
                    color: aiOpen ? '#7c3aed' : '#666',
                    background: aiOpen ? 'rgba(124, 58, 237, 0.1)' : 'transparent',
                    border: `1px solid ${aiOpen ? 'rgba(124, 58, 237, 0.3)' : 'rgba(148,163,184,0.3)'}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                }}
            >
                <span style={{ fontSize: 14 }}>✦</span>
                <span>AI 助手</span>
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
                <button
                    type='button'
                    onClick={handleCancel}
                    style={{
                        padding: '4px 16px',
                        fontSize: 13,
                        color: '#666',
                        background: '#fff',
                        border: '1px solid #d9d9d9',
                        borderRadius: 6,
                        cursor: 'pointer',
                    }}
                >
                    取消
                </button>
                <button
                    type='button'
                    onClick={handleOk}
                    style={{
                        padding: '4px 16px',
                        fontSize: 13,
                        color: '#fff',
                        background: '#1677ff',
                        border: '1px solid #1677ff',
                        borderRadius: 6,
                        cursor: 'pointer',
                    }}
                >
                    保存
                </button>
            </div>
        </div>
    );

    return (
        <>
            <button
                type='button'
                onClick={handleOpen}
                className='
                    w-full flex items-center gap-2 px-3 py-1.5
                    rounded border border-slate-300/60 bg-white
                    hover:border-blue-400 hover:bg-blue-50/50
                    transition-colors cursor-pointer text-left
                    min-h-[32px]
                '
            >
                <span className='shrink-0 text-xs text-slate-400 font-mono'>{'{ }'}</span>
                <span className='flex-1 min-w-0 text-xs text-slate-600 font-mono truncate'>
                    {previewText}
                </span>
                <span className='shrink-0 text-[10px] text-slate-400'>编辑</span>
            </button>

            <Modal
                title={
                    <span className='text-sm'>
                        编辑代码
                        <span className='ml-2 text-xs text-slate-400 font-mono'>{language}</span>
                    </span>
                }
                open={open}
                width='80vw'
                style={{ top: 20 }}
                styles={{ body: { height: 'calc(80vh - 100px)', padding: 0, overflow: 'hidden' } }}
                destroyOnHidden
                footer={modalFooter}
            >
                <div className='h-full w-full'>
                    <CodeEditor
                        ref={editorRef}
                        value={draft}
                        language={language}
                        theme={(meta['theme'] as string) ?? 'vs-dark'}
                        height='100%'
                        showSaveButton={false}
                        aiProvider={aiProvider}
                        aiSettings={aiSettings}
                        onSettingsChange={handleSettingsChange}
                        aiOpen={aiOpen}
                        onAIOpenChange={setAIOpen}
                        onContentChange={setDraft}
                    />
                </div>
            </Modal>
        </>
    );
}
