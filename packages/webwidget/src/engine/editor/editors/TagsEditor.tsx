import { useMemo, useState } from 'react';
import { Button, Input, Space, Tag } from 'antd';
import type { EditorProps } from '../registry';

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

export default function TagsEditor({ item, value, onChange }: EditorProps) {
    const bind = item.bind as string;
    const current = value ?? '';
    const splitter = (item.meta?.['splitter'] as string) ?? ',';
    const placeholder = item.meta?.['placeholder'] as string | undefined;

    let tags: string[] = [];
    if (typeof current === 'string') {
        tags = current
            .split(splitter)
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0);
    }

    return (
        <TagsInput
            value={tags}
            placeholder={placeholder}
            onChange={(nextValue) => onChange({ set: { [bind]: nextValue.join(splitter) } })}
        />
    );
}
