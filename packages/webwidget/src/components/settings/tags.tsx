import React, { useMemo, useState } from 'react';

import { Button, Input, Space, Tag } from 'antd';

export type TagsInputProps = {
    value?: string[];
    onChange: (next: string[]) => void;
    label?: string;
    placeholder?: string;
    addButtonText?: string;
    inputWidth?: number;
    maxTags?: number;
};

function normalizeTagInput(input: string): string {
    return input.replace(/\s+/g, ' ').trim();
}

export function TagsInput({
    value = [],
    onChange,
    placeholder = '新增 tag',
    addButtonText = '添加',
    inputWidth = 150,
    maxTags,
}: TagsInputProps) {
    const [draftTag, setDraftTag] = useState('');

    const tags = useMemo(() => {
        return value
            .map((tag) => normalizeTagInput(tag))
            .filter((tag) => tag.length > 0);
    }, [value]);

    const appendTag = (rawTag: string) => {
        const nextTag = normalizeTagInput(rawTag);
        if (nextTag.length === 0) {
            return;
        }

        if (typeof maxTags === 'number' && tags.length >= maxTags) {
            return;
        }

        if (tags.includes(nextTag)) {
            setDraftTag('');
            return;
        }

        onChange([...tags, nextTag]);
        setDraftTag('');
    };

    const removeTagAt = (index: number) => {
        onChange(tags.filter((_, currentIndex) => currentIndex !== index));
    };

    return (
        <div className='grid grid-cols-1 items-start gap-3 md:grid-cols-[110px_1fr_auto]'>
            <Space size={[8, 8]}>
                {tags.map((tag, index) => (
                    <Tag
                        key={`${tag}-${index}`}
                        closable
                        onClose={(event) => {
                            event.preventDefault();
                            removeTagAt(index);
                        }}
                    >
                        {tag}
                    </Tag>
                ))}
                <Input
                    value={draftTag}
                    onChange={(event) => {
                        const next = event.target.value;
                        setDraftTag(normalizeTagInput(next));
                    }}
                    onPressEnter={(event) => {
                        event.preventDefault();
                        appendTag(draftTag);
                    }}
                    placeholder={placeholder}
                    style={{ width: inputWidth }}
                />
                <Button onClick={() => appendTag(draftTag)}>{addButtonText}</Button>
            </Space>
            <span />
        </div>
    );
}
