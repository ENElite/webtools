import { useCallback, useMemo, useRef, useState } from 'react';
import { Modal } from 'antd';
import { CodeEditor, type CodeEditorHandle } from '@webtools/shared';
import type { EditorProps } from '../registry';

type CodePickerProps = EditorProps;

export default function CodePicker({ item, value, onChange }: CodePickerProps) {
    const bind = item.bind as string;
    const meta = item.meta ?? {};
    const current = typeof value === 'string' ? value : '';
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(current);
    const editorRef = useRef<CodeEditorHandle>(null);

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
    }, []);

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
                onOk={handleOk}
                onCancel={handleCancel}
                width='80vw'
                style={{ top: 20 }}
                styles={{ body: { height: 'calc(80vh - 100px)', padding: 0, overflow: 'hidden' } }}
                destroyOnHidden
                okText='保存'
                cancelText='取消'
            >
                <div className='h-full w-full'>
                    <CodeEditor
                        ref={editorRef}
                        value={draft}
                        language={language}
                        theme={(meta['theme'] as string) ?? 'vs-dark'}
                        height='100%'
                        showSaveButton={false}
                        onContentChange={setDraft}
                    />
                </div>
            </Modal>
        </>
    );
}
