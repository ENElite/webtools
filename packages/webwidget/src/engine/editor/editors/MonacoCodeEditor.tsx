import { useRef } from 'react';
import { CodeEditor, type CodeEditorHandle } from '@webtools/shared';
import type { EditorProps } from '../registry';

export default function MonacoCodeEditor({ item, value, onChange }: EditorProps) {
    const bind = item.bind as string;
    const current = value ?? '';
    const meta = item.meta ?? {};
    const editorRef = useRef<CodeEditorHandle>(null);

    return (
        <div className='w-full min-h-105 overflow-hidden rounded border border-slate-300/60'>
            <CodeEditor
                ref={editorRef}
                value={typeof current === 'string' ? current : ''}
                language={(meta['language'] as string) ?? 'typescript'}
                theme={(meta['theme'] as string) ?? 'vs-dark'}
                height={(meta['height'] as string | number) ?? '100%'}
                showSaveButton={false}
                onContentChange={(nextContent) => onChange({ set: { [bind]: nextContent } })}
            />
        </div>
    );
}
