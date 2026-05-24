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
        <Card size='small' title='源码编辑器' className='w-full min-h-90' style={{ height }}>
            <Input.TextArea
                value={code}
                onChange={(event) => {
                    const nextContent = event.target.value;
                    setCode(nextContent);
                    onChange?.(nextContent);
                }}
                autoSize={false}
                className='w-full h-full min-h-80 font-mono'
                style={{ height: '100%' }}
                aria-label={`editor-${language}-${chat ? 'chat' : 'plain'}`}
            />
        </Card>
    );
}