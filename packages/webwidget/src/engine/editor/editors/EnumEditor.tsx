import { Radio } from 'antd';
import type { EditorProps } from '../registry';

export default function EnumEditor({ item, value, onChange }: EditorProps) {
    const bind = item.bind as string;
    const current = value;
    const options = (item.meta?.['options'] as Array<{ label: string; value: string | number }>) ?? [];

    return (
        <Radio.Group
            value={typeof current === 'string' || typeof current === 'number' ? current : undefined}
            options={options}
            onChange={(event) => onChange({ set: { [bind]: event.target.value } })}
            optionType='button'
            buttonStyle='solid'
        />
    );
}
