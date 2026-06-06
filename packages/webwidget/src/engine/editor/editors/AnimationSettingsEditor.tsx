/**
 * AnimationSettingsEditor — 动画设置编辑器
 *
 * 管理 framer-motion 处理的属性过渡动画配置：
 * - 过渡效果：缓动曲线、时长、延迟
 * - 过渡属性：选择需要动画的 CSS 属性
 */

import { useCallback, useMemo } from 'react';
import { Select, Slider, Tag } from 'antd';
import type { EditorProps } from '../registry';
import type { WidgetAnimationSettings } from '../../model';

// ─── 支持动画的 CSS 属性 ──────────────────────────────────────────────────────

const ANIMATABLE_PROPERTIES = [
    { key: 'opacity', label: '透明度' },
    { key: 'backgroundColor', label: '背景色' },
    { key: 'borderRadius', label: '圆角' },
    { key: 'outline', label: '边框' },
    { key: 'outlineOffset', label: '边框偏移' },
    { key: 'boxShadow', label: '阴影' },
    { key: 'backdropFilter', label: '模糊' },
    { key: 'backgroundImage', label: '背景图' },
];

// ─── 缓动选项 ─────────────────────────────────────────────────────────────────

const EASING_OPTIONS = [
    { label: '缓出 (ease-out)', value: 'ease-out' },
    { label: '缓入 (ease-in)', value: 'ease-in' },
    { label: '缓入缓出 (ease-in-out)', value: 'ease-in-out' },
    { label: '线性 (linear)', value: 'linear' },
];

// ─── 默认值 ───────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: WidgetAnimationSettings = {
    easing: 'ease-out',
    duration: 0.3,
    delay: 0,
    animatedProperties: ['opacity', 'backgroundColor', 'borderRadius', 'outline', 'outlineOffset', 'boxShadow', 'backdropFilter', 'backgroundImage'],
};

// ─── 组件 ─────────────────────────────────────────────────────────────────────

export default function AnimationSettingsEditor({ item, value, onChange }: EditorProps) {
    const settings: WidgetAnimationSettings = useMemo(() => ({
        ...DEFAULT_SETTINGS,
        ...(value && typeof value === 'object' ? value : {}),
    }), [value]);

    const bindPath = item.bind as string;

    const updateField = useCallback((field: string, newValue: unknown) => {
        onChange({ set: { [`${bindPath}.${field}`]: newValue } as any });
    }, [onChange, bindPath]);

    const animatedProperties = useMemo(() =>
        settings.animatedProperties ?? DEFAULT_SETTINGS.animatedProperties!,
        [settings.animatedProperties],
    );

    const handlePropertyToggle = useCallback((propKey: string) => {
        const next = animatedProperties.includes(propKey)
            ? animatedProperties.filter(k => k !== propKey)
            : [...animatedProperties, propKey];
        updateField('animatedProperties', next);
    }, [animatedProperties, updateField]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
            {/* 缓动曲线 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 70, textAlign: 'right', fontSize: 12, color: '#666', flexShrink: 0 }}>缓动</span>
                <Select
                    value={settings.easing}
                    onChange={(v) => updateField('easing', v)}
                    options={EASING_OPTIONS}
                    size="small"
                    style={{ flex: 1 }}
                />
            </div>

            {/* 过渡时长 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 70, textAlign: 'right', fontSize: 12, color: '#666', flexShrink: 0 }}>时长</span>
                <div style={{ flex: 1 }}>
                    <Slider
                        value={settings.duration}
                        min={0.05}
                        max={3}
                        step={0.05}
                        onChange={(v) => updateField('duration', v)}
                        marks={{ 0.05: '0.05s', 0.3: '0.3s', 1: '1s', 3: '3s' }}
                    />
                </div>
            </div>

            {/* 过渡延迟 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 70, textAlign: 'right', fontSize: 12, color: '#666', flexShrink: 0 }}>延迟</span>
                <div style={{ flex: 1 }}>
                    <Slider
                        value={settings.delay}
                        min={0}
                        max={5}
                        step={0.1}
                        onChange={(v) => updateField('delay', v)}
                        marks={{ 0: '0s', 1: '1s', 3: '3s', 5: '5s' }}
                    />
                </div>
            </div>

            {/* 过渡属性 */}
            <div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>过渡属性</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {ANIMATABLE_PROPERTIES.map(prop => {
                        const isActive = animatedProperties.includes(prop.key);
                        return (
                            <Tag
                                key={prop.key}
                                color={isActive ? 'blue' : undefined}
                                style={{ cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => handlePropertyToggle(prop.key)}
                            >
                                {prop.label}
                            </Tag>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
