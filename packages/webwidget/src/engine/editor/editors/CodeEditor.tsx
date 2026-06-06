import { AiEditorPanel } from '../../../components/editor';
import type { EditorProps } from '../registry';

export default function CodeEditor({ item, value, onChange }: EditorProps) {
    const bind = item.bind as string;
    const current = value ?? '';
    const meta = item.meta ?? {};

    return (
        <div className='w-full min-h-105 overflow-hidden rounded border border-slate-300/60'>
            <AiEditorPanel
                value={typeof current === 'string' ? current : ''}
                language={(meta['language'] as string) ?? 'html'}
                height={(meta['height'] as string | number) ?? '100%'}
                chat={(meta['chat'] as boolean) ?? true}
                onChange={(nextContent) => onChange({ set: { [bind]: nextContent } })}
            />
        </div>
    );
}
