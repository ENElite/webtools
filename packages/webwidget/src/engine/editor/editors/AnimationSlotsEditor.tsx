import { useCallback, useMemo, useState } from 'react';
import { Button, Cascader, Popover, Form, Select, Slider, Switch, Tag } from 'antd';
import type { EditorProps } from '../registry';
import type { WidgetAnimationSlot, AnimationConfig, AnimationTriggerSource } from '../../model/animation';
import {
    ANIMATION_EFFECT_OPTIONS,
    MOTION_TYPE_OPTIONS,
    ANIMATION_DIRECTION_OPTIONS,
    ANIMATION_EASING_OPTIONS,
    DEFAULT_ANIMATION_CONFIG,
} from '../../model/animation';

type CascaderOption = {
    value: string;
    label: string;
    children?: CascaderOption[];
};

const SIGNAL_SOURCE_CASCADER_OPTIONS: CascaderOption[] = [
    {
        value: 'lifecycle',
        label: '生命周期',
        children: [
            { value: 'mount', label: '挂载时' },
            { value: 'unmount', label: '卸载时' },
        ],
    },
    {
        value: 'system',
        label: '系统',
        children: [
            { value: 'idle', label: '空闲' },
            { value: 'active', label: '活跃' },
        ],
    },
    {
        value: 'user',
        label: '交互',
        children: [
            { value: 'mouse.enter', label: '鼠标进入' },
            { value: 'mouse.leave', label: '鼠标离开' },
            { value: 'mouse.click', label: '鼠标点击' },
        ],
    },
    {
        value: 'widget',
        label: '组件',
        children: [
            { value: 'update', label: '属性更新' },
            { value: 'style.opacity', label: '透明度变化' },
            { value: 'style.backgroundColor', label: '背景色变化' },
            { value: 'style.backgroundEffect', label: '背景效果变化' },
            { value: 'style.backgroundImageUrl', label: '背景图片变化' },
            { value: 'style.outline', label: '边框变化' },
            { value: 'style.borderRadius', label: '圆角变化' },
            { value: 'style.shadowRadius', label: '阴影变化' },
            { value: 'style.shadowColor', label: '阴影颜色变化' },
        ],
    },
];

function triggerToCascadePath(trigger: { source: string; type: string }): string[] {
    return [trigger.source, trigger.type];
}

function cascadePathToTrigger(path: string[]): { source: AnimationTriggerSource; type: string } {
    return { source: (path[0] ?? 'lifecycle') as AnimationTriggerSource, type: path[1] ?? 'mount' };
}

function resolveSignalLabel(source: string, type: string): string {
    const sourceGroup = SIGNAL_SOURCE_CASCADER_OPTIONS.find((opt) => opt.value === source);
    if (!sourceGroup) return `${source}.${type}`;
    const typeOption = sourceGroup.children?.find((opt) => opt.value === type);
    if (!typeOption) return `${sourceGroup.label} > ${type}`;
    return `${sourceGroup.label} > ${typeOption.label}`;
}

function resolveMotionTypeLabel(motionType: string): string {
    const match = MOTION_TYPE_OPTIONS.find((opt) => opt.value === motionType);
    return match?.label ?? motionType;
}

