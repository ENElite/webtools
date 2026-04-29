import React, { useEffect, useRef, useState } from 'react';

import { Card } from 'antd';

import { AgentDialog } from './agent_dialog';
import { AutoEditor, type AutoEditorHandle } from './auto_editor';

export type AiEditorPanelProps = {
    value: string;
    language?: string;
    height?: string | number;
    onChange?: (content: string) => void;
};

export function AiEditorPanel({
    value,
    language = 'html',
    height = 420,
    onChange,
}: AiEditorPanelProps) {
    const editorRef = useRef<AutoEditorHandle | null>(null);
    const [code, setCode] = useState(value);

    useEffect(() => {
        setCode(value);
    }, [value]);

    return (
        <div style={{ width: '100%', height, minHeight: 360, display: 'flex', gap: 12 }}>
            <Card size='small' title='源码编辑器' style={{ flex: 1, minWidth: 0 }} styles={{ body: { padding: 0, height: '100%' } }}>
                <div style={{ height: '100%', minHeight: 320 }}>
                    <AutoEditor
                        ref={editorRef}
                        value={value}
                        language={language}
                        height='100%'
                        showSaveButton={false}
                        onContentChange={(nextContent) => {
                            setCode(nextContent);
                            onChange?.(nextContent);
                        }}
                    />
                </div>
            </Card>

            <div style={{ width: 360, minWidth: 320, maxWidth: 420, height: '100%', minHeight: 0 }}>
                <AgentDialog
                    editorRef={editorRef}
                    currentCode={code}
                    onCodeChange={setCode}
                />
            </div>
        </div>
    );
}