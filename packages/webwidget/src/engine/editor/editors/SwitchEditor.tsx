import { Switch } from 'antd';
import type { EditorProps } from '../registry';

export default function SwitchEditor({ item, value, onChange }: EditorProps) {
    const bind = item.bind as string;
    const current = value ?? false;

    return (
        <Switch
            checked={!!current}
            onChange={(checked) => onChange({ set: { [bind]: checked } })}
        />
    );
}
