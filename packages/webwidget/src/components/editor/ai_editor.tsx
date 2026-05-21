import React, { useEffect, useState } from 'react';

import { Card, Input } from 'antd';

export type AiEditorPanelProps = {
    value: string;
    language?: string;
    height?: string | number;
    chat?: boolean;
    onChange?: (content: string) => void;
};

export function AiEditorPanel({
    value,
    language = 'html',
    height = 420,
    chat = true,
    onChange,
}: AiEditorPanelProps) {
    const [code, setCode] = useState(value);

    useEffect(() => {
        setCode(value);
    }, [value]);

    return (
        <Card size='small' title='源码编辑器' style={{ width: '100%', height, minHeight: 360 }}>
            <Input.TextArea
                value={code}
                onChange={(event) => {
                    const nextContent = event.target.value;
                    setCode(nextContent);
                    onChange?.(nextContent);
                }}
                autoSize={false}
                style={{ width: '100%', height: '100%', minHeight: 320, fontFamily: 'monospace' }}
                aria-label={`editor-${language}-${chat ? 'chat' : 'plain'}`}
            />
        </Card>
    );
}