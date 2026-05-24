import { useRef, useState } from 'react';
import { Button, Input } from 'antd';
import type { EditorProps } from '../registry';

export default function ImageEditor({ item, value, onChange }: EditorProps) {
    const bind = item.bind as string;
    const current = value ?? '';
    const placeholder = item.meta?.['placeholder'] as string | undefined;
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const readImageAsDataUrl = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                onChange({ set: { [bind]: reader.result } });
            }
        };
        reader.readAsDataURL(file);
    };

    const handleImageFile = (file: File | null) => {
        if (!file || !file.type.startsWith('image/')) return;
        readImageAsDataUrl(file);
    };

    const inputId = `${item.key}-image-input`;

    return (
        <div className='flex flex-col gap-2'>
            <Input
                value={typeof current === 'string' ? current : ''}
                placeholder={placeholder}
                onChange={(event) => onChange({ set: { [bind]: event.target.value } })}
            />

            <input
                id={inputId}
                ref={inputRef}
                type='file'
                accept='image/*'
                className='hidden'
                onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    handleImageFile(file);
                    event.currentTarget.value = '';
                }}
            />

            <div
                className={`rounded border border-dashed p-3 text-sm ${dragging ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-400/60'}`}
                onDragEnter={(event) => {
                    event.preventDefault();
                    setDragging(true);
                }}
                onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    const file = event.dataTransfer.files?.[0] || null;
                    handleImageFile(file);
                }}
            >
                <div className='mb-2'>拖拽本地图片到这里，自动转换为 dataURL。</div>
                <Button
                    size='small'
                    htmlType='button'
                    onClick={() => inputRef.current?.click()}
                >
                    选择本地图片
                </Button>
            </div>
        </div>
    );
}
