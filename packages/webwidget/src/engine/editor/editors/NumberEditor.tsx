import { InputNumber } from 'antd';
import type { EditorProps } from '../registry';

export default function NumberEditor({ item, value, onChange }: EditorProps) {
    const bind = item.bind as string;
    const current = value;
    const meta = item.meta ?? {};

    return (
        <InputNumber
            className='w-full max-w-50'
            mode='spinner'
            min={meta['min'] as number | undefined}
            max={meta['max'] as number | undefined}
            step={(meta['step'] as number) ?? 1}
            suffix={meta['suffix'] as string | undefined}
            value={typeof current === 'number' ? current : 0}
            onChange={(next) => {
                const safeNumber = typeof next === 'number' ? next : 0;
                if (typeof meta['modulo'] === 'number' && meta['modulo'] > 0) {
                    const normalized = ((safeNumber % meta['modulo']) + meta['modulo']) % meta['modulo'];
                    onChange({ set: { [bind]: normalized } });
                    return;
                }
                onChange({ set: { [bind]: safeNumber } });
            }}
        />
    );
}
