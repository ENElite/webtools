import { ColorPicker } from 'antd';
import type { EditorProps } from '../registry';

export default function ColorEditor({ item, value, onChange }: EditorProps) {
    const bind = item.bind as string;
    const current = value;
    const alpha = item.meta?.['alpha'] as boolean | undefined;

    return (
        <ColorPicker
            value={typeof current === 'string' ? current : '#000000'}
            disabledAlpha={!alpha}
            onChangeComplete={(next) => onChange({ set: { [bind]: alpha ? next.toCssString() : next.toHexString() } })}
            showText
        />
    );
}
