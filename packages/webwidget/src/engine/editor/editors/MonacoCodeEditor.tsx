import { useCallback, useMemo, useRef, useState } from 'react';
import { CodeEditor, type CodeEditorHandle, createDeepSeekProvider } from '@webtools/shared';
import type { AISettings } from '@webtools/shared';
import type { EditorProps } from '../registry';

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

export default function MonacoCodeEditor({ item, value, onChange }: EditorProps) {
    const bind = item.bind as string;
    const current = value ?? '';
    const meta = item.meta ?? {};
    const editorRef = useRef<CodeEditorHandle>(null);
    const [aiSettings, setAISettings] = useState<AISettings>(loadSettings);

    const aiProvider = useMemo(
        () => createDeepSeekProvider({
            baseUrl: aiSettings.baseUrl || '/api/deepseek/chat',
            apiKey: aiSettings.apiKey || undefined,
        }),
        [aiSettings.baseUrl, aiSettings.apiKey],
    );

    const handleSettingsChange = useCallback((newSettings: AISettings) => {
        setAISettings(newSettings);
        saveSettings(newSettings);
    }, []);

    return (
        <div className='w-full min-h-105 overflow-hidden rounded border border-slate-300/60'>
            <CodeEditor
                ref={editorRef}
                value={typeof current === 'string' ? current : ''}
                language={(meta['language'] as string) ?? 'typescript'}
                theme={(meta['theme'] as string) ?? 'vs-dark'}
                height={(meta['height'] as string | number) ?? '100%'}
                showSaveButton={false}
                aiProvider={aiProvider}
                aiSettings={aiSettings}
                onSettingsChange={handleSettingsChange}
                onContentChange={(nextContent) => onChange({ set: { [bind]: nextContent } })}
            />
        </div>
    );
}
