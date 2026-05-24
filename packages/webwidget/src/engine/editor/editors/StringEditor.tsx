import { Input } from 'antd';
import type { EditorProps } from '../registry';

export default function StringEditor({ item, value, onChange }: EditorProps) {
    const bind = item.bind as string;
    const current = value ?? '';
    const placeholder = item.meta?.['placeholder'] as string | undefined;
    const readOnly = item.meta?.['readOnly'] as boolean | undefined;

    if (readOnly) {
        return <Input value={typeof current === 'string' ? current : ''} readOnly disabled />;
    }

    return (
        <Input.TextArea
            value={typeof current === 'string' ? current : ''}
            placeholder={placeholder}
            autoSize={{ minRows: 1 }}
            onChange={(event) => onChange({ set: { [bind]: event.target.value } })}
        />
    );
}
