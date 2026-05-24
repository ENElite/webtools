import { Slider } from 'antd';
import type { EditorProps } from '../registry';

export default function SliderEditor({ item, value, onChange }: EditorProps) {
    const bind = item.bind as string;
    const current = value;
    const meta = item.meta ?? {};

    return (
        <div className='flex items-center gap-3'>
            <Slider
                className='flex-1'
                min={meta['min'] as number | undefined}
                max={meta['max'] as number | undefined}
                step={(meta['step'] as number) ?? 1}
                value={typeof current === 'number' ? current : (meta['min'] as number) ?? 0}
                onChange={(next) => {
                    const safeNumber = typeof next === 'number' ? next : next[0] ?? (meta['min'] as number) ?? 0;
                    onChange({ set: { [bind]: safeNumber } });
                }}
            />
            <span className='min-w-14 text-right text-sm text-slate-500'>
                {typeof current === 'number' ? `${current}${(meta['suffix'] as string) ?? ''}` : ''}
            </span>
        </div>
    );
}
