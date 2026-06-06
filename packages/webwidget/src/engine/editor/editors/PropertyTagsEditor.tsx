/**
 * PropertyTagsEditor — 可勾选的属性标签列表
 *
 * 用于动画设置中的"过渡属性"选择。
 * 值为 string[]，每个 tag 可点击切换选中状态。
 */

import { useMemo } from 'react';
import { Tag } from 'antd';
import type { EditorProps } from '../registry';

type PropertyOption = {
    key: string;
    label: string;
};

const DEFAULT_OPTIONS: PropertyOption[] = [
    { key: 'opacity', label: '透明度' },
    { key: 'backgroundColor', label: '背景色' },
    { key: 'borderRadius', label: '圆角' },
    { key: 'outline', label: '边框' },
    { key: 'outlineOffset', label: '边框偏移' },
    { key: 'boxShadow', label: '阴影' },
    { key: 'backdropFilter', label: '模糊' },
    { key: 'backgroundImage', label: '背景图' },
];

export default function PropertyTagsEditor({ item, value, onChange }: EditorProps) {
    const bind = item.bind as string;

    const options: PropertyOption[] = useMemo(() =>
        (item.meta?.['options'] as PropertyOption[]) ?? DEFAULT_OPTIONS,
        [item.meta],
    );

    // 默认全选（value 未设置时）
    const current: string[] = useMemo(() =>
        Array.isArray(value) ? value : options.map(o => o.key),
        [value, options],
    );

    const handleToggle = (propKey: string) => {
        const next = current.includes(propKey)
            ? current.filter(k => k !== propKey)
            : [...current, propKey];
        onChange({ set: { [bind]: next } as any });
    };

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {options.map(opt => (
                <Tag
                    key={opt.key}
                    color={current.includes(opt.key) ? 'blue' : undefined}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleToggle(opt.key)}
                >
                    {opt.label}
                </Tag>
            ))}
        </div>
    );
}