function SlotEditor({
    slot,
    onChange,
    onDelete,
}: {
    slot: WidgetAnimationSlot;
    onChange: (next: WidgetAnimationSlot) => void;
    onDelete: () => void;
}) {
    const [open, setOpen] = useState(false);
    const cascadeValue = useMemo(() => triggerToCascadePath(slot.signal), [slot.signal]);

    const updateMotion = useCallback((patch: Partial<AnimationConfig>) => {
        onChange({
            ...slot,
            motion: { ...slot.motion, ...patch },
        });
    }, [slot, onChange]);

    const content = (
        <div style={{ width: 400, maxWidth: 'calc(100vw - 32px)' }}>
            <Form layout='horizontal' colon={false} style={{ width: '100%', gap: 6, flexDirection: 'column', alignItems: 'stretch' }}>
                <Form.Item label='触发信号' style={{ marginBottom: 0 }}>
                    <div onMouseDown={(e) => e.stopPropagation()}>
                        <Cascader
                            options={SIGNAL_SOURCE_CASCADER_OPTIONS}
                            value={cascadeValue}
                            onChange={(val) => {
                                if (val && val.length >= 2) {
                                    const trigger = cascadePathToTrigger(val as string[]);
                                    onChange({ ...slot, signal: trigger });
                                }
                            }}
                            style={{ width: '100%' }}
                            popupMatchSelectWidth={false}
                            popupStyle={{ minWidth: 200 }}
                        />
                    </div>
                </Form.Item>

                <Form.Item label='运动类型' style={{ marginBottom: 0 }}>
                    <Select
                        value={slot.motion.motionType}
                        options={[...MOTION_TYPE_OPTIONS]}
                        onChange={(val) => updateMotion({ motionType: val })}
                        style={{ width: '100%' }}
                        popupMatchSelectWidth
                    />
                </Form.Item>

                {slot.motion.motionType === 'tween' && (
                    <Form.Item label='缓动' style={{ marginBottom: 0 }}>
                        <Select
                            value={slot.motion.easing ?? 'ease-out'}
                            options={[...ANIMATION_EASING_OPTIONS]}
                            onChange={(val) => updateMotion({ easing: val })}
                            style={{ width: '100%' }}
                            popupMatchSelectWidth
                        />
                    </Form.Item>
                )}

                {slot.motion.motionType === 'transition' && (
                    <Form.Item label='动画效果' style={{ marginBottom: 0 }}>
                        <Select
                            value={slot.motion.effect}
                            options={[...ANIMATION_EFFECT_OPTIONS]}
                            onChange={(val) => updateMotion({ effect: val })}
                            style={{ width: '100%' }}
                            popupMatchSelectWidth
                        />
                    </Form.Item>
                )}

                {slot.motion.motionType === 'transition' && slot.motion.effect === 'slide' && (
                    <Form.Item label='方向' style={{ marginBottom: 0 }}>
                        <Select
                            value={slot.motion.direction ?? 'up'}
                            options={[...ANIMATION_DIRECTION_OPTIONS]}
                            onChange={(val) => updateMotion({ direction: val })}
                            style={{ width: '100%' }}
                            popupMatchSelectWidth
                        />
                    </Form.Item>
                )}

                <Form.Item label='时长' style={{ marginBottom: 0 }}>
                    <Slider
                        min={0.1}
                        max={5}
                        step={0.1}
                        value={slot.motion.duration}
                        onChange={(val) => updateMotion({ duration: val })}
                        marks={{ 0.1: '0.1s', 1: '1s', 3: '3s', 5: '5s' }}
                    />
                </Form.Item>

                <Form.Item label='延迟' style={{ marginBottom: 0 }}>
                    <Slider
                        min={0}
                        max={5}
                        step={0.1}
                        value={slot.motion.delay}
                        onChange={(val) => updateMotion({ delay: val })}
                        marks={{ 0: '0s', 1: '1s', 3: '3s', 5: '5s' }}
                    />
                </Form.Item>

                <Form.Item label='循环' style={{ marginBottom: 0 }}>
                    <Switch
                        checked={slot.motion.loop}
                        onChange={(val) => updateMotion({ loop: val })}
                    />
                </Form.Item>

                <Form.Item label='强度' style={{ marginBottom: 0 }}>
                    <Slider
                        min={0}
                        max={1}
                        step={0.05}
                        value={slot.motion.intensity}
                        onChange={(val) => updateMotion({ intensity: val })}
                        marks={{ 0: '0', 0.5: '0.5', 1: '1' }}
                    />
                </Form.Item>
            </Form>
        </div>
    );

    return (
        <Popover
            trigger='click'
            placement='bottomLeft'
            open={open}
            onOpenChange={(nextOpen) => {
                // Don't close if clicking inside the Cascader popup
                if (!nextOpen) {
                    const active = document.activeElement;
                    if (active && active.closest('.ant-cascader-menu')) {
                        return;
                    }
                }
                setOpen(nextOpen);
            }}
            content={content}
            destroyOnHidden
        >
            <Tag
                closable
                onClose={(e) => {
                    e.preventDefault();
                    onDelete();
                }}
                style={{ cursor: 'pointer' }}
            >
                {resolveSignalLabel(slot.signal.source, slot.signal.type)} - {resolveMotionTypeLabel(slot.motion.motionType)}
            </Tag>
        </Popover>
    );
}

export default function AnimationSlotsEditor({ item, value, onChange }: EditorProps) {
    const slots: WidgetAnimationSlot[] = Array.isArray(value) ? value : [];
    const [popoverOpen, setPopoverOpen] = useState(false);

    const bindPath = item.bind as string;

    const handleAdd = useCallback(() => {
        const newSlot: WidgetAnimationSlot = {
            signal: { source: 'system', type: 'idle' },
            motion: { ...DEFAULT_ANIMATION_CONFIG },
        };
        const nextSlots = [...slots, newSlot];
        onChange({ set: { [bindPath]: nextSlots } as any });
        setPopoverOpen(true);
    }, [slots, onChange, bindPath]);

    const handleUpdate = useCallback((index: number, nextSlot: WidgetAnimationSlot) => {
        const nextSlots = slots.map((s, i) => (i === index ? nextSlot : s));
        onChange({ set: { [bindPath]: nextSlots } as any });
    }, [slots, onChange, bindPath]);

    const handleDelete = useCallback((index: number) => {
        const nextSlots = slots.filter((_, i) => i !== index);
        onChange({ set: { [bindPath]: nextSlots } as any });
    }, [slots, onChange, bindPath]);

    return (
        <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            alignItems: 'center',
            padding: 4,
        }}>
            {slots.map((slot, index) => (
                <SlotEditor
                    key={index}
                    slot={slot}
                    onChange={(next) => handleUpdate(index, next)}
                    onDelete={() => handleDelete(index)}
                />
            ))}
            <Button
                type='dashed'
                size='small'
                onClick={handleAdd}
            >
                + 添加动画
            </Button>
        </div>
    );
}
